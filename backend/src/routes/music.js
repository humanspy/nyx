import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { hasPermission } from '../middleware/permissions.js';
import { getMusicConfig, updateMusicConfig, getQueue, getState, handleCommand, SUPPORTED_PLATFORMS } from '../services/music.js';

const router = Router();
router.use(requireAuth);

router.get('/platforms', (req, res) => {
  res.json(SUPPORTED_PLATFORMS.map(p => ({ id: p, name: p.charAt(0).toUpperCase() + p.slice(1), requiresApiKey: ['spotify'].includes(p) })));
});

router.get('/:serverId/config', async (req, res) => {
  res.json(await getMusicConfig(req.params.serverId));
});

router.patch('/:serverId/config', async (req, res) => {
  if (!await hasPermission(req.params.serverId, req.user.id, 'manage_server')) return res.status(403).json({ error: 'Missing permission' });
  const { enabledPlatforms, enabled, maxQueueSize, allowPlaylists, djRoleId } = req.body;
  if (enabledPlatforms) {
    const invalid = enabledPlatforms.filter(p => !SUPPORTED_PLATFORMS.includes(p));
    if (invalid.length) return res.status(400).json({ error: `Unsupported platforms: ${invalid.join(', ')}` });
  }
  const updated = await updateMusicConfig(req.params.serverId, { enabledPlatforms: enabledPlatforms||['youtube'], enabled: enabled!==undefined?enabled:true, maxQueueSize: maxQueueSize||200, allowPlaylists: allowPlaylists!==false, djRoleId: djRoleId||null });
  res.json(updated);
});

router.get('/:channelId/queue', async (req, res) => {
  const queue = await getQueue(req.params.channelId);
  const { state, current } = await getState(req.params.channelId);
  res.json({ queue, current, state });
});

router.post('/:channelId/command', async (req, res) => {
  const { command, payload, serverId } = req.body;
  if (!command || !serverId) return res.status(400).json({ error: 'command and serverId required' });
  res.json(await handleCommand(req.user.id, serverId, req.params.channelId, command, payload||{}));
});

export default router;
