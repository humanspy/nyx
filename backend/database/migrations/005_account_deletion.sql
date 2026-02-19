-- Migration 005: account deletion (3-day grace period) + mandatory email

-- Schedule deletion timestamp; NULL = account is active
ALTER TABLE users ADD COLUMN IF NOT EXISTS deletion_scheduled_at TIMESTAMP WITH TIME ZONE;

-- Make email mandatory going forward (existing NULL rows unaffected by the column change)
-- The application layer enforces the requirement; we just add the index for lookup
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users (LOWER(email)) WHERE email IS NOT NULL;
