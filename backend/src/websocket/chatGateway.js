/**
 * Socket.io /chat namespace gateway
 * Bridges the Discord-Frontend's Socket.io DM system to the nyx PostgreSQL backend.
 *
 * Events received from frontend:
 *   join          { userId: username }
 *   sendDM        { from, to, content, continued? }
 *   roomJoin      { roomId }
 *   chatMessage   { roomId, userId, content, continued? }
 *   getChatHistory { roomId }
 *
 * Events emitted to frontend:
 *   roomHistory   { message: Message[] }
 *   receiveDM     { from, content, timestamp, continued, channelId }
 *   newMessage    { senderId, content, createdAt, continued }
 *   userJoined    { userId, roomId }
 *   chatHistory   { messages, roomId }
 */
import { Server } from 'socket.io';
import pool from '../config/database.js';

// username → socketId (in-memory presence map)
const userSockets = new Map();

async function getOrCreateDmChannel(userId1, userId2) {
  const { rows: existing } = await pool.query(`
    SELECT c.id FROM channels c
    JOIN channel_members cm1 ON cm1.channel_id = c.id AND cm1.user_id = $1
    JOIN channel_members cm2 ON cm2.channel_id = c.id AND cm2.user_id = $2
    WHERE c.type = 'dm' AND c.is_dm = true
  `, [userId1, userId2]);

  if (existing[0]) return existing[0].id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      "INSERT INTO channels (name, type, is_dm) VALUES ($1, 'dm', true) RETURNING id",
      [`dm-${userId1}-${userId2}`]
    );
    const channelId = rows[0].id;
    await client.query(
      'INSERT INTO channel_members (channel_id, user_id) VALUES ($1, $2), ($1, $3)',
      [channelId, userId1, userId2]
    );
    await client.query('COMMIT');
    return channelId;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function fetchMessages(channelId) {
  const { rows } = await pool.query(`
    SELECT m.encrypted_payload, m.message_type, m.created_at, u.username
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.channel_id = $1 AND (m.deleted IS NULL OR m.deleted = false)
    ORDER BY m.created_at ASC LIMIT 50
  `, [channelId]);
  return rows.map(r => ({
    senderId: r.username,
    content: r.encrypted_payload || '',
    createdAt: r.created_at,
    continued: r.message_type === 'dm_continued',
  }));
}

async function insertMessage(channelId, senderId, content, continued) {
  const messageType = continued ? 'dm_continued' : 'text';
  const { rows: [msg] } = await pool.query(`
    INSERT INTO messages (channel_id, sender_id, encrypted_payload, iv, key_version, message_type, mentions)
    VALUES ($1, $2, $3, 'compat', 1, $4, '[]')
    RETURNING id, created_at
  `, [channelId, senderId, content, messageType]);
  await pool.query('UPDATE channels SET updated_at = NOW() WHERE id = $1', [channelId]);
  return msg;
}

export function initChatGateway(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const chat = io.of('/chat');

  chat.on('connection', (socket) => {
    console.log('[chat] Connected:', socket.id);

    // join { userId: username }
    socket.on('join', ({ userId }) => {
      if (!userId) return;
      userSockets.set(userId, socket.id);
      socket.data.username = userId;
      console.log(`[chat] join: ${userId}`);
    });

    // sendDM { from: username, to: username, content, continued? }
    socket.on('sendDM', async ({ from, to, content, continued }) => {
      if (!from || !to || !content?.trim()) return;
      try {
        const { rows: users } = await pool.query(
          'SELECT id, username FROM users WHERE username = ANY($1)',
          [[from, to]]
        );
        const fromUser = users.find(u => u.username === from);
        const toUser   = users.find(u => u.username === to);
        if (!fromUser || !toUser) return;

        const channelId = await getOrCreateDmChannel(fromUser.id, toUser.id);
        const msg = await insertMessage(channelId, fromUser.id, content.trim(), !!continued);

        const payload = {
          from,
          content: content.trim(),
          timestamp: msg.created_at,
          continued: !!continued,
          channelId,
        };

        // Deliver to recipient if online
        const recipientSocketId = userSockets.get(to);
        if (recipientSocketId) {
          chat.to(recipientSocketId).emit('receiveDM', payload);
        }
        // Echo back to sender
        socket.emit('receiveDM', payload);
      } catch (err) {
        console.error('[chat] sendDM error:', err);
      }
    });

    // roomJoin { roomId }
    socket.on('roomJoin', async ({ roomId }) => {
      socket.join(roomId);
      try {
        const messages = await fetchMessages(roomId);
        socket.emit('roomHistory', { message: messages });
        chat.to(roomId).emit('userJoined', { userId: socket.data.username, roomId });
      } catch (err) {
        console.error('[chat] roomJoin error:', err);
      }
    });

    // chatMessage { roomId, userId: username, content, continued? }
    socket.on('chatMessage', async ({ roomId, userId, content, continued }) => {
      if (!roomId || !content?.trim()) return;
      try {
        const { rows: [user] } = await pool.query(
          'SELECT id FROM users WHERE username = $1',
          [userId]
        );
        if (!user) return;

        const msg = await insertMessage(roomId, user.id, content.trim(), !!continued);
        chat.to(roomId).emit('newMessage', {
          senderId: userId,
          content: content.trim(),
          createdAt: msg.created_at,
          continued: !!continued,
        });
      } catch (err) {
        console.error('[chat] chatMessage error:', err);
      }
    });

    // getChatHistory { roomId }
    socket.on('getChatHistory', async ({ roomId }) => {
      try {
        const messages = await fetchMessages(roomId);
        socket.emit('chatHistory', { messages, roomId });
      } catch (err) {
        console.error('[chat] getChatHistory error:', err);
      }
    });

    socket.on('disconnect', () => {
      const username = socket.data.username;
      if (username && userSockets.get(username) === socket.id) {
        userSockets.delete(username);
      }
      console.log('[chat] Disconnected:', socket.id);
    });
  });

  return io;
}
