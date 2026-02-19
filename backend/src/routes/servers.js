import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { requireServerMember, requireServerOwner, hasPermission } from '../middleware/permissions.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT s.id, s.name, s.icon_url, s.banner_url, s.vanity_url, s.member_count, s.owner_id, s.tag
    FROM servers s JOIN server_members sm ON sm.server_id = s.id
    WHERE sm.user_id = $1 ORDER BY sm.joined_at ASC
  `, [req.user.id]);
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { name, vanityUrl, tag, xpEnabled } = req.body;
  if (!name || name.length < 2 || name.length > 100) return res.status(400).json({ error: 'Server name must be 2-100 characters' });
  if (vanityUrl && vanityUrl.length < 3) return res.status(400).json({ error: 'Vanity URL must be at least 3 characters' });
  if (tag !== undefined && tag !== null && tag !== '') {
    if (!/^[A-Za-z]{2,5}$/.test(tag)) return res.status(400).json({ error: 'Tag must be 2-5 letters (A-Z only)' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'INSERT INTO servers (name, owner_id, vanity_url, tag, xp_enabled) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, req.user.id, vanityUrl || null, tag ? tag.toUpperCase() : null, xpEnabled !== false]
    );
    const server = rows[0];
    await client.query('INSERT INTO server_members (server_id, user_id) VALUES ($1, $2)', [server.id, req.user.id]);
    const { rows: roleRows } = await client.query(
      'INSERT INTO roles (server_id, name, is_default, position, permissions) VALUES ($1, $2, true, 0, $3) RETURNING id',
      [server.id, '@everyone', JSON.stringify({ send_messages: true, read_messages: true, connect: true, speak: true })]
    );
    await client.query('INSERT INTO member_roles (server_id, user_id, role_id) VALUES ($1, $2, $3)', [server.id, req.user.id, roleRows[0].id]);

    // ── Server template ────────────────────────────────────────────────────
    // Category: Information (rules + announcements, both protected)
    const { rows: catInfo } = await client.query(
      'INSERT INTO categories (server_id, name, position) VALUES ($1, $2, 0) RETURNING id',
      [server.id, 'Information']
    );
    await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position, protected) VALUES ($1,$2,$3,$4,0,true)',
      [server.id, catInfo[0].id, 'rules', 'text']
    );
    await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position, protected) VALUES ($1,$2,$3,$4,1,true)',
      [server.id, catInfo[0].id, 'service-announcements', 'announcement']
    );

    // Category: Text Channels
    const { rows: catText } = await client.query(
      'INSERT INTO categories (server_id, name, position) VALUES ($1, $2, 1) RETURNING id',
      [server.id, 'Text Channels']
    );
    const { rows: generalChan } = await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position) VALUES ($1,$2,$3,$4,0) RETURNING id',
      [server.id, catText[0].id, 'general', 'text']
    );

    // Category: Voice Channels (voice + paired voice_text chat)
    const { rows: catVoice } = await client.query(
      'INSERT INTO categories (server_id, name, position) VALUES ($1, $2, 2) RETURNING id',
      [server.id, 'Voice Channels']
    );
    const { rows: voiceChan } = await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position) VALUES ($1,$2,$3,$4,0) RETURNING id',
      [server.id, catVoice[0].id, 'General', 'voice']
    );
    await client.query(
      'INSERT INTO channels (server_id, category_id, name, type, position, paired_voice_channel_id) VALUES ($1,$2,$3,$4,1,$5)',
      [server.id, catVoice[0].id, 'general-chat', 'voice_text', voiceChan[0].id]
    );
    // ── End template ──────────────────────────────────────────────────────

    await client.query('INSERT INTO level_config (server_id) VALUES ($1) ON CONFLICT DO NOTHING', [server.id]);
    await client.query('INSERT INTO staff_config (server_id) VALUES ($1) ON CONFLICT DO NOTHING', [server.id]);
    await client.query('COMMIT');
    res.status(201).json({ ...server, defaultChannelId: generalChan[0].id });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.constraint === 'servers_vanity_url_normalized_key') return res.status(409).json({ error: 'Vanity URL already taken' });
    if (err.constraint === 'idx_servers_tag_unique') return res.status(409).json({ error: 'Tag is already in use by another server' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create server' });
  } finally {
    client.release();
  }
});

router.get('/:serverId', requireServerMember, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM servers WHERE id = $1', [req.params.serverId]);
  if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
  res.json(rows[0]);
});

router.patch('/:serverId', async (req, res) => {
  const allowed = await hasPermission(req.params.serverId, req.user.id, 'manage_server');
  if (!allowed) return res.status(403).json({ error: 'Missing permission' });
  const { name, description, vanityUrl, iconUrl, bannerUrl, tag, xpEnabled } = req.body;
  if (vanityUrl && vanityUrl.length < 3) return res.status(400).json({ error: 'Vanity URL must be at least 3 characters' });
  if (tag !== undefined && tag !== null && tag !== '') {
    if (!/^[A-Za-z]{2,5}$/.test(tag)) return res.status(400).json({ error: 'Tag must be 2-5 letters (A-Z only)' });
  }
  try {
    const tagValue = tag === '' ? null : tag ? tag.toUpperCase() : undefined;
    const { rows } = await pool.query(`
      UPDATE servers SET name=COALESCE($1,name), description=COALESCE($2,description),
        vanity_url=COALESCE($3,vanity_url), icon_url=COALESCE($4,icon_url), banner_url=COALESCE($5,banner_url),
        tag=COALESCE($6,tag), xp_enabled=COALESCE($7,xp_enabled), updated_at=NOW()
      WHERE id=$8 RETURNING *
    `, [name, description, vanityUrl, iconUrl, bannerUrl, tagValue ?? null, xpEnabled ?? null, req.params.serverId]);
    res.json(rows[0]);
  } catch (err) {
    if (err.constraint === 'servers_vanity_url_normalized_key') return res.status(409).json({ error: 'Vanity URL already taken' });
    if (err.constraint === 'idx_servers_tag_unique') return res.status(409).json({ error: 'Tag is already in use by another server' });
    res.status(500).json({ error: 'Update failed' });
  }
});

router.delete('/:serverId', requireServerOwner, async (req, res) => {
  await pool.query('DELETE FROM servers WHERE id = $1', [req.params.serverId]);
  res.json({ ok: true });
});

router.get('/:serverId/members', requireServerMember, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.avatar_url,
      sm.nickname, sm.joined_at, sm.xp, sm.level, sm.timed_out_until, sm.show_tag,
      s.owner_id, s.tag AS server_tag,
      COALESCE(json_agg(DISTINCT jsonb_build_object(
        'id', r.id, 'name', r.name, 'color', r.color, 'color_gradient', r.color_gradient,
        'icon_url', r.icon_url, 'icon_emoji', r.icon_emoji, 'hoist', r.hoist, 'position', r.position, 'xp_per_message', r.xp_per_message
      )) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles,
      COALESCE(json_agg(DISTINCT r.id) FILTER (WHERE r.id IS NOT NULL), '[]') AS role_ids
    FROM server_members sm JOIN users u ON u.id=sm.user_id JOIN servers s ON s.id=sm.server_id
    LEFT JOIN member_roles mr ON mr.server_id=sm.server_id AND mr.user_id=sm.user_id
    LEFT JOIN roles r ON r.id=mr.role_id
    WHERE sm.server_id=$1
    GROUP BY u.id,u.username,u.display_name,u.avatar_url,sm.nickname,sm.joined_at,sm.xp,sm.level,sm.timed_out_until,sm.show_tag,s.owner_id,s.tag
    ORDER BY sm.joined_at ASC
  `, [req.params.serverId]);
  res.json(rows);
});

