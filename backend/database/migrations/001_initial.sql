-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- USERS & AUTHENTICATION
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(32) NOT NULL UNIQUE,
    display_name VARCHAR(64),
    email VARCHAR(255) UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    banner_url TEXT,
    bio_encrypted TEXT,
    is_bot BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_keys (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key_type VARCHAR(20) NOT NULL,
    public_key TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, key_type, key_version)
);

CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    accent_color VARCHAR(7) DEFAULT '#7c6aff',
    accent_gradient JSONB,
    background_type VARCHAR(20) DEFAULT 'solid',
    background_value TEXT DEFAULT '#0f0f17',
    sidebar_color TEXT DEFAULT '#12121c',
    chat_bg_color TEXT DEFAULT '#0f0f17',
    font_size INTEGER DEFAULT 14,
    message_spacing VARCHAR(10) DEFAULT 'cozy',
    compact_mode BOOLEAN DEFAULT false,
    indicator_x INTEGER DEFAULT 16,
    indicator_y INTEGER DEFAULT NULL,
    indicator_anchor VARCHAR(20) DEFAULT 'bottom-left',
    panel_widths JSONB DEFAULT '{"serverList":72,"channelList":240,"userList":240}',
    show_user_list BOOLEAN DEFAULT true,
    show_timestamps BOOLEAN DEFAULT true,
    custom_css TEXT,
    prefs_encrypted TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SERVERS (GUILDS)
-- ============================================

CREATE TABLE IF NOT EXISTS servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    icon_url TEXT,
    banner_url TEXT,
    owner_id UUID NOT NULL REFERENCES users(id),
    vanity_url VARCHAR(32) UNIQUE,
    vanity_url_normalized VARCHAR(32) UNIQUE,
    member_count INTEGER DEFAULT 0,
    features JSONB DEFAULT '{}',
    music_config JSONB DEFAULT '{"enabled":true,"enabledPlatforms":["youtube"],"maxQueueSize":200,"allowPlaylists":true}',
    verification_level INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT vanity_url_format CHECK (
        vanity_url_normalized IS NULL OR
        vanity_url_normalized ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
    )
);

CREATE INDEX IF NOT EXISTS idx_servers_vanity ON servers(vanity_url_normalized);
CREATE INDEX IF NOT EXISTS idx_servers_owner ON servers(owner_id);

-- ============================================
-- ROLES
-- ============================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#99aab5',
    color_gradient JSONB,
    icon_url TEXT,
    icon_emoji VARCHAR(64),
    hoist BOOLEAN DEFAULT false,
    mentionable BOOLEAN DEFAULT false,
    position INTEGER DEFAULT 0,
    permissions JSONB DEFAULT '{}',
    xp_per_message INTEGER DEFAULT NULL,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roles_server ON roles(server_id, position);

-- ============================================
-- SERVER MEMBERS
-- ============================================

CREATE TABLE IF NOT EXISTS server_members (
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    nickname VARCHAR(32),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    timed_out_until TIMESTAMPTZ,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    PRIMARY KEY (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_server_members_user ON server_members(user_id);

CREATE TABLE IF NOT EXISTS member_roles (
    server_id UUID NOT NULL,
    user_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id, role_id),
    FOREIGN KEY (server_id, user_id) REFERENCES server_members(server_id, user_id) ON DELETE CASCADE
);

-- ============================================
-- CATEGORIES & CHANNELS
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID REFERENCES servers(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL,
    topic TEXT,
    position INTEGER DEFAULT 0,
    forum_tags JSONB DEFAULT '[]',
    bitrate INTEGER DEFAULT 64000,
    user_limit INTEGER DEFAULT 0,
    is_dm BOOLEAN DEFAULT false,
    slowmode_seconds INTEGER DEFAULT 0,
    nsfw BOOLEAN DEFAULT false,
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_channels_server ON channels(server_id, position);
CREATE INDEX IF NOT EXISTS idx_channels_type ON channels(type);

CREATE TABLE IF NOT EXISTS channel_overwrites (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type VARCHAR(10) NOT NULL,
    allow_permissions JSONB DEFAULT '{}',
    deny_permissions JSONB DEFAULT '{}',
    PRIMARY KEY (channel_id, target_id)
);

CREATE TABLE IF NOT EXISTS channel_members (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID,
    PRIMARY KEY (channel_id, user_id)
);

-- ============================================
-- E2E ENCRYPTION KEYS
-- ============================================

CREATE TABLE IF NOT EXISTS channel_keys (
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    encrypted_key TEXT NOT NULL,
    key_nonce TEXT NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (channel_id, user_id, key_version)
);

-- ============================================
-- MESSAGES
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    encrypted_payload TEXT,
    iv TEXT,
    key_version INTEGER DEFAULT 1,
    message_type VARCHAR(20) DEFAULT 'text',
    thread_id UUID REFERENCES messages(id),
    parent_id UUID REFERENCES messages(id),
    edited_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT false,
    deletion_proof TEXT,
    deletion_timestamp TIMESTAMPTZ,
    attachment_metadata JSONB,
    mentions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON messages(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

CREATE TABLE IF NOT EXISTS message_edit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    encrypted_payload TEXT NOT NULL,
    iv TEXT NOT NULL,
    edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FORUM THREADS
-- ============================================

CREATE TABLE IF NOT EXISTS forum_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id),
    title_encrypted TEXT NOT NULL,
    title_iv TEXT NOT NULL,
    tags JSONB DEFAULT '[]',
    locked BOOLEAN DEFAULT false,
    pinned BOOLEAN DEFAULT false,
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threads_channel ON forum_threads(channel_id, last_message_at DESC);

-- ============================================
-- MEDIA FILES
-- ============================================

CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id UUID NOT NULL REFERENCES users(id),
    s3_key TEXT NOT NULL,
    s3_bucket TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    upload_status VARCHAR(20) DEFAULT 'pending',
    chunk_count INTEGER DEFAULT 1,
    chunks_uploaded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CUSTOM EMOJIS & STICKERS
-- ============================================

CREATE TABLE IF NOT EXISTS custom_emojis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    s3_key TEXT NOT NULL,
    creator_id UUID REFERENCES users(id),
    animated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (server_id, name)
);

CREATE TABLE IF NOT EXISTS custom_stickers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    description TEXT,
    s3_key TEXT NOT NULL,
    creator_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (server_id, name)
);

