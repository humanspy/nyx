-- Migration 006: email verification, password resets, reports, account standing,
--   channel/server/category mutes, automod, XP toggle per server, platform bans,
--   server template protection flags, role permissions overhaul

-- ─── Email verification ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at       TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_prompted_at TIMESTAMP WITH TIME ZONE;

-- ─── Password reset tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT NOT NULL UNIQUE,
  expires_at    TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at       TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── Platform bans (owner-level) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_bans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason        TEXT,
  banned_by     TEXT NOT NULL, -- admin identifier (username or 'system')
  banned_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at    TIMESTAMP WITH TIME ZONE, -- NULL = permanent
  UNIQUE (user_id)
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_banned_at TIMESTAMP WITH TIME ZONE;

-- ─── Account standing & reports ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS account_standing (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'good'
                  CHECK (status IN ('good', 'warning', 'restricted', 'suspended')),
  strike_count  INTEGER NOT NULL DEFAULT 0,
  notes         TEXT,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id     UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  report_type     TEXT NOT NULL CHECK (report_type IN ('user', 'message', 'server')),
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  target_msg_id   UUID REFERENCES messages(id) ON DELETE SET NULL,
  target_server_id UUID REFERENCES servers(id) ON DELETE SET NULL,
  category        TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open', 'reviewed', 'actioned', 'dismissed')),
  reviewed_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);
CREATE INDEX IF NOT EXISTS idx_reports_target_user ON reports (target_user_id);

-- ─── Mutes (users silencing channels / servers / categories locally) ──────────
CREATE TABLE IF NOT EXISTS user_mutes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mute_type     TEXT NOT NULL CHECK (mute_type IN ('channel', 'server', 'category')),
  target_id     UUID NOT NULL,
  muted_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, mute_type, target_id)
);

-- ─── AutoMod config per server ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS automod_config (
  server_id     UUID PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
  enabled       BOOLEAN NOT NULL DEFAULT false,
  blocked_words TEXT[] NOT NULL DEFAULT '{}',
  block_invites BOOLEAN NOT NULL DEFAULT false,
  block_links   BOOLEAN NOT NULL DEFAULT false,
  exempt_role_ids UUID[] NOT NULL DEFAULT '{}',
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── XP toggle per server ─────────────────────────────────────────────────────
ALTER TABLE servers ADD COLUMN IF NOT EXISTS xp_enabled BOOLEAN NOT NULL DEFAULT true;

-- ─── Protected channels (rules, announcements) ────────────────────────────────
ALTER TABLE channels ADD COLUMN IF NOT EXISTS protected BOOLEAN NOT NULL DEFAULT false;

-- ─── Role permissions (Discord-style bitfield stored as JSONB) ────────────────
ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';

-- ─── Channel-level permission overwrites ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS channel_permission_overwrites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('role', 'member')),
  target_id   UUID NOT NULL,
  allow       JSONB NOT NULL DEFAULT '{}',
  deny        JSONB NOT NULL DEFAULT '{}',
  UNIQUE (channel_id, target_type, target_id)
);

-- ─── Vanity URL minimum length now enforced by app (was already min 3 in route) ─
-- (no schema change needed; enforced in application layer)

-- ─── Occasional email prompt tracking (already on users table) ────────────────
-- email_verify_prompted_at added above
