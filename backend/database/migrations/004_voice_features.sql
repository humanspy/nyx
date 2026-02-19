-- ============================================================
-- 004: Tag uniqueness/5-char, channel user limits, ToS, ringtones
-- ============================================================

-- Increase tag column to 5 chars and enforce globally unique (case-insensitive)
ALTER TABLE servers ALTER COLUMN tag TYPE VARCHAR(5);

ALTER TABLE servers DROP CONSTRAINT IF EXISTS server_tag_length;
ALTER TABLE servers DROP CONSTRAINT IF EXISTS server_tag_alpha;

ALTER TABLE servers
  ADD CONSTRAINT server_tag_length CHECK (tag IS NULL OR (char_length(tag) >= 2 AND char_length(tag) <= 5)),
  ADD CONSTRAINT server_tag_alpha  CHECK (tag IS NULL OR tag ~ '^[A-Za-z]+$');

-- Globally unique tag (case-insensitive, NULLs are not unique so multiple NULL allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_servers_tag_unique ON servers (UPPER(tag)) WHERE tag IS NOT NULL;

-- Channel user limit: 0 = unlimited, 1-99 = cap
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS user_limit INTEGER NOT NULL DEFAULT 0
    CHECK (user_limit >= 0 AND user_limit <= 99);

-- Track ToS acceptance per user
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tos_accepted_at TIMESTAMP WITH TIME ZONE;

-- Custom ringtone stored as an encrypted media file
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS ringtone_file_id UUID REFERENCES media_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ringtone_name    TEXT;

-- Voice-text channel pairing (voice channels have a linked text channel)
ALTER TABLE channels
  ADD COLUMN IF NOT EXISTS paired_voice_channel_id UUID REFERENCES channels(id) ON DELETE CASCADE;
