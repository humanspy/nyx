import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

const REPORT_CATEGORIES = {
  user:    ['harassment', 'spam', 'hate_speech', 'impersonation', 'self_harm', 'csam', 'other'],
  message: ['harassment', 'spam', 'hate_speech', 'misinformation', 'illegal_content', 'csam', 'other'],
  server:  ['spam', 'hate_speech', 'illegal_content', 'scam', 'csam', 'other'],
};

// POST /api/reports
router.post('/', async (req, res) => {
  const { reportType, targetUserId, targetMessageId, targetServerId, category, description } = req.body;
  if (!reportType || !REPORT_CATEGORIES[reportType]) return res.status(400).json({ error: 'Invalid report type' });
  if (!REPORT_CATEGORIES[reportType].includes(category)) return res.status(400).json({ error: 'Invalid category for this report type' });

  // Prevent self-reports
  if (targetUserId === req.user.id) return res.status(400).json({ error: 'Cannot report yourself' });

  // Rate-limit: max 5 reports per hour per user
  const { rows: recent } = await pool.query(
    "SELECT COUNT(*) FROM reports WHERE reporter_id = $1 AND created_at > NOW() - INTERVAL '1 hour'",
    [req.user.id]
  );
  if (parseInt(recent[0].count) >= 5) return res.status(429).json({ error: 'Too many reports. Please wait before submitting another.' });

  const { rows } = await pool.query(`
    INSERT INTO reports (reporter_id, report_type, target_user_id, target_msg_id, target_server_id, category, description)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, created_at
  `, [req.user.id, reportType, targetUserId || null, targetMessageId || null, targetServerId || null, category, description || null]);

  res.status(201).json({ ok: true, reportId: rows[0].id });
});

// GET /api/reports/categories — returns valid categories for the frontend
router.get('/categories', (req, res) => {
  res.json(REPORT_CATEGORIES);
});

// GET /api/reports/standing — get own account standing
router.get('/standing', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM account_standing WHERE user_id = $1',
    [req.user.id]
  );
  res.json(rows[0] || { status: 'good', strike_count: 0 });
});

export default router;
