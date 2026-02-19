import pool from '../config/database.js';
import { getStaffConfig } from './staffConfig.js';

export async function addStaffWarn(serverId, data) {
  const { staffId, staffTag, moderatorId, moderatorTag, reason } = data;
  const { rows } = await pool.query(`
    INSERT INTO staff_warns (server_id, staff_id, staff_tag, moderator_id, moderator_tag, reason)
    VALUES ($1,$2,$3,$4,$5,$6) RETURNING *
  `, [serverId, staffId, staffTag, moderatorId, moderatorTag, reason]);

  const config = await getStaffConfig(serverId);
  const warnConfig = config.staffwarn_config_json || { maxWarns: 3, action: 'demote' };
  const activeWarns = await getActiveStaffWarns(serverId, staffId);

  if (activeWarns.length >= warnConfig.maxWarns) {
    await handleWarnEscalation(serverId, staffId, warnConfig.action);
    await pool.query('DELETE FROM staff_warns WHERE server_id=$1 AND staff_id=$2', [serverId, staffId]);
  }

  return rows[0];
}

export async function getActiveStaffWarns(serverId, staffId) {
  const { rows } = await pool.query(
    'SELECT * FROM staff_warns WHERE server_id=$1 AND staff_id=$2 AND expires_at>NOW() ORDER BY created_at ASC',
    [serverId, staffId]
  );
  return rows;
}

export async function getAllStaffWarns(serverId) {
  const { rows } = await pool.query(
    'SELECT * FROM staff_warns WHERE server_id=$1 AND expires_at>NOW() ORDER BY created_at DESC',
    [serverId]
  );
  return rows;
}

export async function removeStaffWarn(serverId, warnId) {
  const { rows } = await pool.query('DELETE FROM staff_warns WHERE id=$1 AND server_id=$2 RETURNING *', [warnId, serverId]);
  return rows[0] || null;
}

async function handleWarnEscalation(serverId, staffId, action) {
  const config = await getStaffConfig(serverId);
  const staffRoleIds = (config.staff_roles_json || []).map(r => r.roleId);
  if (!staffRoleIds.length) return;

  if (action === 'strip') {
    await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=ANY($3)', [serverId, staffId, staffRoleIds]);
  } else if (action === 'demote') {
    const staffRoles = (config.staff_roles_json || []).sort((a, b) => b.level - a.level);
    if (staffRoles.length > 0) {
      const lowestRole = staffRoles[0];
      const toRemove = staffRoles.filter(r => r.roleId !== lowestRole.roleId).map(r => r.roleId);
      if (toRemove.length) {
        await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=ANY($3)', [serverId, staffId, toRemove]);
      }
    }
  }
}
