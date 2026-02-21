import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/friends — list all friendships + pending requests
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        f.status, f.created_at, f.requester_id, f.addressee_id,
        CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
        CASE WHEN f.requester_id = $1 THEN 'outgoing' ELSE 'incoming' END AS direction,
        u.username, u.display_name, u.avatar_url, u.banner_url, u.pronouns,
        COALESCE(us.status, 'offline') AS presence
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
      LEFT JOIN user_settings us ON us.user_id = u.id
      WHERE (f.requester_id = $1 OR f.addressee_id = $1) AND f.status != 'blocked'
      ORDER BY f.status ASC, u.display_name ASC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /api/friends — send friend request by username
router.post('/', async (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) return res.status(400).json({ error: 'Username required' });

  try {
    const { rows: [target] } = await pool.query(
      'SELECT id, username, display_name, avatar_url FROM users WHERE username = $1 AND id != $2',
      [username.trim(), req.user.id]
    );
    if (!target) return res.status(404).json({ error: 'User not found' });

    const { rows: [existing] } = await pool.query(
      'SELECT * FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)',
      [req.user.id, target.id]
    );

    if (existing) {
      if (existing.status === 'accepted') return res.status(400).json({ error: 'Already friends' });
      if (existing.requester_id === req.user.id) return res.status(400).json({ error: 'Request already sent' });
      // They already sent us a request — auto-accept
      await pool.query(
        'UPDATE friendships SET status=$1, updated_at=NOW() WHERE requester_id=$2 AND addressee_id=$3',
        ['accepted', target.id, req.user.id]
      );
      return res.json({ status: 'accepted', user: target });
    }

    await pool.query(
      'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)',
      [req.user.id, target.id]
    );
    res.json({ status: 'pending', user: target });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// PUT /api/friends/:userId — accept incoming friend request
router.put('/:userId', async (req, res) => {
  try {
    const { rows: [f] } = await pool.query(
      "SELECT * FROM friendships WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'",
      [req.params.userId, req.user.id]
    );
    if (!f) return res.status(404).json({ error: 'Friend request not found' });
    await pool.query(
      'UPDATE friendships SET status=$1, updated_at=NOW() WHERE requester_id=$2 AND addressee_id=$3',
      ['accepted', req.params.userId, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept request' });
  }
});

// DELETE /api/friends/:userId — remove friend / cancel / reject request
router.delete('/:userId', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)',
      [req.user.id, req.params.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

export default router;
