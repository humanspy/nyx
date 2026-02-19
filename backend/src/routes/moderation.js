import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { createCase, getCaseByNumber, getCasesForUser, getAllCases, deleteCase } from '../moderation/cases.js';
import { getStaffConfig, updateStaffConfig, hasModPermission, generateBanOverrideCode, validateBanOverrideCode } from '../moderation/staffConfig.js';
import { addStaffWarn, getActiveStaffWarns, getAllStaffWarns, removeStaffWarn } from '../moderation/staffWarns.js';
import { logAction, ACTION_TYPES } from '../moderation/auditLog.js';
import { grantXP, getLeaderboard, setXP } from '../moderation/xp.js';

const router = Router();
router.use(requireAuth);

const chk = async (req, res, perm) => {
  const ok = await hasModPermission(req.params.serverId, req.user.id, perm);
  if (!ok) { res.status(403).json({ error: `Missing permission: ${perm}` }); return false; }
  return true;
};

function parseDuration(str) {
  if (!str) return null;
  const m = str.match(/^(\d+)(s|m|h|d|w)$/);
  if (!m) return null;
  const mults = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return parseInt(m[1]) * mults[m[2]];
}

// === CASES ===
router.get('/:serverId/cases', async (req, res) => {
  if (!await chk(req, res, 'case')) return;
  const { userId } = req.query;
  const cases = userId
    ? await getCasesForUser(req.params.serverId, userId)
    : await getAllCases(req.params.serverId, { limit: parseInt(req.query.limit)||50, offset: parseInt(req.query.offset)||0 });
  res.json(cases);
});

router.get('/:serverId/cases/:caseNumber', async (req, res) => {
  if (!await chk(req, res, 'case')) return;
  const c = await getCaseByNumber(req.params.serverId, parseInt(req.params.caseNumber));
  if (!c) return res.status(404).json({ error: 'Case not found' });
  res.json(c);
});

router.delete('/:serverId/cases/:caseNumber', async (req, res) => {
  if (!await chk(req, res, 'case_delete')) return;
  const deleted = await deleteCase(req.params.serverId, parseInt(req.params.caseNumber));
  if (!deleted) return res.status(404).json({ error: 'Case not found' });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.CASE_DELETE, actorId: req.user.id, actorName: req.user.username, targetId: deleted.user_id, targetName: deleted.username, metadata: { caseNumber: deleted.case_number } });
  res.json({ ok: true });
});