-- ============================================
-- MODERATION SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    case_number INTEGER NOT NULL,
    user_id UUID NOT NULL,
    username VARCHAR(100) NOT NULL,
    type VARCHAR(32) NOT NULL,
    moderator_id UUID NOT NULL,
    moderator_name VARCHAR(100) NOT NULL,
    reason TEXT,
    severity VARCHAR(32),
    duration VARCHAR(32),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (server_id, case_number)
);

CREATE INDEX IF NOT EXISTS idx_cases_server ON cases(server_id, case_number);
CREATE INDEX IF NOT EXISTS idx_cases_user ON cases(server_id, user_id);

CREATE TABLE IF NOT EXISTS staff_config (
    server_id UUID PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    staff_roles_json JSONB DEFAULT '[]',
    channels_json JSONB DEFAULT '{}',
    override_code VARCHAR(64),
    override_regen_hours INTEGER DEFAULT 24,
    override_generated_at TIMESTAMPTZ,
    staffwarn_config_json JSONB DEFAULT '{"maxWarns":3,"action":"demote"}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staff_warns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL,
    staff_tag VARCHAR(100) NOT NULL,
    moderator_id UUID NOT NULL,
    moderator_tag VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year')
);

CREATE INDEX IF NOT EXISTS idx_staff_warns_server_staff ON staff_warns(server_id, staff_id);

CREATE TABLE IF NOT EXISTS bans (
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    moderator_id UUID,
    reason TEXT,
    banned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);

-- ============================================
-- LEVEL / XP SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS level_config (
    server_id UUID PRIMARY KEY REFERENCES servers(id) ON DELETE CASCADE,
    default_xp_per_message INTEGER DEFAULT 10,
    interval_value INTEGER DEFAULT 5,
    remove_previous BOOLEAN DEFAULT false,
    level_roles_json JSONB DEFAULT '{}',
    xp_cooldown_seconds INTEGER DEFAULT 60,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    actor_id UUID REFERENCES users(id),
    actor_name VARCHAR(100),
    target_id UUID,
    target_name VARCHAR(100),
    target_type VARCHAR(20),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    case_id UUID REFERENCES cases(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_server ON audit_log(server_id, created_at DESC);

-- ============================================
-- SERVER INVITES
-- ============================================

CREATE TABLE IF NOT EXISTS server_invites (
    code VARCHAR(10) PRIMARY KEY,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id),
    creator_id UUID REFERENCES users(id),
    max_uses INTEGER DEFAULT NULL,
    uses INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER servers_updated_at BEFORE UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER channels_updated_at BEFORE UPDATE ON channels FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON user_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION normalize_vanity_url()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.vanity_url IS NOT NULL THEN
    NEW.vanity_url_normalized := lower(regexp_replace(NEW.vanity_url, '[^a-zA-Z0-9-]', '', 'g'));
    IF length(NEW.vanity_url_normalized) < 3 THEN
      RAISE EXCEPTION 'Vanity URL must be at least 3 characters';
    END IF;
  ELSE
    NEW.vanity_url_normalized := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER servers_normalize_vanity BEFORE INSERT OR UPDATE ON servers FOR EACH ROW EXECUTE FUNCTION normalize_vanity_url();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION get_next_case_number(p_server_id UUID)
RETURNS INTEGER AS $$
DECLARE next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(case_number), 0) + 1 INTO next_num
  FROM cases WHERE server_id = p_server_id;
  RETURN next_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_server_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE servers SET member_count = member_count + 1 WHERE id = NEW.server_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE servers SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.server_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER member_count_insert AFTER INSERT ON server_members FOR EACH ROW EXECUTE FUNCTION update_server_member_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TRIGGER member_count_delete AFTER DELETE ON server_members FOR EACH ROW EXECUTE FUNCTION update_server_member_count();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
