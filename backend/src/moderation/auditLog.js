import pool from '../config/database.js';

export const ACTION_TYPES = {
  BAN: 'ban', UNBAN: 'unban', KICK: 'kick', MUTE: 'mute', UNMUTE: 'unmute',
  WARN: 'warn', REVERT_WARN: 'revert_warn', HACKBAN: 'hackban',
  CHANNEL_CREATE: 'channel_create', CHANNEL_DELETE: 'channel_delete', CHANNEL_UPDATE: 'channel_update',
  ROLE_CREATE: 'role_create', ROLE_DELETE: 'role_delete', ROLE_UPDATE: 'role_update',
  MEMBER_ROLE_ADD: 'member_role_add', MEMBER_ROLE_REMOVE: 'member_role_remove',
  SERVER_UPDATE: 'server_update', CASE_DELETE: 'case_delete',
  STAFF_WARN: 'staff_warn', MEMBER_PROMOTE: 'member_promote', MEMBER_DEMOTE: 'member_demote',
};

export async function logAction(serverId, data) {
  const { actionType, actorId, actorName, targetId, targetName, targetType, reason, metadata, caseId } = data;
  const { rows } = await pool.query(`
    INSERT INTO audit_log (server_id, action_type, actor_id, actor_name, target_id, target_name, target_type, reason, metadata, case_id)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *
  `, [serverId, actionType, actorId, actorName, targetId, targetName, targetType||'user', reason||null, JSON.stringify(metadata||{}), caseId||null]);
  return rows[0];
}

export async function getAuditLog(serverId, { limit = 100, offset = 0, actionType, targetId } = {}) {
  let query = 'SELECT * FROM audit_log WHERE server_id=$1';
  const params = [serverId];
  if (actionType) { params.push(actionType); query += ` AND action_type=$${params.length}`; }
  if (targetId) { params.push(targetId); query += ` AND target_id=$${params.length}`; }
  query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;
  const { rows } = await pool.query(query, params);
  return rows;
}
