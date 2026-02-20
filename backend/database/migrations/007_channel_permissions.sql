-- Channel permission overrides (per-role or per-member)
CREATE TABLE IF NOT EXISTS channel_permission_overrides (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('role', 'member')),
    target_id UUID NOT NULL,
    allow_bits BIGINT NOT NULL DEFAULT 0,
    deny_bits  BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_cpo_channel ON channel_permission_overrides(channel_id);
