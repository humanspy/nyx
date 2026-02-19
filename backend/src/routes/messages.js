import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { broadcast } from '../websocket/gateway.js';
import { hasPermission } from '../middleware/permissions.js';
import { grantXP } from '../moderation/xp.js';

const router = Router();
router.use(requireAuth);

router.get('/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const { before, after, limit = 50 } = req.query;
  const lim = Math.min(parseInt(limit) || 50, 100);

  const { rows: chanRows } = await pool.query('SELECT * FROM channels WHERE id=$1', [channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });

  let query = `
    SELECT m.id, m.channel_id, m.sender_id, m.encrypted_payload, m.iv, m.key_version,
      m.message_type, m.parent_id, m.thread_id, m.edited_at, m.deleted, m.deletion_proof,
      m.deletion_timestamp, m.attachment_metadata, m.mentions, m.created_at,
      u.username, u.display_name, u.avatar_url
    FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.channel_id=$1
  `;
  const params = [channelId];
  if (before) { params.push(before); query += ` AND m.created_at < (SELECT created_at FROM messages WHERE id=$${params.length})`; }
  if (after) { params.push(after); query += ` AND m.created_at > (SELECT created_at FROM messages WHERE id=$${params.length})`; }
  query += ` ORDER BY m.created_at DESC LIMIT ${lim}`;

  const { rows } = await pool.query(query, params);
  res.json(rows.reverse());
});

router.post('/:channelId', async (req, res) => {
  const { channelId } = req.params;
  const { encryptedPayload, iv, keyVersion, messageType, parentId, threadId, attachmentMetadata, mentions } = req.body;
  if (!encryptedPayload || !iv) return res.status(400).json({ error: 'Encrypted payload and IV required' });

  const { rows: chanRows } = await pool.query('SELECT * FROM channels WHERE id=$1', [channelId]);
  if (!chanRows[0]) return res.status(404).json({ error: 'Channel not found' });

  const { rows } = await pool.query(`
    INSERT INTO messages (channel_id, sender_id, encrypted_payload, iv, key_version, message_type, parent_id, thread_id, attachment_metadata, mentions)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id,channel_id,sender_id,encrypted_payload,iv,key_version,message_type,parent_id,thread_id,attachment_metadata,mentions,created_at
  `, [channelId, req.user.id, encryptedPayload, iv, keyVersion||1, messageType||'text', parentId||null, threadId||null,
      attachmentMetadata||null, JSON.stringify(mentions||[])]);

  const message = { ...rows[0], username: req.user.username, display_name: req.user.display_name, avatar_url: req.user.avatar_url };
  broadcast(channelId, { type: 'MESSAGE_CREATE', data: message });

  // Grant XP if server channel
  if (chanRows[0].server_id) {
    grantXP(chanRows[0].server_id, req.user.id, req.user.username).catch(() => {});
  }

  res.status(201).json(message);
});

router.patch('/:channelId/:messageId', async (req, res) => {
  const { channelId, messageId } = req.params;
  const { encryptedPayload, iv, keyVersion } = req.body;
  if (!encryptedPayload || !iv) return res.status(400).json({ error: 'Encrypted payload and IV required' });

  const { rows: msgRows } = await pool.query('SELECT * FROM messages WHERE id=$1 AND channel_id=$2', [messageId, channelId]);
  if (!msgRows[0]) return res.status(404).json({ error: 'Message not found' });
  if (msgRows[0].sender_id !== req.user.id) return res.status(403).json({ error: 'Cannot edit another user\'s message' });
  if (msgRows[0].deleted) return res.status(410).json({ error: 'Message has been deleted' });

  await pool.query(
    'INSERT INTO message_edit_history (message_id, encrypted_payload, iv, edited_at) VALUES ($1,$2,$3,NOW())',
    [messageId, msgRows[0].encrypted_payload, msgRows[0].iv]
  );

  const { rows } = await pool.query(`
    UPDATE messages SET encrypted_payload=$1, iv=$2, key_version=$3, edited_at=NOW(), updated_at=NOW()
    WHERE id=$4 RETURNING *
  `, [encryptedPayload, iv, keyVersion||msgRows[0].key_version, messageId]);

  broadcast(channelId, { type: 'MESSAGE_UPDATE', data: { id: messageId, channel_id: channelId, encryptedPayload, iv, keyVersion, editedAt: rows[0].edited_at } });
  res.json(rows[0]);
});

router.delete('/:channelId/:messageId', async (req, res) => {
  const { channelId, messageId } = req.params;
  const { deletionProof } = req.body;

  const { rows: msgRows } = await pool.query('SELECT * FROM messages WHERE id=$1 AND channel_id=$2', [messageId, channelId]);
  if (!msgRows[0]) return res.status(404).json({ error: 'Message not found' });

  const isOwn = msgRows[0].sender_id === req.user.id;
  if (!isOwn) {
    const { rows: chanRows } = await pool.query('SELECT server_id FROM channels WHERE id=$1', [channelId]);
    if (!chanRows[0]?.server_id) return res.status(403).json({ error: 'Cannot delete this message' });
    const perm = await hasPermission(chanRows[0].server_id, req.user.id, 'manage_messages');
    if (!perm) return res.status(403).json({ error: 'Cannot delete this message' });
  }

  const now = new Date().toISOString();
  await pool.query(`
    UPDATE messages SET encrypted_payload=NULL, iv=NULL, deleted=true,
      deletion_proof=$1, deletion_timestamp=$2, updated_at=NOW()
    WHERE id=$3
  `, [deletionProof||null, now, messageId]);

  broadcast(channelId, { type: 'MESSAGE_DELETE', data: { id: messageId, channelId, deletionProof, deletionTimestamp: now } });
  res.json({ ok: true, deletionTimestamp: now });
});

router.get('/:channelId/:messageId/history', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT encrypted_payload, iv, edited_at FROM message_edit_history WHERE message_id=$1 ORDER BY edited_at DESC',
    [req.params.messageId]
  );
  res.json(rows);
});

export default router;
