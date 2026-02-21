/**
 * Compatibility routes for Discord-Frontend
 * Maps Discord-Frontend API expectations to the nyx backend data model.
 */
import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/auth/getUser — returns current user in Discord-Frontend format
// ---------------------------------------------------------------------------
router.get('/auth/getUser', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.username, u.display_name, u.email, u.avatar_url, u.created_at,
        COALESCE(us.status, 'Online') AS status
       FROM users u LEFT JOIN user_settings us ON us.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    res.json({
      id: u.id,
      email: u.email || '',
      nickname: u.display_name || u.username,
      username: u.username,
      avatar_url: u.avatar_url,
      status: u.status,
      join_date: u.created_at,
    });
  } catch (err) {
    console.error('[compat] getUser:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/friend/online-list — online accepted friends
// ---------------------------------------------------------------------------
router.get('/friend/online-list', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END AS friend_id,
        u.username, u.display_name, u.avatar_url,
        COALESCE(us.status, 'Offline') AS status
      FROM friendships f
      JOIN users u ON u.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
      LEFT JOIN user_settings us ON us.user_id = u.id
      WHERE (f.requester_id = $1 OR f.addressee_id = $1)
        AND f.status = 'accepted'
        AND LOWER(COALESCE(us.status, 'offline')) = 'online'
    `, [req.user.id]);
    res.json(rows.map(r => ({
      id: r.friend_id,
      username: r.username,
      nickname: r.display_name || r.username,
      avatar_url: r.avatar_url,
      status: r.status,
    })));
  } catch (err) {
    console.error('[compat] online-list:', err);
    res.status(500).json({ error: 'Failed to fetch online friends' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/friend/add — add friend by username
// Returns 201 on success, 401 when already requested (matches frontend expectations)
// ---------------------------------------------------------------------------
router.post('/friend/add', requireAuth, async (req, res) => {
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
      if (existing.requester_id === req.user.id) return res.status(401).json({ error: 'Request already sent' });
      // They sent us a request — auto-accept
      await pool.query(
        'UPDATE friendships SET status=$1, updated_at=NOW() WHERE requester_id=$2 AND addressee_id=$3',
        ['accepted', target.id, req.user.id]
      );
      return res.status(201).json({ status: 'accepted', user: target });
    }

    await pool.query(
      'INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2)',
      [req.user.id, target.id]
    );
    res.status(201).json({ status: 'pending', user: target });
  } catch (err) {
    console.error('[compat] friend/add:', err);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/friend/pending/:id — accept or decline a friend request
// Body: { action: 'accept' | 'decline' }  (defaults to accept)
// ---------------------------------------------------------------------------
router.post('/friend/pending/:id', requireAuth, async (req, res) => {
  const { action } = req.body;
  try {
    if (!action || action === 'accept') {
      const { rows: [f] } = await pool.query(
        "SELECT * FROM friendships WHERE requester_id=$1 AND addressee_id=$2 AND status='pending'",
        [req.params.id, req.user.id]
      );
      if (!f) return res.status(404).json({ error: 'Friend request not found' });
      await pool.query(
        'UPDATE friendships SET status=$1, updated_at=NOW() WHERE requester_id=$2 AND addressee_id=$3',
        ['accepted', req.params.id, req.user.id]
      );
    } else {
      await pool.query(
        'DELETE FROM friendships WHERE (requester_id=$1 AND addressee_id=$2) OR (requester_id=$2 AND addressee_id=$1)',
        [req.user.id, req.params.id]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[compat] friend/pending:', err);
    res.status(500).json({ error: 'Failed to process friend request' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/getRoomList — DM channels for current user
// Returns [{ _id, roomName: 'DM_user1_user2', users, updatedAt }]
// ---------------------------------------------------------------------------
router.get('/chat/getRoomList', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.id, c.updated_at,
        json_agg(jsonb_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url)) AS participants
      FROM channels c
      JOIN channel_members cm  ON cm.channel_id = c.id AND cm.user_id  = $1
      JOIN channel_members cm2 ON cm2.channel_id = c.id
      JOIN users u ON u.id = cm2.user_id
      WHERE c.is_dm = true AND c.type = 'dm'
      GROUP BY c.id
      ORDER BY c.updated_at DESC
    `, [req.user.id]);

    const rooms = rows.map(r => {
      const usernames = r.participants.map(p => p.username);
      return {
        _id: r.id,
        roomName: `DM_${usernames[0]}_${usernames[1] || 'unknown'}`,
        users: usernames,
        updatedAt: r.updated_at,
      };
    });
    res.json(rooms);
  } catch (err) {
    console.error('[compat] getRoomList:', err);
    res.status(500).json({ error: 'Failed to fetch room list' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/chat/getRoomHistory/:roomId — last 50 messages for a DM channel
// Returns [{ messages: [{ senderId, content, createdAt, continued }] }]
// ---------------------------------------------------------------------------
router.get('/chat/getRoomHistory/:roomId', requireAuth, async (req, res) => {
  const { roomId } = req.params;
  try {
    // Verify membership
    const { rows: memberRows } = await pool.query(
      'SELECT 1 FROM channel_members WHERE channel_id=$1 AND user_id=$2',
      [roomId, req.user.id]
    );
    if (!memberRows[0]) return res.status(403).json({ error: 'Access denied' });

    const { rows } = await pool.query(`
      SELECT m.encrypted_payload, m.message_type, m.created_at, u.username
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.channel_id = $1 AND (m.deleted IS NULL OR m.deleted = false)
      ORDER BY m.created_at ASC LIMIT 50
    `, [roomId]);

    const messages = rows.map(r => ({
      senderId: r.username,
      content: r.encrypted_payload || '',
      createdAt: r.created_at,
      continued: r.message_type === 'dm_continued',
    }));

    res.json([{ messages, _id: roomId }]);
  } catch (err) {
    console.error('[compat] getRoomHistory:', err);
    res.status(500).json({ error: 'Failed to fetch room history' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/captcha/verify — verify hCaptcha token
// Returns 201 + true on success
// ---------------------------------------------------------------------------
router.post('/captcha/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });

  try {
    const secretKey = process.env.HCAPTCHA_SECRET_KEY || '0x0000000000000000000000000000000000000000';
    const params = new URLSearchParams({ response: token, secret: secretKey });
    const response = await fetch('https://hcaptcha.com/siteverify', {
      method: 'POST',
      body: params,
    });
    const data = await response.json();
    if (data.success) {
      return res.status(201).json(true);
    }
    res.status(400).json({ error: 'Captcha verification failed' });
  } catch (err) {
    console.error('[compat] captcha/verify:', err);
    res.status(500).json({ error: 'Failed to verify captcha' });
  }
});

export default router;