// === MODERATION ACTIONS ===
router.post('/:serverId/warn', async (req, res) => {
  if (!await chk(req, res, 'warn')) return;
  const { userId, username, reason, severity } = req.body;
  const c = await createCase(req.params.serverId, { userId, username, type: 'WARN', moderatorId: req.user.id, moderatorName: req.user.username, reason, severity: severity||'medium' });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.WARN, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username, reason, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/timeout', async (req, res) => {
  if (!await chk(req, res, 'timeout')) return;
  const { userId, username, reason, duration } = req.body;
  const ms = parseDuration(duration);
  if (!ms) return res.status(400).json({ error: 'Invalid duration (e.g. 1h, 7d, 30m)' });
  const until = new Date(Date.now() + ms);
  await pool.query('UPDATE server_members SET timed_out_until=$1 WHERE server_id=$2 AND user_id=$3', [until, req.params.serverId, userId]);
  const c = await createCase(req.params.serverId, { userId, username, type: 'TIMEOUT', moderatorId: req.user.id, moderatorName: req.user.username, reason, duration });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.MUTE, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username, reason, metadata: { duration }, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/untimeout', async (req, res) => {
  if (!await chk(req, res, 'timeout')) return;
  const { userId, username, reason } = req.body;
  await pool.query('UPDATE server_members SET timed_out_until=NULL WHERE server_id=$1 AND user_id=$2', [req.params.serverId, userId]);
  const c = await createCase(req.params.serverId, { userId, username, type: 'UNMUTE', moderatorId: req.user.id, moderatorName: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.UNMUTE, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/kick', async (req, res) => {
  if (!await chk(req, res, 'kick')) return;
  const { userId, username, reason } = req.body;
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [req.params.serverId, userId]);
  const c = await createCase(req.params.serverId, { userId, username, type: 'KICK', moderatorId: req.user.id, moderatorName: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.KICK, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username, reason, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/ban', async (req, res) => {
  if (!await chk(req, res, 'ban')) return;
  const { userId, username, reason, overrideCode } = req.body;
  if (overrideCode && !await validateBanOverrideCode(req.params.serverId, overrideCode)) return res.status(403).json({ error: 'Invalid override code' });
  await pool.query('INSERT INTO bans (server_id,user_id,moderator_id,reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [req.params.serverId, userId, req.user.id, reason]);
  await pool.query('DELETE FROM server_members WHERE server_id=$1 AND user_id=$2', [req.params.serverId, userId]);
  const c = await createCase(req.params.serverId, { userId, username, type: 'BAN', moderatorId: req.user.id, moderatorName: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.BAN, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username, reason, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/hackban', async (req, res) => {
  if (!await chk(req, res, 'hackban')) return;
  const { userId, username, reason } = req.body;
  await pool.query('INSERT INTO bans (server_id,user_id,moderator_id,reason) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [req.params.serverId, userId, req.user.id, reason]);
  const c = await createCase(req.params.serverId, { userId, username: username||userId, type: 'HACKBAN', moderatorId: req.user.id, moderatorName: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.HACKBAN, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username||userId, reason, caseId: c.id });
  res.json(c);
});

router.post('/:serverId/unban', async (req, res) => {
  if (!await chk(req, res, 'unban')) return;
  const { userId, username, reason } = req.body;
  await pool.query('DELETE FROM bans WHERE server_id=$1 AND user_id=$2', [req.params.serverId, userId]);
  const c = await createCase(req.params.serverId, { userId, username: username||userId, type: 'UNBAN', moderatorId: req.user.id, moderatorName: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.UNBAN, actorId: req.user.id, actorName: req.user.username, targetId: userId, targetName: username||userId, caseId: c.id });
  res.json(c);
});

// === STAFF WARNS ===
router.get('/:serverId/staffwarns', async (req, res) => {
  if (!await chk(req, res, 'warnstaff')) return;
  const { staffId } = req.query;
  res.json(staffId ? await getActiveStaffWarns(req.params.serverId, staffId) : await getAllStaffWarns(req.params.serverId));
});

router.post('/:serverId/staffwarns', async (req, res) => {
  if (!await chk(req, res, 'warnstaff')) return;
  const { staffId, staffTag, reason } = req.body;
  const warn = await addStaffWarn(req.params.serverId, { staffId, staffTag, moderatorId: req.user.id, moderatorTag: req.user.username, reason });
  await logAction(req.params.serverId, { actionType: ACTION_TYPES.STAFF_WARN, actorId: req.user.id, actorName: req.user.username, targetId: staffId, targetName: staffTag, reason });
  res.json(warn);
});

router.delete('/:serverId/staffwarns/:warnId', async (req, res) => {
  if (!await chk(req, res, 'warnstaff')) return;
  await removeStaffWarn(req.params.serverId, req.params.warnId);
  res.json({ ok: true });
});

// === AUDIT LOG ===
router.get('/:serverId/audit-log', async (req, res) => {
  if (!await chk(req, res, 'view_audit_log')) return;
  const { rows } = await pool.query('SELECT * FROM audit_log WHERE server_id=$1 ORDER BY created_at DESC LIMIT 200', [req.params.serverId]);
  res.json(rows);
});

// === XP ===
router.get('/:serverId/leaderboard', async (req, res) => {
  res.json(await getLeaderboard(req.params.serverId, { limit: parseInt(req.query.limit)||20, offset: parseInt(req.query.offset)||0 }));
});

router.patch('/:serverId/xp/:userId', async (req, res) => {
  if (!await chk(req, res, 'manage_xp')) return;
  await setXP(req.params.serverId, req.params.userId, req.body.xp, req.body.level);
  res.json({ ok: true });
});

// === STAFF CONFIG ===
router.get('/:serverId/config', async (req, res) => {
  if (!await chk(req, res, 'manage_staff')) return;
  res.json(await getStaffConfig(req.params.serverId));
});

router.patch('/:serverId/config', async (req, res) => {
  if (!await chk(req, res, 'manage_staff')) return;
  res.json(await updateStaffConfig(req.params.serverId, req.body));
});

router.post('/:serverId/generate-override-code', async (req, res) => {
  if (!await chk(req, res, 'ban')) return;
  res.json({ code: await generateBanOverrideCode(req.params.serverId) });
});

// === LEVEL CONFIG ===
router.get('/:serverId/level-config', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM level_config WHERE server_id=$1', [req.params.serverId]);
  res.json(rows[0] || {});
});

router.patch('/:serverId/level-config', async (req, res) => {
  if (!await chk(req, res, 'manage_xp')) return;
  const { defaultXpPerMessage, intervalValue, removePrevious, levelRolesJson, xpCooldownSeconds } = req.body;
  const { rows } = await pool.query(`
    INSERT INTO level_config (server_id, default_xp_per_message, interval_value, remove_previous, level_roles_json, xp_cooldown_seconds)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (server_id) DO UPDATE SET
      default_xp_per_message=COALESCE(EXCLUDED.default_xp_per_message,level_config.default_xp_per_message),
      interval_value=COALESCE(EXCLUDED.interval_value,level_config.interval_value),
      remove_previous=COALESCE(EXCLUDED.remove_previous,level_config.remove_previous),
      level_roles_json=COALESCE(EXCLUDED.level_roles_json,level_config.level_roles_json),
      xp_cooldown_seconds=COALESCE(EXCLUDED.xp_cooldown_seconds,level_config.xp_cooldown_seconds),
      updated_at=NOW()
    RETURNING *
  `, [req.params.serverId, defaultXpPerMessage, intervalValue, removePrevious,
      levelRolesJson ? JSON.stringify(levelRolesJson) : null, xpCooldownSeconds]);
  res.json(rows[0]);
});

export default router;
