/**
 * Platform admin routes — only accessible if the requester's email or username
 * matches PLATFORM_OWNER_EMAIL or PLATFORM_OWNER_USERNAME env var.
 *
 * Add to Railway env:
 *   PLATFORM_OWNER_EMAIL=you@example.com
 *   PLATFORM_OWNER_USERNAME=yourUsername
 */
import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../config/email.js';
import { platformBanTemplate } from '../utils/emailTemplates.js';

const router = Router();
router.use(requireAuth);

async function requireOwner(req, res, next) {
  const { rows } = await pool.query('SELECT username, email FROM users WHERE id = $1', [req.user.id]);
  const u = rows[0];
  const ownerEmail = process.env.PLATFORM_OWNER_EMAIL;
  const ownerUsername = process.env.PLATFORM_OWNER_USERNAME;
  if (!u) return res.status(403).json({ error: 'Forbidden' });
  const isOwner =
    (ownerEmail && u.email?.toLowerCase() === ownerEmail.toLowerCase()) ||
    (ownerUsername && u.username.toLowerCase() === ownerUsername.toLowerCase());
  if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
  next();
}

// GET /api/admin/users — list all users with standing
router.get('/users', requireOwner, async (req, res) => {
  const { search, limit = 50, offset = 0 } = req.query;
  const q = search ? `%${search}%` : null;
  const { rows } = await pool.query(`
    SELECT u.id, u.username, u.email, u.created_at, u.email_verified_at,
      u.platform_banned_at, u.deletion_scheduled_at,
      s.status AS standing, s.strike_count,
      pb.reason AS ban_reason
    FROM users u
    LEFT JOIN account_standing s ON s.user_id = u.id
    LEFT JOIN platform_bans pb ON pb.user_id = u.id
    ${q ? 'WHERE u.username ILIKE $3 OR u.email ILIKE $3' : ''}
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2
  `, q ? [limit, offset, q] : [limit, offset]);
  res.json(rows);
});

// POST /api/admin/ban — platform-ban a user
router.post('/ban', requireOwner, async (req, res) => {
  const { userId, reason, expiresAt } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const { rows } = await pool.query('SELECT username, email FROM users WHERE id = $1', [userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO platform_bans (user_id, reason, banned_by, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET reason = EXCLUDED.reason, banned_by = EXCLUDED.banned_by, banned_at = NOW(), expires_at = EXCLUDED.expires_at`,
      [userId, reason || null, req.user.id, expiresAt || null]
    );
    await client.query('UPDATE users SET platform_banned_at = NOW() WHERE id = $1', [userId]);
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('COMMIT');

    // Notify user by email (non-blocking)
    if (rows[0].email) {
      const tmpl = platformBanTemplate({ username: rows[0].username, reason });
      sendEmail({ to: rows[0].email, ...tmpl }).catch(console.error);
    }
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/admin/unban
router.post('/unban', requireOwner, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'userId required' });
  await pool.query('DELETE FROM platform_bans WHERE user_id = $1', [userId]);
  await pool.query('UPDATE users SET platform_banned_at = NULL WHERE id = $1', [userId]);
  res.json({ ok: true });
});

// GET /api/admin/reports — all open reports
router.get('/reports', requireOwner, async (req, res) => {
  const { status = 'open', limit = 50, offset = 0 } = req.query;
  const { rows } = await pool.query(`
    SELECT r.*,
      reporter.username AS reporter_username,
      target.username   AS target_username
    FROM reports r
    LEFT JOIN users reporter ON reporter.id = r.reporter_id
    LEFT JOIN users target   ON target.id   = r.target_user_id
    WHERE r.status = $1
    ORDER BY r.created_at DESC
    LIMIT $2 OFFSET $3
  `, [status, limit, offset]);
  res.json(rows);
});

// PATCH /api/admin/reports/:id
router.patch('/reports/:id', requireOwner, async (req, res) => {
  const { status } = req.body;
  const { rows } = await pool.query(
    'UPDATE reports SET status = $1, reviewed_by = $2, reviewed_at = NOW() WHERE id = $3 RETURNING *',
    [status, req.user.id, req.params.id]
  );
  res.json(rows[0]);
});

// PATCH /api/admin/standing/:userId
router.patch('/standing/:userId', requireOwner, async (req, res) => {
  const { status, notes } = req.body;
  const { rows } = await pool.query(`
    INSERT INTO account_standing (user_id, status, notes, updated_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (user_id) DO UPDATE SET status = EXCLUDED.status, notes = EXCLUDED.notes, updated_at = NOW()
    RETURNING *
  `, [req.params.userId, status, notes]);
  res.json(rows[0]);
});

export default router;
