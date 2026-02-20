import jwt from 'jsonwebtoken';
import redis from '../config/redis.js';
import pool from '../config/database.js';

const channelSubscriptions = new Map();
const userConnections = new Map();

export function initGateway(wss) {
  wss.on('connection', async (ws) => {
    ws.isAlive = true;
    ws.subscriptions = new Set();
    ws.userId = null;
    ws.user = null;
    ws.voiceChannelId = null;

    ws.on('pong', () => { ws.isAlive = true; });
    ws.on('message', async (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }
      await handleMessage(ws, msg);
    });
    ws.on('close', () => handleClose(ws));
    ws.on('error', (err) => console.error('WS error:', err.message));
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => clearInterval(interval));
  console.log('WebSocket gateway initialized');
}

async function handleMessage(ws, msg) {
  const { type, data } = msg;
  switch (type) {
    case 'IDENTIFY': return handleIdentify(ws, data);
    case 'SUBSCRIBE': return handleSubscribe(ws, data);
    case 'UNSUBSCRIBE': return handleUnsubscribe(ws, data);
    case 'TYPING_START': return handleTyping(ws, data, true);
    case 'TYPING_STOP': return handleTyping(ws, data, false);
    case 'PRESENCE_UPDATE': return handlePresence(ws, data);
    case 'VOICE_JOIN': return handleVoiceJoin(ws, data);
    case 'VOICE_LEAVE': return handleVoiceLeave(ws, data);
    case 'VOICE_SIGNAL': return handleVoiceSignal(ws, data);
    case 'VOICE_STATE': return handleVoiceState(ws, data);
    case 'MUSIC_COMMAND': return handleMusicCommand(ws, data);
    default:
      ws.send(JSON.stringify({ type: 'ERROR', data: { message: 'Unknown event type' } }));
  }
}

