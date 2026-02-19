import { Router } from 'express';
import pool from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

// Background cleanup: hard-delete accounts whose 3-day grace period has expired
async function purgeExpiredAccounts() {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE deletion_scheduled_at IS NOT NULL AND deletion_scheduled_at <= NOW()'
    );
    for (const { id } of rows) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('DELETE FROM messages WHERE sender_id = $1', [id]);
        await client.query('DELETE FROM server_members WHERE user_id = $1', [id]);
        await client.query('DELETE FROM channel_members WHERE user_id = $1', [id]);
        await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [id]);
        await client.query('DELETE FROM user_keys WHERE user_id = $1', [id]);
        await client.query('DELETE FROM user_settings WHERE user_id = $1', [id]);
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        await client.query('COMMIT');
        console.log(`[purge] Deleted account ${id}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[purge] Failed to delete account ${id}:`, err.message);
      } finally {
        client.release();
      }
    }
  } catch (err) {
    console.error('[purge] Error checking expired accounts:', err.message);
  }
}

// Run on startup and every hour
purgeExpiredAccounts();
setInterval(purgeExpiredAccounts, 60 * 60 * 1000);

router.get('/me', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, display_name, avatar_url, banner_url, created_at, deletion_scheduled_at FROM users WHERE id = $1',
    [req.user.id]
  );
  res.json(rows[0]);
});

router.get('/me/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM user_settings WHERE user_id = $1', [req.user.id]);
  res.json(rows[0] || {});
});

router.patch('/me/settings', async (req, res) => {
  const s = req.body;
  const { rows } = await pool.query(`
    INSERT INTO user_settings (user_id, theme, accent_color, accent_gradient, background_type, background_value,
      sidebar_color, chat_bg_color, font_size, message_spacing, compact_mode,
      indicator_x, indicator_y, indicator_anchor, panel_widths, show_user_list, show_timestamps, custom_css)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
    ON CONFLICT (user_id) DO UPDATE SET
      theme = COALESCE(EXCLUDED.theme, user_settings.theme),
      accent_color = COALESCE(EXCLUDED.accent_color, user_settings.accent_color),
      accent_gradient = COALESCE(EXCLUDED.accent_gradient, user_settings.accent_gradient),
      background_type = COALESCE(EXCLUDED.background_type, user_settings.background_type),
      background_value = COALESCE(EXCLUDED.background_value, user_settings.background_value),
      sidebar_color = COALESCE(EXCLUDED.sidebar_color, user_settings.sidebar_color),
      chat_bg_color = COALESCE(EXCLUDED.chat_bg_color, user_settings.chat_bg_color),
      font_size = COALESCE(EXCLUDED.font_size, user_settings.font_size),
      message_spacing = COALESCE(EXCLUDED.message_spacing, user_settings.message_spacing),
      compact_mode = COALESCE(EXCLUDED.compact_mode, user_settings.compact_mode),
      indicator_x = COALESCE(EXCLUDED.indicator_x, user_settings.indicator_x),
      indicator_y = EXCLUDED.indicator_y,
      indicator_anchor = COALESCE(EXCLUDED.indicator_anchor, user_settings.indicator_anchor),
      panel_widths = COALESCE(EXCLUDED.panel_widths, user_settings.panel_widths),
      show_user_list = COALESCE(EXCLUDED.show_user_list, user_settings.show_user_list),
      show_timestamps = COALESCE(EXCLUDED.show_timestamps, user_settings.show_timestamps),
      custom_css = EXCLUDED.custom_css,
      updated_at = NOW()
    RETURNING *
  `, [req.user.id, s.theme, s.accentColor, s.accentGradient ? JSON.stringify(s.accentGradient) : null,
      s.backgroundType, s.backgroundValue, s.sidebarColor, s.chatBgColor,
      s.fontSize, s.messageSpacing, s.compactMode ?? false,
      s.indicatorX ?? 16, s.indicatorY ?? null, s.indicatorAnchor ?? 'bottom-left',
      s.panelWidths ? JSON.stringify(s.panelWidths) : null,
      s.showUserList ?? true, s.showTimestamps ?? true, s.customCss ?? null]);
  res.json(rows[0]);
});

router.patch('/me', async (req, res) => {
  const { displayName, avatarUrl, bannerUrl, bioEncrypted } = req.body;
  const { rows } = await pool.query(`
    UPDATE users SET
      display_name = COALESCE($1, display_name),
      avatar_url = COALESCE($2, avatar_url),
      banner_url = COALESCE($3, banner_url),
      bio_encrypted = COALESCE($4, bio_encrypted),
      updated_at = NOW()
    WHERE id = $5 RETURNING id, username, display_name, avatar_url, banner_url
  `, [displayName, avatarUrl, bannerUrl, bioEncrypted, req.user.id]);
  res.json(rows[0]);
});

// DELETE /api/users/me — schedule account for deletion after 3 days
router.delete('/me', async (req, res) => {
  const { rows } = await pool.query(
    "UPDATE users SET deletion_scheduled_at = NOW() + INTERVAL '3 days' WHERE id = $1 RETURNING deletion_scheduled_at",
    [req.user.id]
  );
  // Revoke all sessions so they are logged out immediately
  await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
  res.json({ deletion_scheduled_at: rows[0].deletion_scheduled_at });
});

// POST /api/users/me/reactivate — cancel a pending deletion
router.post('/me/reactivate', async (req, res) => {
  const { rows } = await pool.query(
    'UPDATE users SET deletion_scheduled_at = NULL WHERE id = $1 AND deletion_scheduled_at IS NOT NULL RETURNING id',
    [req.user.id]
  );
  if (!rows[0]) return res.status(400).json({ error: 'No pending deletion found' });
  res.json({ ok: true });
});

router.get('/:userId', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, username, display_name, avatar_url, banner_url, created_at FROM users WHERE id = $1',
    [req.params.userId]
  );
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json(rows[0]);
});

router.get('/:userId/keys', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT key_type, public_key, key_version FROM user_keys WHERE user_id = $1 ORDER BY key_version DESC',
    [req.params.userId]
  );
  res.json(rows);
});

router.get('/me/dms', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT c.id, c.type, c.name, c.updated_at,
      json_agg(jsonb_build_object('id', u.id, 'username', u.username, 'avatar_url', u.avatar_url)) AS participants
    FROM channels c
    JOIN channel_members cm ON cm.channel_id = c.id AND cm.user_id = $1
    JOIN channel_members cm2 ON cm2.channel_id = c.id
    JOIN users u ON u.id = cm2.user_id
    WHERE c.is_dm = true
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `, [req.user.id]);
  res.json(rows);
});

export default router;
