import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/mutes — get all mutes for current user
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM user_mutes WHERE user_id = $1', [req.user.id]);
  res.json(rows);
});

// POST /api/mutes — mute a channel, server, or category
router.post('/', async (req, res) => {
  const { muteType, targetId } = req.body;
  if (!['channel', 'server', 'category'].includes(muteType)) return res.status(400).json({ error: 'Invalid muteType' });
  if (!targetId) return res.status(400).json({ error: 'targetId required' });
  const { rows } = await pool.query(`
    INSERT INTO user_mutes (user_id, mute_type, target_id)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id, mute_type, target_id) DO NOTHING
    RETURNING *
  `, [req.user.id, muteType, targetId]);
  res.json(rows[0] || { already_muted: true });
});

// DELETE /api/mutes/:targetId?type=channel
router.delete('/:targetId', async (req, res) => {
  const { type } = req.query;
  await pool.query(
    'DELETE FROM user_mutes WHERE user_id = $1 AND target_id = $2 AND mute_type = $3',
    [req.user.id, req.params.targetId, type]
  );
  res.json({ ok: true });
});

export default router;
