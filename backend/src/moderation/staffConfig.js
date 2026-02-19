import pool from '../config/database.js';
import crypto from 'crypto';

export async function getStaffConfig(serverId) {
  const { rows } = await pool.query('SELECT * FROM staff_config WHERE server_id=$1', [serverId]);
  if (!rows[0]) {
    await pool.query('INSERT INTO staff_config (server_id) VALUES ($1) ON CONFLICT DO NOTHING', [serverId]);
    return { server_id: serverId, staff_roles_json: [], channels_json: {}, staffwarn_config_json: { maxWarns: 3, action: 'demote' } };
  }
  return rows[0];
}

export async function updateStaffConfig(serverId, updates) {
  const { rows } = await pool.query(`
    UPDATE staff_config SET
      staff_roles_json = COALESCE($1, staff_roles_json),
      channels_json = COALESCE($2, channels_json),
      staffwarn_config_json = COALESCE($3, staffwarn_config_json),
      updated_at = NOW()
    WHERE server_id=$4 RETURNING *
  `, [
    updates.staffRoles ? JSON.stringify(updates.staffRoles) : null,
    updates.channels ? JSON.stringify(updates.channels) : null,
    updates.staffwarnConfig ? JSON.stringify(updates.staffwarnConfig) : null,
    serverId
  ]);
  return rows[0];
}

export async function hasModPermission(serverId, userId, permission) {
  const { rows: serverRows } = await pool.query('SELECT owner_id FROM servers WHERE id=$1', [serverId]);
  if (serverRows[0]?.owner_id === userId) return true;

  const config = await getStaffConfig(serverId);
  const staffRoles = config.staff_roles_json || [];

  const { rows: memberRoles } = await pool.query('SELECT role_id FROM member_roles WHERE server_id=$1 AND user_id=$2', [serverId, userId]);
  const userRoleIds = new Set(memberRoles.map(r => r.role_id));

  for (const staffRole of staffRoles) {
    if (userRoleIds.has(staffRole.roleId)) {
      if (staffRole.permissions === 'all') return true;
      if (Array.isArray(staffRole.permissions) && staffRole.permissions.includes(permission)) return true;
    }
  }
  return false;
}

export async function generateBanOverrideCode(serverId) {
  const code = crypto.randomBytes(16).toString('hex');
  await pool.query('UPDATE staff_config SET override_code=$1, override_generated_at=NOW() WHERE server_id=$2', [code, serverId]);
  return code;
}

export async function validateBanOverrideCode(serverId, code) {
  const { rows } = await pool.query('SELECT override_code, override_generated_at, override_regen_hours FROM staff_config WHERE server_id=$1', [serverId]);
  if (!rows[0] || rows[0].override_code !== code) return false;
  const generatedAt = new Date(rows[0].override_generated_at);
  const expiresAt = new Date(generatedAt.getTime() + (rows[0].override_regen_hours * 3600000));
  return new Date() < expiresAt;
}
