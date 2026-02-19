import { Router } from 'express';
import pool from '../config/database.js';
import { optionalAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/vanity/:slug — resolve vanity URL to server + channel structure
router.get('/:slug', optionalAuth, async (req, res) => {
  const normalized = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (normalized.length < 3) return res.status(400).json({ error: 'Invalid vanity URL' });

  const { rows } = await pool.query(`
    SELECT s.id, s.name, s.description, s.icon_url, s.banner_url, s.member_count, s.vanity_url,
      (
        SELECT json_agg(
          jsonb_build_object('id', c.id, 'name', c.name, 'type', c.type, 'position', c.position,
            'category_id', c.category_id) ORDER BY c.position
        ) FROM channels c WHERE c.server_id = s.id AND c.is_dm = false
      ) AS channels,
      (
        SELECT json_agg(
          jsonb_build_object('id', cat.id, 'name', cat.name, 'position', cat.position) ORDER BY cat.position
        ) FROM categories cat WHERE cat.server_id = s.id
      ) AS categories
    FROM servers s WHERE s.vanity_url_normalized = $1
  `, [normalized]);

  if (!rows[0]) return res.status(404).json({ error: 'Server not found' });
  res.json(rows[0]);
});

// POST /api/vanity/check — availability check
router.post('/check', async (req, res) => {
  const { vanityUrl } = req.body;
  if (!vanityUrl) return res.status(400).json({ error: 'vanityUrl required' });
  const normalized = vanityUrl.toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (normalized.length < 3 || normalized.length > 32) {
    return res.status(400).json({ available: false, error: 'Must be 3-32 characters' });
  }
  const { rows } = await pool.query('SELECT 1 FROM servers WHERE vanity_url_normalized = $1', [normalized]);
  res.json({ available: !rows[0], normalized });
});

export default router;
