import pool from '../config/database.js';

export async function createCase(serverId, data) {
  const { userId, username, type, moderatorId, moderatorName, reason, severity, duration, metadata } = data;
  const caseNumber = await getNextCaseNumber(serverId);
  const { rows } = await pool.query(`
    INSERT INTO cases (server_id, case_number, user_id, username, type, moderator_id, moderator_name, reason, severity, duration, metadata)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *
  `, [serverId, caseNumber, userId, username, type, moderatorId, moderatorName, reason||null, severity||null, duration||null, JSON.stringify(metadata||{})]);
  return rows[0];
}

export async function getNextCaseNumber(serverId) {
  const { rows } = await pool.query('SELECT get_next_case_number($1) AS num', [serverId]);
  return rows[0].num;
}

export async function getCaseByNumber(serverId, caseNumber) {
  const { rows } = await pool.query('SELECT * FROM cases WHERE server_id=$1 AND case_number=$2', [serverId, caseNumber]);
  return rows[0] || null;
}

export async function getCasesForUser(serverId, userId) {
  const { rows } = await pool.query('SELECT * FROM cases WHERE server_id=$1 AND user_id=$2 ORDER BY case_number ASC', [serverId, userId]);
  return rows;
}

export async function getAllCases(serverId, { limit = 50, offset = 0 } = {}) {
  const { rows } = await pool.query('SELECT * FROM cases WHERE server_id=$1 ORDER BY case_number DESC LIMIT $2 OFFSET $3', [serverId, limit, offset]);
  return rows;
}

export async function deleteCase(serverId, caseNumber) {
  const { rows } = await pool.query('DELETE FROM cases WHERE server_id=$1 AND case_number=$2 RETURNING *', [serverId, caseNumber]);
  return rows[0] || null;
}
