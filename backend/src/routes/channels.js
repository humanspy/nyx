import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { hasPermission } from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

const VALID_TYPES = ['text', 'voice', 'video', 'forum', 'announcement', 'voice_text'];

// GET /channels?serverId=...
router.get('/', async (req, res) => {
  const { serverId } = req.query;
  if (!serverId) return res.status(400).json({ error: 'serverId required' });
  const { rows } = await pool.query(
    'SELECT * FROM channels WHERE server_id=$1 ORDER BY position ASC',
    [serverId]
  );
  res.json(rows);
});

// GET /channels/:channelId
router.get('/:channelId', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM channels WHERE id=$1', [req.params.channelId]);
  if (!rows[0]) return res.status(404).json({ error: 'Channel not found' });
  res.json(rows[0]);
});

// POST /channels — create channel in a server
router.post('/', async (req, res) => {
  const { serverId, name, type, categoryId, topic, position, bitrate, userLimit, pairedVoiceChannelId } = req.body;
  if (!serverId) return res.status(400).json({ error: 'serverId required' });
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid channel type' });
  if (!await hasPermission(serverId, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });

  const limit = Math.min(99, Math.max(0, Number(userLimit) || 0));

  const { rows } = await pool.query(`
    INSERT INTO channels (server_id, category_id, name, type, topic, position, bitrate, user_limit, paired_voice_channel_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *
  `, [serverId, categoryId||null, name||'new-channel', type, topic||null, position||0, bitrate||64000, limit, pairedVoiceChannelId||null]);
  res.status(201).json(rows[0]);
});

// PATCH /channels/:channelId
router.patch('/:channelId', async (req, res) => {
  const { rows: chanRows } = await pool.query('SELECT server_id FROM channels WHERE id=$1', [req.params.channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });
  if (!await hasPermission(chanRows[0].server_id, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });

  const { name, topic, position, categoryId, bitrate, userLimit, slowmodeSeconds } = req.body;
  const limit = userLimit !== undefined ? Math.min(99, Math.max(0, Number(userLimit))) : undefined;

  const { rows } = await pool.query(`
    UPDATE channels SET
      name=COALESCE($1,name), topic=COALESCE($2,topic), position=COALESCE($3,position),
      category_id=COALESCE($4,category_id), bitrate=COALESCE($5,bitrate),
      user_limit=COALESCE($6,user_limit), slowmode_seconds=COALESCE($7,slowmode_seconds),
      updated_at=NOW()
    WHERE id=$8 RETURNING *
  `, [name, topic, position, categoryId, bitrate, limit ?? null, slowmodeSeconds, req.params.channelId]);
  res.json(rows[0]);
});

