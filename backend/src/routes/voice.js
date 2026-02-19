import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import redis from '../config/redis.js';

const router = Router();
router.use(requireAuth);

router.get('/:channelId/participants', async (req, res) => {
  const participants = await redis.smembers(`voice:${req.params.channelId}`);
  const data = [];
  for (const userId of participants) {
    const state = await redis.get(`voice_state:${req.params.channelId}:${userId}`);
    if (state) data.push(JSON.parse(state));
  }
  res.json(data);
});

export default router;