async function handleIdentify(ws, data) {
  try {
    const payload = jwt.verify(data?.token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT id, username, display_name, avatar_url FROM users WHERE id=$1', [payload.userId]);
    if (!rows[0]) { ws.send(JSON.stringify({ type: 'ERROR', data: { message: 'User not found' } })); return ws.terminate(); }

    ws.userId = rows[0].id;
    ws.user = rows[0];
    userConnections.set(ws.userId, ws);

    await redis.setex(`presence:${ws.userId}`, 60, JSON.stringify({ status: 'online', userId: ws.userId }));
    ws.send(JSON.stringify({ type: 'READY', data: { user: rows[0] } }));
    broadcastPresence(ws.userId, { userId: ws.userId, status: 'online' });
  } catch {
    ws.send(JSON.stringify({ type: 'ERROR', data: { message: 'Invalid token' } }));
    ws.terminate();
  }
}

function handleSubscribe(ws, data) {
  if (!data) return;
  const { channelIds } = data;
  if (!Array.isArray(channelIds)) return;
  for (const channelId of channelIds) {
    ws.subscriptions.add(channelId);
    if (!channelSubscriptions.has(channelId)) channelSubscriptions.set(channelId, new Set());
    channelSubscriptions.get(channelId).add(ws);
  }
  ws.send(JSON.stringify({ type: 'SUBSCRIBED', data: { channelIds } }));
}

function handleUnsubscribe(ws, data) {
  const { channelIds } = data;
  if (!Array.isArray(channelIds)) return;
  for (const channelId of channelIds) {
    ws.subscriptions.delete(channelId);
    channelSubscriptions.get(channelId)?.delete(ws);
  }
}

async function handleTyping(ws, data, isTyping) {
  if (!ws.userId) return;
  const { channelId } = data;
  if (!channelId) return;
  broadcast(channelId, {
    type: isTyping ? 'TYPING_START' : 'TYPING_STOP',
    data: { channelId, userId: ws.userId, username: ws.user?.username }
  }, ws);
  if (isTyping) await redis.setex(`typing:${channelId}:${ws.userId}`, 8, '1');
  else await redis.del(`typing:${channelId}:${ws.userId}`);
}

async function handlePresence(ws, data) {
  if (!ws.userId) return;
  const { status } = data;
  await redis.setex(`presence:${ws.userId}`, 60, JSON.stringify({ status, userId: ws.userId }));
  broadcastPresence(ws.userId, { userId: ws.userId, status });
}

async function handleVoiceJoin(ws, data) {
  if (!ws.userId) return;
  const { channelId } = data;
  await redis.sadd(`voice:${channelId}`, ws.userId);
  const state = { userId: ws.userId, username: ws.user?.username, avatar_url: ws.user?.avatar_url, channelId, muted: false, deafened: false, streaming: false };
  await redis.setex(`voice_state:${channelId}:${ws.userId}`, 86400, JSON.stringify(state));
  ws.voiceChannelId = channelId;
  broadcast(channelId, { type: 'VOICE_JOIN', data: state }, null);
  const participants = await redis.smembers(`voice:${channelId}`);
  ws.send(JSON.stringify({ type: 'VOICE_PARTICIPANTS', data: { channelId, participants } }));
}

async function handleVoiceLeave(ws, data) {
  if (!ws.userId) return;
  const channelId = data?.channelId || ws.voiceChannelId;
  if (!channelId) return;
  await redis.srem(`voice:${channelId}`, ws.userId);
  await redis.del(`voice_state:${channelId}:${ws.userId}`);
  ws.voiceChannelId = null;
  broadcast(channelId, { type: 'VOICE_LEAVE', data: { userId: ws.userId, channelId } }, null);
}

function handleVoiceSignal(ws, data) {
  if (!ws.userId) return;
  const { targetUserId, signal, channelId } = data;
  const targetWs = userConnections.get(targetUserId);
  if (targetWs?.readyState === 1) {
    targetWs.send(JSON.stringify({ type: 'VOICE_SIGNAL', data: { fromUserId: ws.userId, signal, channelId } }));
  }
}

async function handleVoiceState(ws, data) {
  if (!ws.userId) return;
  const { channelId, muted, deafened, streaming } = data;
  const key = `voice_state:${channelId}:${ws.userId}`;
  const existing = await redis.get(key);
  if (!existing) return;
  const state = { ...JSON.parse(existing), muted, deafened, streaming };
  await redis.setex(key, 86400, JSON.stringify(state));
  broadcast(channelId, { type: 'VOICE_STATE_UPDATE', data: state }, ws);
}

async function handleMusicCommand(ws, data) {
  if (!ws.userId) return;
  const { serverId, channelId, command, payload } = data;
  const musicModule = await import('../services/music.js');
  const result = await musicModule.handleCommand(ws.userId, serverId, channelId, command, payload || {});
  ws.send(JSON.stringify({ type: 'MUSIC_RESULT', data: result }));
  if (result.queueUpdate) {
    broadcast(channelId, { type: 'MUSIC_QUEUE_UPDATE', data: { channelId, queue: result.queue, current: result.current } });
  }
}

async function handleClose(ws) {
  if (!ws.userId) return;
  userConnections.delete(ws.userId);
  for (const channelId of ws.subscriptions) channelSubscriptions.get(channelId)?.delete(ws);
  if (ws.voiceChannelId) {
    await redis.srem(`voice:${ws.voiceChannelId}`, ws.userId);
    await redis.del(`voice_state:${ws.voiceChannelId}:${ws.userId}`);
    broadcast(ws.voiceChannelId, { type: 'VOICE_LEAVE', data: { userId: ws.userId, channelId: ws.voiceChannelId } });
  }
  await redis.del(`presence:${ws.userId}`);
  broadcastPresence(ws.userId, { userId: ws.userId, status: 'offline' });
}

export function broadcast(channelId, message, excludeWs = null) {
  const subscribers = channelSubscriptions.get(channelId);
  if (!subscribers) return;
  const payload = JSON.stringify(message);
  for (const client of subscribers) {
    if (client !== excludeWs && client.readyState === 1) client.send(payload);
  }
}

export function sendToUser(userId, message) {
  const ws = userConnections.get(userId);
  if (ws?.readyState === 1) ws.send(JSON.stringify(message));
}

async function broadcastPresence(userId, presenceData) {
  try {
    const { rows } = await pool.query('SELECT server_id FROM server_members WHERE user_id=$1', [userId]);
    const payload = JSON.stringify({ type: 'PRESENCE_UPDATE', data: presenceData });
    for (const { server_id } of rows) {
      const ch = channelSubscriptions.get(`server:${server_id}`);
      if (ch) for (const client of ch) { if (client.readyState === 1) client.send(payload); }
    }
  } catch {}
}
