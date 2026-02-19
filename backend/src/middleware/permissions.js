import pool from '../config/database.js';

export async function requireServerMember(req, res, next) {
  const serverId = req.params.serverId || req.body.serverId;
  if (!serverId) return res.status(400).json({ error: 'Server ID required' });
  const { rows } = await pool.query(
    'SELECT * FROM server_members WHERE server_id = $1 AND user_id = $2',
    [serverId, req.user.id]
  );
  if (!rows[0]) return res.status(403).json({ error: 'Not a member of this server' });
  req.member = rows[0];
  next();
}

export async function requireServerOwner(req, res, next) {
  const serverId = req.params.serverId || req.body.serverId;
  const { rows } = await pool.query(
    'SELECT owner_id FROM servers WHERE id = $1',
    [serverId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
  if (rows[0].owner_id !== req.user.id) {
    return res.status(403).json({ error: 'Only the server owner can do this' });
  }
  req.server = rows[0];
  next();
}

export async function getMemberPermissions(serverId, userId) {
  const { rows: memberRows } = await pool.query(`
    SELECT r.permissions, r.position
    FROM member_roles mr
    JOIN roles r ON r.id = mr.role_id
    WHERE mr.server_id = $1 AND mr.user_id = $2
    ORDER BY r.position ASC
  `, [serverId, userId]);

  const { rows: serverRows } = await pool.query(
    'SELECT owner_id FROM servers WHERE id = $1', [serverId]
  );
  const isOwner = serverRows[0]?.owner_id === userId;
  if (isOwner) return { isOwner: true, permissions: { all: true } };

  const merged = {};
  for (const row of memberRows) {
    if (row.permissions?.all) return { isOwner: false, permissions: { all: true } };
    Object.assign(merged, row.permissions || {});
  }
  return { isOwner: false, permissions: merged };
}

export async function hasPermission(serverId, userId, permission) {
  const { isOwner, permissions } = await getMemberPermissions(serverId, userId);
  return isOwner || permissions.all || !!permissions[permission];
}
