const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware');

const router = express.Router();

// All routes in this file are protected
router.use(authMiddleware);

// Warn a member
// POST /servers/:serverId/members/:memberId/warn
router.post('/servers/:serverId/members/:memberId/warn', async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason } = req.body;
    const actorId = req.user.id; // From authMiddleware

    // 1. Permission Check (simplified: only server owner can warn)
    const serverResult = await db.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Server not found.' });
    }
    const serverOwnerId = serverResult.rows[0].owner_id;

    if (actorId !== serverOwnerId) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    
    // 2. Do not allow self-warning
    if (actorId === memberId) {
        return res.status(400).json({ message: 'You cannot warn yourself.' });
    }

    // 3. Create Case Action
    const caseResult = await db.query(
      `INSERT INTO cases (server_id, case_type, target_id, moderator_id, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING case_id`,
      [serverId, 'warn', memberId, actorId, reason || 'No reason provided']
    );
    
    const newCase = caseResult.rows[0];

    // TODO: DM user and send log message via websocket when messaging is implemented

    res.status(201).json({
      message: `Successfully warned member ${memberId}.`,
      case: newCase,
    });

  } catch (error) {
    console.error('Warn action error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Kick a member
// POST /servers/:serverId/members/:memberId/kick
router.post('/servers/:serverId/members/:memberId/kick', async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason } = req.body;
    const actorId = req.user.id; // From authMiddleware

    // 1. Permission Check (simplified: only server owner can kick)
    const serverResult = await db.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Server not found.' });
    }
    const serverOwnerId = serverResult.rows[0].owner_id;

    if (actorId !== serverOwnerId) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    // 2. Do not allow self-kicking
    if (actorId === memberId) {
      return res.status(400).json({ message: 'You cannot kick yourself.' });
    }

    // 3. Remove user from server
    const deleteResult = await db.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, memberId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Member not found in this server.' });
    }

    // 4. Create Case Action
    const caseResult = await db.query(
      `INSERT INTO cases (server_id, case_type, target_id, moderator_id, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING case_id`,
      [serverId, 'kick', memberId, actorId, reason || 'No reason provided']
    );
    
    const newCase = caseResult.rows[0];

    // TODO: DM user and send log message via websocket when messaging is implemented

    res.status(200).json({
      message: `Successfully kicked member ${memberId}.`,
      case: newCase,
    });

  } catch (error) {
    console.error('Kick action error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Ban a member
// POST /servers/:serverId/members/:memberId/ban
router.post('/servers/:serverId/members/:memberId/ban', async (req, res) => {
  try {
    const { serverId, memberId } = req.params;
    const { reason } = req.body;
    const actorId = req.user.id; // From authMiddleware

    // 1. Permission Check (simplified: only server owner can ban)
    const serverResult = await db.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Server not found.' });
    }
    const serverOwnerId = serverResult.rows[0].owner_id;

    if (actorId !== serverOwnerId) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    // 2. Do not allow self-banning
    if (actorId === memberId) {
      return res.status(400).json({ message: 'You cannot ban yourself.' });
    }

    // 3. Add user to bans table
    await db.query(
      'INSERT INTO server_bans (server_id, user_id, reason) VALUES ($1, $2, $3) ON CONFLICT (server_id, user_id) DO NOTHING',
      [serverId, memberId, reason || 'No reason provided']
    );

    // 4. Remove user from server members table (if they are a member)
    await db.query(
      'DELETE FROM server_members WHERE server_id = $1 AND user_id = $2',
      [serverId, memberId]
    );

    // 5. Create Case Action
    const caseResult = await db.query(
      `INSERT INTO cases (server_id, case_type, target_id, moderator_id, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING case_id`,
      [serverId, 'ban', memberId, actorId, reason || 'No reason provided']
    );
    
    const newCase = caseResult.rows[0];

    // TODO: DM user and send log message via websocket when messaging is implemented

    res.status(200).json({
      message: `Successfully banned user ${memberId}.`,
      case: newCase,
    });

  } catch (error) {
    console.error('Ban action error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Unban a user
// DELETE /servers/:serverId/bans/:userId
router.delete('/servers/:serverId/bans/:userId', async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const actorId = req.user.id; // From authMiddleware

    // 1. Permission Check (simplified: only server owner can unban)
    const serverResult = await db.query('SELECT owner_id FROM servers WHERE id = $1', [serverId]);
    if (serverResult.rows.length === 0) {
      return res.status(404).json({ message: 'Server not found.' });
    }
    const serverOwnerId = serverResult.rows[0].owner_id;

    if (actorId !== serverOwnerId) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    // 2. Remove user from bans table
    const deleteResult = await db.query(
      'DELETE FROM server_bans WHERE server_id = $1 AND user_id = $2',
      [serverId, userId]
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Ban not found for this user on this server.' });
    }

    // 3. Create Case Action
    const caseResult = await db.query(
      `INSERT INTO cases (server_id, case_type, target_id, moderator_id, reason)
       VALUES ($1, $2, $3, $4, $5) RETURNING case_id`,
      [serverId, 'unban', userId, actorId, 'User unbanned']
    );
    
    const newCase = caseResult.rows[0];

    res.status(200).json({
      message: `Successfully unbanned user ${userId}.`,
      case: newCase,
    });

  } catch (error) {
    console.error('Unban action error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


module.exports = router;
