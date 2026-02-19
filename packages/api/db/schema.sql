-- PostgreSQL Schema for the Privacy-First Chat Platform

-- Extension for generating UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table to store basic user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(32) NOT NULL UNIQUE,
    discriminator VARCHAR(4) NOT NULL, -- To distinguish users with the same username
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_picture_url TEXT,
    banner_url TEXT
);

-- Servers (Guilds) table
CREATE TABLE servers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    profile_picture_url TEXT,
    banner_url TEXT,
    vanity_url VARCHAR(32) UNIQUE, -- Globally unique vanity URL
    description TEXT
);

-- Index for faster vanity_url lookups
CREATE UNIQUE INDEX vanity_url_idx ON servers (lower(vanity_url));

-- Channel types: 'text', 'voice', 'video', 'forum'
CREATE TYPE channel_type AS ENUM ('text', 'voice', 'video', 'forum');

-- Channels table
CREATE TABLE channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type channel_type NOT NULL,
    category_id UUID REFERENCES channels(id), -- For grouping channels under a category
    position INT, -- For ordering channels
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server members table (join table for users and servers)
CREATE TABLE server_members (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    nickname VARCHAR(32),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, server_id)
);

-- Roles table for server-specific permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    name VARCHAR(32) NOT NULL,
    permissions BIGINT NOT NULL DEFAULT 0,
    color INT,
    is_hoisted BOOLEAN DEFAULT FALSE,
    position INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Member roles (join table for members and roles)
CREATE TABLE member_roles (
    user_id UUID NOT NULL,
    server_id UUID NOT NULL,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, server_id) REFERENCES server_members(user_id, server_id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, server_id, role_id)
);

-- Messages table to store encrypted message metadata
-- The actual message content is end-to-end encrypted and stored elsewhere (e.g., object storage)
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- The `encrypted_content_ref` would point to the location in object storage
    encrypted_content_ref TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ
);

-- Audit log action types, mirroring the bot's functionality
CREATE TYPE audit_log_action AS ENUM (
    'ban', 'unban', 'kick', 'mute', 'unmute', 'warn', 'hackban'
    -- Add other action types as needed
);

-- Audit log for moderation and administrative actions
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id), -- The user who performed the action
    target_id UUID, -- The user the action was performed on
    action audit_log_action NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Cases table, adapted from the moderation bot
CREATE TABLE cases (
    case_id SERIAL PRIMARY KEY,
    server_id VARCHAR(255) NOT NULL,
    case_type VARCHAR(255) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    moderator_id VARCHAR(255) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Staff warnings table, adapted from the moderation bot
CREATE TABLE staff_warnings (
    warning_id SERIAL PRIMARY KEY,
    server_id VARCHAR(255) NOT NULL,
    staff_id VARCHAR(255) NOT NULL,
    issuer_id VARCHAR(255) NOT NULL,
    reason TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Server bans table
CREATE TABLE server_bans (
    server_id UUID NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT,
    banned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (server_id, user_id)
);
