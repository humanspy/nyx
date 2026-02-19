import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { sendEmail } from '../config/email.js';
import {
  verifyEmailTemplate,
  passwordResetTemplate,
  welcomeTemplate,
} from '../utils/emailTemplates.js';

const router = Router();

function generateTokens(userId) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' });
  return { accessToken, refreshToken };
}

function validatePassword(password) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if ((password.match(/[a-zA-Z]/g) || []).length < 4) return 'Password must contain at least 4 letters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[^a-zA-Z0-9]/.test(password)) return 'Password must contain at least one symbol (e.g. ! @ # $)';
  return null;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, password, email, tosAccepted } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (!email) return res.status(400).json({ error: 'Email address is required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (username.length < 2 || username.length > 32) return res.status(400).json({ error: 'Username must be 2-32 characters' });
  if (!/^[a-zA-Z0-9._-]+$/.test(username)) return res.status(400).json({ error: 'Username contains invalid characters' });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  if (!tosAccepted) return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy to continue' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existingUser = await client.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows[0]) return res.status(409).json({ error: 'Username already taken' });
    const existingEmail = await client.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existingEmail.rows[0]) return res.status(409).json({ error: 'Email already in use' });

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      'INSERT INTO users (username, password_hash, email, tos_accepted_at) VALUES ($1, $2, $3, NOW()) RETURNING id, username, created_at',
      [username, passwordHash, email]
    );
    const user = rows[0];
    await client.query('INSERT INTO user_settings (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    await client.query('INSERT INTO account_standing (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);

    // Create email verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    await client.query(
      "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
      [user.id, verifyToken]
    );

    const { accessToken, refreshToken } = generateTokens(user.id);
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    await client.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
      [user.id, tokenHash]
    );
    await client.query('COMMIT');

    // Send emails (non-blocking)
    const tmpl = verifyEmailTemplate({ username, token: verifyToken });
    sendEmail({ to: email, ...tmpl }).catch(console.error);
    sendEmail({ to: email, ...welcomeTemplate({ username }) }).catch(console.error);

    res.status(201).json({ user: { id: user.id, username: user.username }, token: accessToken, refreshToken });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credentials required' });
  const { rows } = await pool.query('SELECT * FROM users WHERE username = $1 OR LOWER(email) = LOWER($1)', [username]);
  if (!rows[0]) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Platform ban check
  if (rows[0].platform_banned_at) {
    return res.status(403).json({ error: 'Your account has been suspended from NYX.' });
  }

  // Deleted account check
  if (rows[0].deletion_scheduled_at && new Date(rows[0].deletion_scheduled_at) <= new Date()) {
    return res.status(403).json({ error: 'This account has been deleted.' });
  }

  const { accessToken, refreshToken } = generateTokens(rows[0].id);
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
    [rows[0].id, tokenHash]
  );

  // Decide if we should prompt for email confirmation (every 30 days)
  const lastPrompt = rows[0].email_verify_prompted_at;
  const promptEmail = !rows[0].email_verified_at &&
    (!lastPrompt || (Date.now() - new Date(lastPrompt).getTime()) > 30 * 24 * 60 * 60 * 1000);

  if (promptEmail) {
    await pool.query('UPDATE users SET email_verify_prompted_at = NOW() WHERE id = $1', [rows[0].id]);
  }

  res.json({
    user: {
      id: rows[0].id,
      username: rows[0].username,
      avatar_url: rows[0].avatar_url,
      email_verified: !!rows[0].email_verified_at,
      deletion_scheduled_at: rows[0].deletion_scheduled_at || null,
    },
    token: accessToken,
    refreshToken,
    promptEmailVerification: promptEmail,
  });
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { rows } = await pool.query(
      'SELECT * FROM refresh_tokens WHERE user_id = $1 AND expires_at > NOW()',
      [payload.userId]
    );
    let valid = false;
    for (const row of rows) {
      if (await bcrypt.compare(refreshToken, row.token_hash)) { valid = true; break; }
    }
    if (!valid) return res.status(401).json({ error: 'Invalid refresh token' });
    const tokens = generateTokens(payload.userId);
    const tokenHash = await bcrypt.hash(tokens.refreshToken, 8);
    await pool.query(
      "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 days')",
      [payload.userId, tokenHash]
    );
    res.json(tokens);
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res) => {
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.username, u.display_name, u.avatar_url, u.banner_url, u.created_at,
      u.email_verified_at, u.deletion_scheduled_at, s.*
     FROM users u LEFT JOIN user_settings s ON s.user_id = u.id WHERE u.id = $1`,
    [req.user.id]
  );
  res.json(rows[0]);
});

// POST /api/auth/keys
router.post('/keys', requireAuth, async (req, res) => {
  const { x25519PublicKey, ed25519PublicKey } = req.body;
  if (!x25519PublicKey || !ed25519PublicKey) return res.status(400).json({ error: 'Both keys required' });
  await pool.query(
    'INSERT INTO user_keys (user_id, key_type, public_key) VALUES ($1, $2, $3) ON CONFLICT (user_id, key_type, key_version) DO UPDATE SET public_key = EXCLUDED.public_key',
    [req.user.id, 'x25519', x25519PublicKey]
  );
  await pool.query(
    'INSERT INTO user_keys (user_id, key_type, public_key) VALUES ($1, $2, $3) ON CONFLICT (user_id, key_type, key_version) DO UPDATE SET public_key = EXCLUDED.public_key',
    [req.user.id, 'ed25519', ed25519PublicKey]
  );
  res.json({ ok: true });
});

// GET /api/auth/verify-email?token=...
router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const { rows } = await pool.query(
    'SELECT * FROM email_verifications WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL',
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired verification link' });
  await pool.query('UPDATE users SET email_verified_at = NOW() WHERE id = $1', [rows[0].user_id]);
  await pool.query('UPDATE email_verifications SET used_at = NOW() WHERE id = $1', [rows[0].id]);
  res.json({ ok: true, message: 'Email verified successfully' });
});

// POST /api/auth/resend-verification
router.post('/resend-verification', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT username, email, email_verified_at FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  if (rows[0].email_verified_at) return res.status(400).json({ error: 'Email already verified' });

  await pool.query('DELETE FROM email_verifications WHERE user_id = $1', [req.user.id]);
  const verifyToken = crypto.randomBytes(32).toString('hex');
  await pool.query(
    "INSERT INTO email_verifications (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '24 hours')",
    [req.user.id, verifyToken]
  );
  const tmpl = verifyEmailTemplate({ username: rows[0].username, token: verifyToken });
  await sendEmail({ to: rows[0].email, ...tmpl });
  res.json({ ok: true });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const { rows } = await pool.query('SELECT id, username FROM users WHERE LOWER(email) = LOWER($1)', [email]);
  // Always respond OK to prevent email enumeration
  if (rows[0]) {
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [rows[0].id]);
    const resetToken = crypto.randomBytes(32).toString('hex');
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL '1 hour')",
      [rows[0].id, resetToken]
    );
    const tmpl = passwordResetTemplate({ username: rows[0].username, token: resetToken });
    sendEmail({ to: email, ...tmpl }).catch(console.error);
  }
  res.json({ ok: true, message: 'If an account with that email exists, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  const pwError = validatePassword(password);
  if (pwError) return res.status(400).json({ error: pwError });
  const { rows } = await pool.query(
    'SELECT * FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL',
    [token]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid or expired reset link' });
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, rows[0].user_id]);
  await pool.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [rows[0].id]);
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [rows[0].user_id]);
  res.json({ ok: true, message: 'Password updated. Please sign in again.' });
});

// POST /api/auth/change-password (authenticated)
router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'Both passwords required' });
  const pwError = validatePassword(newPassword);
  if (pwError) return res.status(400).json({ error: pwError });
  const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
  if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, req.user.id]);
  // Revoke all other sessions
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true, message: 'Password changed. Please sign in again.' });
});

export default router;
