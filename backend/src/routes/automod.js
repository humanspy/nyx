import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// GET /api/automod/:serverId
router.get('/:serverId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM automod_config WHERE server_id = $1',
    [req.params.serverId]
  );
  res.json(rows[0] || { enabled: false, blocked_words: [], block_invites: false, block_links: false, exempt_role_ids: [] });
});

// PUT /api/automod/:serverId — upsert automod config (requires MANAGE_SERVER or ADMINISTRATOR)
router.put('/:serverId', async (req, res) => {
  const { enabled, blockedWords, blockInvites, blockLinks, exemptRoleIds } = req.body;
  const { serverId } = req.params;

  // Permission check — must be server manager or admin
  const { rows: memberRows } = await pool.query(`
    SELECT sm.*, COALESCE(json_agg(r.permissions) FILTER (WHERE r.id IS NOT NULL), '[]') AS role_permissions
    FROM server_members sm
    LEFT JOIN unnest(sm.role_ids) AS rid ON true
    LEFT JOIN roles r ON r.id = rid
    WHERE sm.server_id = $1 AND sm.user_id = $2
    GROUP BY sm.server_id, sm.user_id
  `, [serverId, req.user.id]);

  const { rows: serverRows } = await pool.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
  if (!serverRows[0]) return res.status(404).json({ error: 'Server not found' });

  const isOwner = serverRows[0].owner_id === req.user.id;
  const hasManage = isOwner || memberRows[0]?.role_permissions?.some(p => p?.ADMINISTRATOR || p?.MANAGE_SERVER);
  if (!hasManage) return res.status(403).json({ error: 'Missing MANAGE_SERVER permission' });

  const { rows } = await pool.query(`
    INSERT INTO automod_config (server_id, enabled, blocked_words, block_invites, block_links, exempt_role_ids, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (server_id) DO UPDATE SET
      enabled = EXCLUDED.enabled,
      blocked_words = EXCLUDED.blocked_words,
      block_invites = EXCLUDED.block_invites,
      block_links = EXCLUDED.block_links,
      exempt_role_ids = EXCLUDED.exempt_role_ids,
      updated_at = NOW()
    RETURNING *
  `, [serverId, enabled ?? false, blockedWords || [], blockInvites ?? false, blockLinks ?? false, exemptRoleIds || []]);

  res.json(rows[0]);
});

export default router;
