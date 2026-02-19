/**
 * Music Service — per-channel queues in Redis
 * Commands: PLAY, PAUSE, STOP, SKIP, PREVIOUS, SHUFFLE, LOOP, AUTOPLAY,
 *           QUEUE_LIST, QUEUE_CLEAR, NOW_PLAYING
 * Supports: youtube, soundcloud, spotify, twitch (configurable per server)
 */
import redis from '../config/redis.js';
import pool from '../config/database.js';

export const SUPPORTED_PLATFORMS = ['youtube', 'soundcloud', 'spotify', 'twitch'];

const queueKey   = (c) => `music:queue:${c}`;
const stateKey   = (c) => `music:state:${c}`;
const currentKey = (c) => `music:current:${c}`;
const historyKey = (c) => `music:history:${c}`;

export async function getMusicConfig(serverId) {
  const { rows } = await pool.query('SELECT music_config FROM servers WHERE id=$1', [serverId]);
  return rows[0]?.music_config || { enabled: true, enabledPlatforms: ['youtube'], maxQueueSize: 200, allowPlaylists: true };
}

export async function updateMusicConfig(serverId, config) {
  const { rows } = await pool.query(
    'UPDATE servers SET music_config=$1 WHERE id=$2 RETURNING music_config',
    [JSON.stringify(config), serverId]
  );
  return rows[0]?.music_config;
}

export async function getQueue(channelId) {
  const items = await redis.lrange(queueKey(channelId), 0, -1);
  return items.map(i => JSON.parse(i));
}

export async function getState(channelId) {
  const [stateStr, currentStr] = await Promise.all([redis.get(stateKey(channelId)), redis.get(currentKey(channelId))]);
  return {
    state: stateStr ? JSON.parse(stateStr) : { playing: false, paused: false, loop: 'off', autoplay: false },
    current: currentStr ? JSON.parse(currentStr) : null,
  };
}

export async function enqueue(channelId, tracks, requestedBy) {
  if (!Array.isArray(tracks)) tracks = [tracks];
  const pipeline = redis.pipeline();
  for (const track of tracks) pipeline.rpush(queueKey(channelId), JSON.stringify({ ...track, requestedBy, addedAt: Date.now() }));
  await pipeline.exec();
  await redis.expire(queueKey(channelId), 86400);
}

export async function dequeue(channelId) {
  const item = await redis.lpop(queueKey(channelId));
  if (!item) return null;
  const track = JSON.parse(item);
  await redis.lpush(historyKey(channelId), JSON.stringify(track));
  await redis.ltrim(historyKey(channelId), 0, 49);
  await redis.expire(historyKey(channelId), 86400);
  return track;
}

export async function getPrevious(channelId) {
  const item = await redis.lindex(historyKey(channelId), 0);
  return item ? JSON.parse(item) : null;
}

export async function clearQueue(channelId) {
  await redis.del(queueKey(channelId));
}

export async function shuffleQueue(channelId) {
  const items = await redis.lrange(queueKey(channelId), 0, -1);
  if (items.length <= 1) return;
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  const pipeline = redis.pipeline();
  pipeline.del(queueKey(channelId));
  for (const item of items) pipeline.rpush(queueKey(channelId), item);
  await pipeline.exec();
  await redis.expire(queueKey(channelId), 86400);
}

export async function setState(channelId, updates) {
  const { state } = await getState(channelId);
  const newState = { ...state, ...updates };
  await redis.setex(stateKey(channelId), 86400, JSON.stringify(newState));
  return newState;
}

export async function setCurrent(channelId, track) {
  if (!track) await redis.del(currentKey(channelId));
  else await redis.setex(currentKey(channelId), 86400, JSON.stringify({ ...track, startedAt: Date.now() }));
}

export async function stopPlayback(channelId) {
  await Promise.all([redis.del(stateKey(channelId)), redis.del(currentKey(channelId)), redis.del(queueKey(channelId))]);
}

function detectPlatform(url) {
  if (!url || !url.startsWith('http')) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('twitch.tv')) return 'twitch';
  return null;
}

export async function resolveTrack(query, allowedPlatforms = ['youtube']) {
  const platform = detectPlatform(query);
  if (platform && !allowedPlatforms.includes(platform)) throw new Error(`Platform '${platform}' is not enabled`);
  return { title: query.length > 60 ? query.slice(0, 60) + '…' : query, url: query, duration: 0, thumbnail: null, platform: platform || 'youtube', artist: null };
}

export async function handleCommand(userId, serverId, channelId, command, payload = {}) {
  const config = await getMusicConfig(serverId);
  if (!config.enabled) return { error: 'Music is disabled for this server' };
  const { state, current } = await getState(channelId);

  switch (command) {
    case 'PLAY': {
      const q = payload.url || payload.query;
      if (!q) return { error: 'No track specified' };
      try {
        const track = await resolveTrack(q, config.enabledPlatforms || ['youtube']);
        await enqueue(channelId, [track], userId);
        if (!state.playing) {
          const first = await dequeue(channelId);
          await setCurrent(channelId, first);
          await setState(channelId, { playing: true, paused: false });
          return { ok: true, action: 'playing', track: first, queueUpdate: true, queue: await getQueue(channelId), current: first };
        }
        return { ok: true, action: 'queued', queueUpdate: true, queue: await getQueue(channelId), current };
      } catch (err) { return { error: err.message }; }
    }
    case 'PAUSE': {
      await setState(channelId, { paused: !state.paused });
      return { ok: true, action: state.paused ? 'resumed' : 'paused', queueUpdate: false };
    }
    case 'STOP': {
      await stopPlayback(channelId);
      return { ok: true, action: 'stopped', queueUpdate: true, queue: [], current: null };
    }
    case 'SKIP': {
      const next = await dequeue(channelId);
      if (!next) {
        await setCurrent(channelId, null);
        await setState(channelId, { playing: false });
        return { ok: true, action: 'queue_ended', current: null, queueUpdate: true, queue: [] };
      }
      await setCurrent(channelId, next);
      return { ok: true, action: 'skipped', current: next, queueUpdate: true, queue: await getQueue(channelId), current: next };
    }
    case 'PREVIOUS': {
      const prev = await getPrevious(channelId);
      if (!prev) return { error: 'No previous track' };
      if (current) await enqueue(channelId, [current], userId);
      await setCurrent(channelId, prev);
      return { ok: true, action: 'previous', current: prev, queueUpdate: true, queue: await getQueue(channelId), current: prev };
    }
    case 'SHUFFLE': {
      await shuffleQueue(channelId);
      return { ok: true, action: 'shuffled', queueUpdate: true, queue: await getQueue(channelId), current };
    }
    case 'LOOP': {
      const modes = ['off', 'track', 'queue'];
      const next = modes[(modes.indexOf(state.loop || 'off') + 1) % modes.length];
      await setState(channelId, { loop: next });
      return { ok: true, action: `loop_${next}`, queueUpdate: false };
    }
    case 'AUTOPLAY': {
      await setState(channelId, { autoplay: !state.autoplay });
      return { ok: true, action: state.autoplay ? 'autoplay_off' : 'autoplay_on', queueUpdate: false };
    }
    case 'QUEUE_LIST': return { ok: true, queue: await getQueue(channelId), current, state };
    case 'QUEUE_CLEAR': {
      await clearQueue(channelId);
      return { ok: true, action: 'queue_cleared', queueUpdate: true, queue: [], current };
    }
    case 'NOW_PLAYING': return { ok: true, current, state };
    default: return { error: `Unknown command: ${command}` };
  }
}
