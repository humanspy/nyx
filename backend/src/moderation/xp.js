import pool from '../config/database.js';
import { sendToUser } from '../websocket/gateway.js';

export async function grantXP(serverId, userId, username) {
  const { rows: configRows } = await pool.query(
    'SELECT default_xp_per_message, xp_cooldown_seconds, level_roles_json, interval_value, remove_previous FROM level_config WHERE server_id=$1',
    [serverId]
  );
  const config = configRows[0] || { default_xp_per_message: 10, xp_cooldown_seconds: 60 };

  const { rows: memberRows } = await pool.query(
    'SELECT xp, level, last_message_at FROM server_members WHERE server_id=$1 AND user_id=$2',
    [serverId, userId]
  );
  if (!memberRows[0]) return;

  const lastMsg = memberRows[0].last_message_at;
  if (lastMsg) {
    const secondsSince = (Date.now() - new Date(lastMsg).getTime()) / 1000;
    if (secondsSince < (config.xp_cooldown_seconds || 60)) return;
  }

  // Get XP from highest-priority role with xp_per_message set
  const { rows: roleRows } = await pool.query(`
    SELECT r.xp_per_message FROM member_roles mr
    JOIN roles r ON r.id=mr.role_id
    WHERE mr.server_id=$1 AND mr.user_id=$2 AND r.xp_per_message IS NOT NULL
    ORDER BY r.position ASC LIMIT 1
  `, [serverId, userId]);

  const xpAmount = roleRows[0]?.xp_per_message ?? config.default_xp_per_message ?? 10;
  const currentXp = memberRows[0].xp || 0;
  const currentLevel = memberRows[0].level || 0;
  const xpThreshold = Math.max(100, currentLevel * 100);
  const newXp = currentXp + xpAmount;

  let newLevel = currentLevel;
  let finalXp = newXp;
  let leveledUp = false;

  if (newXp >= xpThreshold) {
    newLevel = currentLevel + 1;
    finalXp = 0;
    leveledUp = true;
  }

  await pool.query(`
    UPDATE server_members SET xp=$1, level=$2, message_count=message_count+1, last_message_at=NOW()
    WHERE server_id=$3 AND user_id=$4
  `, [finalXp, newLevel, serverId, userId]);

  if (leveledUp) {
    await applyLevelRoles(serverId, userId, newLevel, config);
    sendToUser(userId, { type: 'LEVEL_UP', data: { serverId, level: newLevel, xp: finalXp } });
  }

  return { leveledUp, level: newLevel, xp: finalXp };
}

async function applyLevelRoles(serverId, userId, level, config) {
  if (!config.level_roles_json || !config.interval_value) return;
  const interval = config.interval_value || 5;
  if (level % interval !== 0) return;
  const roleId = config.level_roles_json[level.toString()];
  if (!roleId) return;

  if (config.remove_previous) {
    const allIds = Object.values(config.level_roles_json);
    await pool.query('DELETE FROM member_roles WHERE server_id=$1 AND user_id=$2 AND role_id=ANY($3)', [serverId, userId, allIds]);
  }

  await pool.query('INSERT INTO member_roles (server_id,user_id,role_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [serverId, userId, roleId]);
}

export async function getLeaderboard(serverId, { limit = 20, offset = 0 } = {}) {
  const { rows } = await pool.query(`
    SELECT sm.user_id, sm.xp, sm.level, sm.message_count, u.username, u.display_name, u.avatar_url
    FROM server_members sm JOIN users u ON u.id=sm.user_id
    WHERE sm.server_id=$1 ORDER BY sm.level DESC, sm.xp DESC LIMIT $2 OFFSET $3
  `, [serverId, limit, offset]);
  return rows;
}

export async function setXP(serverId, userId, xp, level) {
  await pool.query('UPDATE server_members SET xp=$1, level=$2 WHERE server_id=$3 AND user_id=$4', [xp, level, serverId, userId]);
}