// Toggle show_tag for current user in this server
router.patch('/:serverId/members/@me/show-tag', requireServerMember, async (req, res) => {
  const { show } = req.body;
  if (typeof show !== 'boolean') return res.status(400).json({ error: 'show must be a boolean' });
  await pool.query(
    'UPDATE server_members SET show_tag=$1 WHERE server_id=$2 AND user_id=$3',
    [show, req.params.serverId, req.user.id]
  );
  res.json({ ok: true, show_tag: show });
});

router.get('/:serverId/roles', requireServerMember, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM roles WHERE server_id=$1 ORDER BY position ASC', [req.params.serverId]);
  res.json(rows);
});

router.post('/:serverId/roles', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_roles')) return res.status(403).json({ error: 'Missing permission' });
  const { name, color, colorGradient, iconUrl, iconEmoji, hoist, mentionable, permissions, xpPerMessage } = req.body;
  const { rows } = await pool.query(`
    INSERT INTO roles (server_id, name, color, color_gradient, icon_url, icon_emoji, hoist, mentionable, permissions, xp_per_message)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [req.params.serverId, name||'New Role', color||'#99aab5', colorGradient||null, iconUrl||null, iconEmoji||null,
      hoist||false, mentionable||false, permissions||{}, xpPerMessage??null]);
  res.status(201).json(rows[0]);
});

router.patch('/:serverId/roles/:roleId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_roles')) return res.status(403).json({ error: 'Missing permission' });
  const { name, color, colorGradient, iconUrl, iconEmoji, hoist, mentionable, permissions, xpPerMessage, position } = req.body;
  const { rows } = await pool.query(`
    UPDATE roles SET
      name=COALESCE($1,name), color=COALESCE($2,color), color_gradient=COALESCE($3,color_gradient),
      icon_url=COALESCE($4,icon_url), icon_emoji=COALESCE($5,icon_emoji), hoist=COALESCE($6,hoist),
      mentionable=COALESCE($7,mentionable), permissions=COALESCE($8,permissions),
      xp_per_message=COALESCE($9,xp_per_message), position=COALESCE($10,position), updated_at=NOW()
    WHERE id=$11 AND server_id=$12 RETURNING *
  `, [name,color,colorGradient,iconUrl,iconEmoji,hoist,mentionable,permissions,xpPerMessage,position,req.params.roleId,req.params.serverId]);
  if (!rows[0]) return res.status(404).json({ error: 'Role not found' });
  res.json(rows[0]);
});

router.delete('/:serverId/roles/:roleId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_roles')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query('DELETE FROM roles WHERE id=$1 AND server_id=$2', [req.params.roleId, req.params.serverId]);
  res.json({ ok: true });
});

router.post('/:serverId/members/:userId/roles/:roleId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_roles')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query('INSERT INTO member_roles (server_id,user_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.serverId, req.params.userId, req.params.roleId]);
  res.json({ ok: true });
});

router.delete('/:serverId/members/:userId/roles/:roleId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_roles')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=$3', [req.params.serverId, req.params.userId, req.params.roleId]);
  res.json({ ok: true });
});

router.get('/:serverId/channels', requireServerMember, async (req, res) => {
  const { rows: categories } = await pool.query('SELECT * FROM categories WHERE server_id=$1 ORDER BY position ASC', [req.params.serverId]);
  const { rows: channels } = await pool.query('SELECT * FROM channels WHERE server_id=$1 ORDER BY position ASC', [req.params.serverId]);
  res.json({ categories, channels });
});

router.post('/:serverId/join', async (req, res) => {
  const { rows: srv } = await pool.query('SELECT * FROM servers WHERE id=$1', [req.params.serverId]);
  if (!srv[0]) return res.status(404).json({ error: 'Server not found' });
  const { rows: ban } = await pool.query('SELECT 1 FROM bans WHERE server_id=$1 AND user_id=$2', [req.params.serverId, req.user.id]);
  if (ban[0]) return res.status(403).json({ error: 'You are banned from this server' });
  await pool.query('INSERT INTO server_members (server_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [req.params.serverId, req.user.id]);
  const { rows: defaultRole } = await pool.query('SELECT id FROM roles WHERE server_id=$1 AND is_default=true', [req.params.serverId]);
  if (defaultRole[0]) {
    await pool.query('INSERT INTO member_roles (server_id,user_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [req.params.serverId, req.user.id, defaultRole[0].id]);
  }
  res.json({ ok: true, server: srv[0] });
});

router.post('/:serverId/invites', requireServerMember, async (req, res) => {
  const code = Math.random().toString(36).slice(2, 10).toUpperCase();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const { rows } = await pool.query(
    'INSERT INTO server_invites (server_id, created_by, code, expires_at) VALUES ($1,$2,$3,$4) RETURNING code',
    [req.params.serverId, req.user.id, code, expiresAt]
  );
  res.json({ code: rows[0].code });
});

router.post('/join/:code', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM server_invites WHERE code=$1 AND (expires_at IS NULL OR expires_at > NOW())',
    [req.params.code]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Invalid or expired invite' });
  const serverId = rows[0].server_id;
  const { rows: ban } = await pool.query('SELECT 1 FROM bans WHERE server_id=$1 AND user_id=$2', [serverId, req.user.id]);
  if (ban[0]) return res.status(403).json({ error: 'You are banned from this server' });
  await pool.query('INSERT INTO server_members (server_id,user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [serverId, req.user.id]);
  const { rows: defaultRole } = await pool.query('SELECT id FROM roles WHERE server_id=$1 AND is_default=true', [serverId]);
  if (defaultRole[0]) await pool.query('INSERT INTO member_roles (server_id,user_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [serverId, req.user.id, defaultRole[0].id]);
  res.json({ ok: true, serverId });
});

router.get('/:serverId/categories', requireServerMember, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM categories WHERE server_id=$1 ORDER BY position ASC', [req.params.serverId]);
  res.json(rows);
});

router.post('/:serverId/categories', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  const { name } = req.body;
  const { rows } = await pool.query('INSERT INTO categories (server_id,name,position) VALUES ($1,$2,0) RETURNING *', [req.params.serverId, name]);
  res.status(201).json(rows[0]);
});

router.patch('/:serverId/categories/:catId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  const { name, position } = req.body;
  const { rows } = await pool.query('UPDATE categories SET name=COALESCE($1,name),position=COALESCE($2,position) WHERE id=$3 AND server_id=$4 RETURNING *', [name, position, req.params.catId, req.params.serverId]);
  res.json(rows[0]);
});

router.delete('/:serverId/categories/:catId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_channels')) return res.status(403).json({ error: 'Missing permission' });
  await pool.query('DELETE FROM categories WHERE id=$1 AND server_id=$2', [req.params.catId, req.params.serverId]);
  res.json({ ok: true });
});

router.get('/:serverId/members/:userId', requireServerMember, async (req, res) => {
  const { rows } = await pool.query(`
    SELECT u.id AS user_id, u.username, u.display_name, u.avatar_url, sm.nickname, sm.joined_at, sm.xp, sm.level, sm.show_tag, s.tag AS server_tag
    FROM server_members sm JOIN users u ON u.id=sm.user_id JOIN servers s ON s.id=sm.server_id
    WHERE sm.server_id=$1 AND sm.user_id=$2
  `, [req.params.serverId, req.params.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'Member not found' });
  res.json(rows[0]);
});

router.patch('/:serverId/members/:userId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_server')) return res.status(403).json({ error: 'Missing permission' });
  const { nickname } = req.body;
  const { rows } = await pool.query('UPDATE server_members SET nickname=$1 WHERE server_id=$2 AND user_id=$3 RETURNING *', [nickname, req.params.serverId, req.params.userId]);
  res.json(rows[0]);
});

router.delete('/:serverId/members/:userId', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'kick_members')) return res.status(403).json({ error: 'Missing permission' });
  const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id=$1', [req.params.serverId]);
  if (rows[0]?.owner_id === req.params.userId) return res.status(400).json({ error: 'Cannot kick the server owner' });
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [req.params.serverId, req.params.userId]);
  res.json({ ok: true });
});

router.post('/:serverId/leave', async (req, res) => {
  const { rows } = await pool.query('SELECT owner_id FROM servers WHERE id=$1', [req.params.serverId]);
  if (rows[0]?.owner_id === req.user.id) return res.status(400).json({ error: 'Owner cannot leave — transfer ownership first' });
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [req.params.serverId, req.user.id]);
  res.json({ ok: true });
});

export default router;