// DELETE /channels/:channelId
router.delete('/:channelId', async (req, res) => {
  const { rows: chanRows } = await pool.query('SELECT server_id, protected FROM channels WHERE id=$1', [req.params.channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });
  if (chanRows[0].protected) return res.status(403).json({ error: 'This channel cannot be deleted' });
  if (!await hasPermission(chanRows[0].server_id, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  // Also delete paired voice-text channel if exists
  await pool.query('DELETE FROM channels WHERE paired_voice_channel_id=$1', [req.params.channelId]);
  await pool.query('DELETE FROM channels WHERE id=$1', [req.params.channelId]);
  res.json({ ok: true });
});

// POST /channels/dm
router.post('/dm', async (req, res) => {
  const { recipientId } = req.body;
  if (recipientId === req.user.id) return res.status(400).json({ error: 'Cannot DM yourself' });
  const { rows: existing } = await pool.query(`
    SELECT c.id FROM channels c
    JOIN channel_members cm1 ON cm1.channel_id=c.id AND cm1.user_id=$1
    JOIN channel_members cm2 ON cm2.channel_id=c.id AND cm2.user_id=$2
    WHERE c.type='dm' AND c.is_dm=true
  `, [req.user.id, recipientId]);
  if (existing[0]) return res.json({ channelId: existing[0].id });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("INSERT INTO channels (name,type,is_dm) VALUES ($1,'dm',true) RETURNING id", [`dm-${req.user.id}-${recipientId}`]);
    const channelId = rows[0].id;
    await client.query('INSERT INTO channel_members (channel_id,user_id) VALUES ($1,$2),($1,$3)', [channelId, req.user.id, recipientId]);
    await client.query('COMMIT');
    res.status(201).json({ channelId });
  } catch { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to create DM' }); }
  finally { client.release(); }
});

// POST /channels/group-dm
router.post('/group-dm', async (req, res) => {
  const { participantIds } = req.body;
  if (!Array.isArray(participantIds) || participantIds.length < 2 || participantIds.length > 19)
    return res.status(400).json({ error: 'Group DMs require 2-19 other participants (20 max total)' });
  const allIds = [req.user.id, ...participantIds.filter(id => id !== req.user.id)].slice(0, 20);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query("INSERT INTO channels (name,type,is_dm) VALUES ('Group DM','group_dm',true) RETURNING id");
    const channelId = rows[0].id;
    const vals = allIds.map((id, i) => `($1,$${i+2})`).join(',');
    await client.query(`INSERT INTO channel_members (channel_id,user_id) VALUES ${vals}`, [channelId, ...allIds]);
    await client.query('COMMIT');
    res.status(201).json({ channelId });
  } catch { await client.query('ROLLBACK'); res.status(500).json({ error: 'Failed to create group DM' }); }
  finally { client.release(); }
});

// Channel E2E key distribution
router.get('/:channelId/key', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ck.encrypted_key, ck.key_nonce, ck.key_version
    FROM channel_keys ck
    WHERE ck.channel_id=$1 AND ck.user_id=$2
    ORDER BY ck.key_version DESC LIMIT 1
  `, [req.params.channelId, req.user.id]);
  if (!rows[0]) return res.status(404).json({ key: null });
  res.json({ key: rows[0] });
});

router.post('/:channelId/key', async (req, res) => {
  const { userId, encryptedKey, nonce, keyVersion } = req.body;
  await pool.query(`
    INSERT INTO channel_keys (channel_id, user_id, distributor_id, encrypted_key, key_nonce, key_version)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (channel_id, user_id, key_version) DO UPDATE SET encrypted_key=EXCLUDED.encrypted_key, updated_at=NOW()
  `, [req.params.channelId, userId, req.user.id, encryptedKey, nonce, keyVersion||1]);
  res.json({ ok: true });
});

// Channel permission overrides
router.get('/:channelId/permissions', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT target_type, target_id, allow_bits, deny_bits FROM channel_permission_overrides WHERE channel_id=$1',
    [req.params.channelId]
  );
  res.json(rows);
});

router.put('/:channelId/permissions/:targetType/:targetId', async (req, res) => {
  const { channelId, targetType, targetId } = req.params;
  const { allow, deny } = req.body;
  if (!['role', 'member'].includes(targetType)) return res.status(400).json({ error: 'Invalid targetType' });
  const { rows: chanRows } = await pool.query('SELECT server_id FROM channels WHERE id=$1', [channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });
  if (!await hasPermission(chanRows[0].server_id, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query(`
    INSERT INTO channel_permission_overrides (channel_id, target_type, target_id, allow_bits, deny_bits)
    VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (channel_id, target_type, target_id) DO UPDATE SET allow_bits=$4, deny_bits=$5, updated_at=NOW()
  `, [channelId, targetType, targetId, BigInt(allow ?? 0), BigInt(deny ?? 0)]);
  res.json({ ok: true });
});

router.delete('/:channelId/permissions/:targetType/:targetId', async (req, res) => {
  const { channelId, targetType, targetId } = req.params;
  const { rows: chanRows } = await pool.query('SELECT server_id FROM channels WHERE id=$1', [channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });
  if (!await hasPermission(chanRows[0].server_id, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query('DELETE FROM channel_permission_overrides WHERE channel_id=$1 AND target_type=$2 AND target_id=$3', [channelId, targetType, targetId]);
  res.json({ ok: true });
});

// Forum threads
router.get('/:channelId/threads', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT ft.*, u.username, u.avatar_url FROM forum_threads ft
    JOIN users u ON u.id=ft.creator_id WHERE ft.channel_id=$1
    ORDER BY ft.pinned DESC, ft.last_message_at DESC
  `, [req.params.channelId]);
  res.json(rows);
});

router.post('/:channelId/threads', async (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Thread title required' });
  const { rows } = await pool.query(`
    INSERT INTO forum_threads (channel_id, creator_id, title_encrypted, title_iv)
    VALUES ($1,$2,$3,$4) RETURNING *
  `, [req.params.channelId, req.user.id, title.trim(), '']);
  res.status(201).json(rows[0]);
});

router.patch('/:channelId/threads/:threadId', async (req, res) => {
  const { closed, pinned } = req.body;
  const { rows } = await pool.query(`
    UPDATE forum_threads SET
      closed=COALESCE($1,closed), pinned=COALESCE($2,pinned), updated_at=NOW()
    WHERE id=$3 AND channel_id=$4 RETURNING *
  `, [closed, pinned, req.params.threadId, req.params.channelId]);
  if (!rows[0]) return res.status(404).json({ error: 'Thread not found' });
  res.json(rows[0]);
});

router.delete('/:channelId/threads/:threadId', async (req, res) => {
  await pool.query('DELETE FROM forum_threads WHERE id=$1 AND channel_id=$2', [req.params.threadId, req.params.channelId]);
  res.json({ ok: true });
});

export default router;
