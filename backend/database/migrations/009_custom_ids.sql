-- Migration 009: Switch primary and foreign key columns from UUID to custom-length TEXT IDs.

-- ── ID generation function ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_id(len INT) RETURNS TEXT AS $$
DECLARE
  chars  TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i      INT;
BEGIN
  FOR i IN 1..len LOOP
    result := result || substr(chars, floor(random() * 62)::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ── Convert UUID → TEXT (only if not already done) ──────────────────────────
DO $$
DECLARE col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'id';

  IF col_type != 'uuid' THEN RETURN; END IF;  -- already migrated or fresh install

  -- ── Drop FK constraints (children first) ─────────────────────────────────
  ALTER TABLE user_keys                     DROP CONSTRAINT IF EXISTS user_keys_user_id_fkey;
  ALTER TABLE user_settings                 DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;
  ALTER TABLE refresh_tokens                DROP CONSTRAINT IF EXISTS refresh_tokens_user_id_fkey;
  ALTER TABLE email_verifications           DROP CONSTRAINT IF EXISTS email_verifications_user_id_fkey;
  ALTER TABLE password_reset_tokens         DROP CONSTRAINT IF EXISTS password_reset_tokens_user_id_fkey;
  ALTER TABLE platform_bans                 DROP CONSTRAINT IF EXISTS platform_bans_user_id_fkey;
  ALTER TABLE account_standing              DROP CONSTRAINT IF EXISTS account_standing_user_id_fkey;
  ALTER TABLE reports                       DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
  ALTER TABLE reports                       DROP CONSTRAINT IF EXISTS reports_target_user_id_fkey;
  ALTER TABLE reports                       DROP CONSTRAINT IF EXISTS reports_reviewed_by_fkey;
  ALTER TABLE user_mutes                    DROP CONSTRAINT IF EXISTS user_mutes_user_id_fkey;
  ALTER TABLE server_members                DROP CONSTRAINT IF EXISTS server_members_user_id_fkey;
  ALTER TABLE member_roles                  DROP CONSTRAINT IF EXISTS member_roles_server_id_user_id_fkey;
  ALTER TABLE channel_members               DROP CONSTRAINT IF EXISTS channel_members_user_id_fkey;
  ALTER TABLE channel_keys                  DROP CONSTRAINT IF EXISTS channel_keys_user_id_fkey;
  ALTER TABLE messages                      DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
  ALTER TABLE forum_threads                 DROP CONSTRAINT IF EXISTS forum_threads_creator_id_fkey;
  ALTER TABLE media_files                   DROP CONSTRAINT IF EXISTS media_files_uploader_id_fkey;
  ALTER TABLE custom_emojis                 DROP CONSTRAINT IF EXISTS custom_emojis_creator_id_fkey;
  ALTER TABLE custom_stickers               DROP CONSTRAINT IF EXISTS custom_stickers_creator_id_fkey;
  ALTER TABLE audit_log                     DROP CONSTRAINT IF EXISTS audit_log_actor_id_fkey;
  ALTER TABLE servers                       DROP CONSTRAINT IF EXISTS servers_owner_id_fkey;
  ALTER TABLE roles                         DROP CONSTRAINT IF EXISTS roles_server_id_fkey;
  ALTER TABLE server_members                DROP CONSTRAINT IF EXISTS server_members_server_id_fkey;
  ALTER TABLE categories                    DROP CONSTRAINT IF EXISTS categories_server_id_fkey;
  ALTER TABLE channels                      DROP CONSTRAINT IF EXISTS channels_server_id_fkey;
  ALTER TABLE channels                      DROP CONSTRAINT IF EXISTS channels_category_id_fkey;
  ALTER TABLE channels                      DROP CONSTRAINT IF EXISTS channels_paired_voice_channel_id_fkey;
  ALTER TABLE custom_emojis                 DROP CONSTRAINT IF EXISTS custom_emojis_server_id_fkey;
  ALTER TABLE custom_stickers               DROP CONSTRAINT IF EXISTS custom_stickers_server_id_fkey;
  ALTER TABLE cases                         DROP CONSTRAINT IF EXISTS cases_server_id_fkey;
  ALTER TABLE staff_config                  DROP CONSTRAINT IF EXISTS staff_config_server_id_fkey;
  ALTER TABLE staff_warns                   DROP CONSTRAINT IF EXISTS staff_warns_server_id_fkey;
  ALTER TABLE bans                          DROP CONSTRAINT IF EXISTS bans_server_id_fkey;
  ALTER TABLE level_config                  DROP CONSTRAINT IF EXISTS level_config_server_id_fkey;
  ALTER TABLE audit_log                     DROP CONSTRAINT IF EXISTS audit_log_server_id_fkey;
  ALTER TABLE audit_log                     DROP CONSTRAINT IF EXISTS audit_log_case_id_fkey;
  ALTER TABLE server_invites                DROP CONSTRAINT IF EXISTS server_invites_server_id_fkey;
  ALTER TABLE server_invites                DROP CONSTRAINT IF EXISTS server_invites_channel_id_fkey;
  ALTER TABLE server_invites                DROP CONSTRAINT IF EXISTS server_invites_creator_id_fkey;
  ALTER TABLE automod_config                DROP CONSTRAINT IF EXISTS automod_config_server_id_fkey;
  ALTER TABLE reports                       DROP CONSTRAINT IF EXISTS reports_target_server_id_fkey;
  ALTER TABLE channel_overwrites            DROP CONSTRAINT IF EXISTS channel_overwrites_channel_id_fkey;
  ALTER TABLE channel_members               DROP CONSTRAINT IF EXISTS channel_members_channel_id_fkey;
  ALTER TABLE channel_keys                  DROP CONSTRAINT IF EXISTS channel_keys_channel_id_fkey;
  ALTER TABLE messages                      DROP CONSTRAINT IF EXISTS messages_channel_id_fkey;
  ALTER TABLE messages                      DROP CONSTRAINT IF EXISTS messages_thread_id_fkey;
  ALTER TABLE messages                      DROP CONSTRAINT IF EXISTS messages_parent_id_fkey;
  ALTER TABLE message_edit_history          DROP CONSTRAINT IF EXISTS message_edit_history_message_id_fkey;
  ALTER TABLE forum_threads                 DROP CONSTRAINT IF EXISTS forum_threads_channel_id_fkey;
  ALTER TABLE channel_permission_overrides  DROP CONSTRAINT IF EXISTS channel_permission_overrides_channel_id_fkey;
  ALTER TABLE channel_permission_overwrites DROP CONSTRAINT IF EXISTS channel_permission_overwrites_channel_id_fkey;
  ALTER TABLE reports                       DROP CONSTRAINT IF EXISTS reports_target_msg_id_fkey;
  ALTER TABLE member_roles                  DROP CONSTRAINT IF EXISTS member_roles_role_id_fkey;
  ALTER TABLE user_settings                 DROP CONSTRAINT IF EXISTS user_settings_ringtone_file_id_fkey;

  -- ── Drop composite PKs (must recreate after type change) ─────────────────
  ALTER TABLE user_settings   DROP CONSTRAINT IF EXISTS user_settings_pkey;
  ALTER TABLE server_members  DROP CONSTRAINT IF EXISTS server_members_pkey;
  ALTER TABLE member_roles    DROP CONSTRAINT IF EXISTS member_roles_pkey;
  ALTER TABLE channel_overwrites DROP CONSTRAINT IF EXISTS channel_overwrites_pkey;
  ALTER TABLE channel_members DROP CONSTRAINT IF EXISTS channel_members_pkey;
  ALTER TABLE channel_keys    DROP CONSTRAINT IF EXISTS channel_keys_pkey;
  ALTER TABLE bans            DROP CONSTRAINT IF EXISTS bans_pkey;
  ALTER TABLE staff_config    DROP CONSTRAINT IF EXISTS staff_config_pkey;
  ALTER TABLE level_config    DROP CONSTRAINT IF EXISTS level_config_pkey;
  ALTER TABLE account_standing DROP CONSTRAINT IF EXISTS account_standing_pkey;
  ALTER TABLE automod_config  DROP CONSTRAINT IF EXISTS automod_config_pkey;

  -- ── USER id → 18 chars ───────────────────────────────────────────────────
  ALTER TABLE users                 ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE users                 ALTER COLUMN id              SET DEFAULT generate_id(18);
  ALTER TABLE user_keys             ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE user_settings         ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE refresh_tokens        ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE email_verifications   ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE password_reset_tokens ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE platform_bans         ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE account_standing      ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN reporter_id     TYPE TEXT USING reporter_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN target_user_id  TYPE TEXT USING target_user_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN reviewed_by     TYPE TEXT USING reviewed_by::TEXT;
  ALTER TABLE user_mutes            ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE server_members        ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE member_roles          ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE channel_members       ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE channel_keys          ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;
  ALTER TABLE messages              ALTER COLUMN sender_id       TYPE TEXT USING sender_id::TEXT;
  ALTER TABLE forum_threads         ALTER COLUMN creator_id      TYPE TEXT USING creator_id::TEXT;
  ALTER TABLE media_files           ALTER COLUMN uploader_id     TYPE TEXT USING uploader_id::TEXT;
  ALTER TABLE custom_emojis         ALTER COLUMN creator_id      TYPE TEXT USING creator_id::TEXT;
  ALTER TABLE custom_stickers       ALTER COLUMN creator_id      TYPE TEXT USING creator_id::TEXT;
  ALTER TABLE audit_log             ALTER COLUMN actor_id        TYPE TEXT USING actor_id::TEXT;
  ALTER TABLE servers               ALTER COLUMN owner_id        TYPE TEXT USING owner_id::TEXT;
  ALTER TABLE bans                  ALTER COLUMN user_id         TYPE TEXT USING user_id::TEXT;

  -- ── SERVER id → 22 chars ─────────────────────────────────────────────────
  ALTER TABLE servers               ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE servers               ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE roles                 ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE server_members        ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE member_roles          ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE categories            ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE channels              ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE custom_emojis         ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE custom_stickers       ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE cases                 ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE staff_config          ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE staff_warns           ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE bans                  ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE level_config          ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE audit_log             ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE server_invites        ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE automod_config        ALTER COLUMN server_id       TYPE TEXT USING server_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN target_server_id TYPE TEXT USING target_server_id::TEXT;

  -- ── CATEGORY id → 22 chars ───────────────────────────────────────────────
  ALTER TABLE categories            ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE categories            ALTER COLUMN id              SET DEFAULT generate_id(22);

  -- ── CHANNEL id → 26 chars ────────────────────────────────────────────────
  ALTER TABLE channels              ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE channels              ALTER COLUMN id              SET DEFAULT generate_id(26);
  ALTER TABLE channels              ALTER COLUMN category_id     TYPE TEXT USING category_id::TEXT;
  ALTER TABLE channels              ALTER COLUMN paired_voice_channel_id TYPE TEXT USING paired_voice_channel_id::TEXT;
  ALTER TABLE channel_overwrites    ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE channel_members       ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE channel_keys          ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE messages              ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE forum_threads         ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE server_invites        ALTER COLUMN channel_id      TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE server_invites        ALTER COLUMN creator_id      TYPE TEXT USING creator_id::TEXT;
  ALTER TABLE channel_permission_overrides  ALTER COLUMN channel_id TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE channel_permission_overwrites ALTER COLUMN channel_id TYPE TEXT USING channel_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN target_msg_id   TYPE TEXT USING target_msg_id::TEXT;

  -- ── ROLE id → 14 chars ───────────────────────────────────────────────────
  ALTER TABLE roles                 ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE roles                 ALTER COLUMN id              SET DEFAULT generate_id(14);
  ALTER TABLE member_roles          ALTER COLUMN role_id         TYPE TEXT USING role_id::TEXT;

  -- ── MESSAGE id → 22 chars ────────────────────────────────────────────────
  ALTER TABLE messages              ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE messages              ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE messages              ALTER COLUMN thread_id       TYPE TEXT USING thread_id::TEXT;
  ALTER TABLE messages              ALTER COLUMN parent_id       TYPE TEXT USING parent_id::TEXT;
  ALTER TABLE message_edit_history  ALTER COLUMN message_id      TYPE TEXT USING message_id::TEXT;
  ALTER TABLE forum_threads         ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE forum_threads         ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE audit_log             ALTER COLUMN target_id       TYPE TEXT USING target_id::TEXT;
  ALTER TABLE audit_log             ALTER COLUMN case_id         TYPE TEXT USING case_id::TEXT;
  ALTER TABLE reports               ALTER COLUMN target_msg_id   TYPE TEXT USING target_msg_id::TEXT;

  -- ── Other entity IDs → 22 chars ──────────────────────────────────────────
  ALTER TABLE refresh_tokens        ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE refresh_tokens        ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE media_files           ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE media_files           ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE user_settings         ALTER COLUMN ringtone_file_id TYPE TEXT USING ringtone_file_id::TEXT;
  ALTER TABLE custom_emojis         ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE custom_emojis         ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE custom_stickers       ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE custom_stickers       ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE cases                 ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE cases                 ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE staff_warns           ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE staff_warns           ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE audit_log             ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE audit_log             ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE message_edit_history  ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE message_edit_history  ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE user_mutes            ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE user_mutes            ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE email_verifications   ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE email_verifications   ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE password_reset_tokens ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE password_reset_tokens ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE platform_bans         ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE platform_bans         ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE reports               ALTER COLUMN id              TYPE TEXT USING id::TEXT;
  ALTER TABLE reports               ALTER COLUMN id              SET DEFAULT generate_id(22);
  ALTER TABLE channel_permission_overwrites ALTER COLUMN id      TYPE TEXT USING id::TEXT;
  ALTER TABLE channel_permission_overwrites ALTER COLUMN id      SET DEFAULT generate_id(22);
  ALTER TABLE channel_permission_overwrites ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;
  ALTER TABLE channel_permission_overrides  ALTER COLUMN target_id TYPE TEXT USING target_id::TEXT;
  ALTER TABLE automod_config        ALTER COLUMN exempt_role_ids TYPE TEXT[] USING exempt_role_ids::TEXT[];

  -- ── Recreate composite PKs ────────────────────────────────────────────────
  ALTER TABLE user_settings    ADD PRIMARY KEY (user_id);
  ALTER TABLE server_members   ADD PRIMARY KEY (server_id, user_id);
  ALTER TABLE member_roles     ADD PRIMARY KEY (server_id, user_id, role_id);
  ALTER TABLE channel_overwrites ADD PRIMARY KEY (channel_id, target_id);
  ALTER TABLE channel_members  ADD PRIMARY KEY (channel_id, user_id);
  ALTER TABLE channel_keys     ADD PRIMARY KEY (channel_id, user_id, key_version);
  ALTER TABLE bans             ADD PRIMARY KEY (server_id, user_id);
  ALTER TABLE staff_config     ADD PRIMARY KEY (server_id);
  ALTER TABLE level_config     ADD PRIMARY KEY (server_id);
  ALTER TABLE account_standing ADD PRIMARY KEY (user_id);
  ALTER TABLE automod_config   ADD PRIMARY KEY (server_id);

  -- ── Recreate FK constraints ───────────────────────────────────────────────
  ALTER TABLE user_keys          ADD CONSTRAINT user_keys_user_id_fkey               FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE user_settings      ADD CONSTRAINT user_settings_user_id_fkey           FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE refresh_tokens     ADD CONSTRAINT refresh_tokens_user_id_fkey          FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE email_verifications ADD CONSTRAINT email_verifications_user_id_fkey    FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE password_reset_tokens ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id)           REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE platform_bans      ADD CONSTRAINT platform_bans_user_id_fkey           FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE account_standing   ADD CONSTRAINT account_standing_user_id_fkey        FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE user_mutes         ADD CONSTRAINT user_mutes_user_id_fkey              FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE servers            ADD CONSTRAINT servers_owner_id_fkey                FOREIGN KEY (owner_id)           REFERENCES users(id);
  ALTER TABLE server_members     ADD CONSTRAINT server_members_user_id_fkey          FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE channel_members    ADD CONSTRAINT channel_members_user_id_fkey         FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE channel_keys       ADD CONSTRAINT channel_keys_user_id_fkey            FOREIGN KEY (user_id)            REFERENCES users(id)      ON DELETE CASCADE;
  ALTER TABLE messages           ADD CONSTRAINT messages_sender_id_fkey              FOREIGN KEY (sender_id)          REFERENCES users(id);
  ALTER TABLE forum_threads      ADD CONSTRAINT forum_threads_creator_id_fkey        FOREIGN KEY (creator_id)         REFERENCES users(id);
  ALTER TABLE media_files        ADD CONSTRAINT media_files_uploader_id_fkey         FOREIGN KEY (uploader_id)        REFERENCES users(id);
  ALTER TABLE custom_emojis      ADD CONSTRAINT custom_emojis_creator_id_fkey        FOREIGN KEY (creator_id)         REFERENCES users(id);
  ALTER TABLE custom_stickers    ADD CONSTRAINT custom_stickers_creator_id_fkey      FOREIGN KEY (creator_id)         REFERENCES users(id);
  ALTER TABLE audit_log          ADD CONSTRAINT audit_log_actor_id_fkey              FOREIGN KEY (actor_id)           REFERENCES users(id);
  ALTER TABLE reports            ADD CONSTRAINT reports_reporter_id_fkey             FOREIGN KEY (reporter_id)        REFERENCES users(id)      ON DELETE SET NULL;
  ALTER TABLE reports            ADD CONSTRAINT reports_target_user_id_fkey          FOREIGN KEY (target_user_id)     REFERENCES users(id)      ON DELETE SET NULL;
  ALTER TABLE reports            ADD CONSTRAINT reports_reviewed_by_fkey             FOREIGN KEY (reviewed_by)        REFERENCES users(id)      ON DELETE SET NULL;
  ALTER TABLE roles              ADD CONSTRAINT roles_server_id_fkey                 FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE server_members     ADD CONSTRAINT server_members_server_id_fkey        FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE member_roles       ADD CONSTRAINT member_roles_server_id_user_id_fkey  FOREIGN KEY (server_id, user_id) REFERENCES server_members(server_id, user_id) ON DELETE CASCADE;
  ALTER TABLE member_roles       ADD CONSTRAINT member_roles_role_id_fkey            FOREIGN KEY (role_id)            REFERENCES roles(id)      ON DELETE CASCADE;
  ALTER TABLE categories         ADD CONSTRAINT categories_server_id_fkey            FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE channels           ADD CONSTRAINT channels_server_id_fkey              FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE channels           ADD CONSTRAINT channels_category_id_fkey            FOREIGN KEY (category_id)        REFERENCES categories(id) ON DELETE SET NULL;
  ALTER TABLE channels           ADD CONSTRAINT channels_paired_voice_channel_id_fkey FOREIGN KEY (paired_voice_channel_id) REFERENCES channels(id) ON DELETE CASCADE;
  ALTER TABLE custom_emojis      ADD CONSTRAINT custom_emojis_server_id_fkey         FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE custom_stickers    ADD CONSTRAINT custom_stickers_server_id_fkey       FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE cases              ADD CONSTRAINT cases_server_id_fkey                 FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE staff_config       ADD CONSTRAINT staff_config_server_id_fkey          FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE staff_warns        ADD CONSTRAINT staff_warns_server_id_fkey           FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE bans               ADD CONSTRAINT bans_server_id_fkey                  FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE level_config       ADD CONSTRAINT level_config_server_id_fkey          FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE audit_log          ADD CONSTRAINT audit_log_server_id_fkey             FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE audit_log          ADD CONSTRAINT audit_log_case_id_fkey               FOREIGN KEY (case_id)            REFERENCES cases(id);
  ALTER TABLE server_invites     ADD CONSTRAINT server_invites_server_id_fkey        FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE server_invites     ADD CONSTRAINT server_invites_channel_id_fkey       FOREIGN KEY (channel_id)         REFERENCES channels(id);
  ALTER TABLE server_invites     ADD CONSTRAINT server_invites_creator_id_fkey       FOREIGN KEY (creator_id)         REFERENCES users(id);
  ALTER TABLE automod_config     ADD CONSTRAINT automod_config_server_id_fkey        FOREIGN KEY (server_id)          REFERENCES servers(id)    ON DELETE CASCADE;
  ALTER TABLE reports            ADD CONSTRAINT reports_target_server_id_fkey        FOREIGN KEY (target_server_id)   REFERENCES servers(id)    ON DELETE SET NULL;
  ALTER TABLE channel_overwrites ADD CONSTRAINT channel_overwrites_channel_id_fkey   FOREIGN KEY (channel_id)         REFERENCES channels(id)   ON DELETE CASCADE;
  ALTER TABLE channel_members    ADD CONSTRAINT channel_members_channel_id_fkey      FOREIGN KEY (channel_id)         REFERENCES channels(id)   ON DELETE CASCADE;
  ALTER TABLE channel_keys       ADD CONSTRAINT channel_keys_channel_id_fkey         FOREIGN KEY (channel_id)         REFERENCES channels(id)   ON DELETE CASCADE;
  ALTER TABLE messages           ADD CONSTRAINT messages_channel_id_fkey             FOREIGN KEY (channel_id)         REFERENCES channels(id)   ON DELETE CASCADE;
  ALTER TABLE messages           ADD CONSTRAINT messages_thread_id_fkey              FOREIGN KEY (thread_id)          REFERENCES messages(id);
  ALTER TABLE messages           ADD CONSTRAINT messages_parent_id_fkey              FOREIGN KEY (parent_id)          REFERENCES messages(id);
  ALTER TABLE message_edit_history ADD CONSTRAINT message_edit_history_message_id_fkey FOREIGN KEY (message_id)      REFERENCES messages(id)   ON DELETE CASCADE;
  ALTER TABLE forum_threads      ADD CONSTRAINT forum_threads_channel_id_fkey        FOREIGN KEY (channel_id)         REFERENCES channels(id)   ON DELETE CASCADE;
  ALTER TABLE channel_permission_overrides  ADD CONSTRAINT channel_permission_overrides_channel_id_fkey  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
  ALTER TABLE channel_permission_overwrites ADD CONSTRAINT channel_permission_overwrites_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE;
  ALTER TABLE reports            ADD CONSTRAINT reports_target_msg_id_fkey           FOREIGN KEY (target_msg_id)      REFERENCES messages(id)   ON DELETE SET NULL;
  ALTER TABLE user_settings      ADD CONSTRAINT user_settings_ringtone_file_id_fkey  FOREIGN KEY (ringtone_file_id)   REFERENCES media_files(id) ON DELETE SET NULL;

  -- ── Add FK constraints for friendships (now that users.id is TEXT) ────────
  ALTER TABLE friendships        ADD CONSTRAINT IF NOT EXISTS friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
  ALTER TABLE friendships        ADD CONSTRAINT IF NOT EXISTS friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE;

END $$;

-- ── For fresh installs (no UUID columns): just ensure friendships FKs exist ─
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'friendships' AND constraint_name = 'friendships_requester_id_fkey'
  ) THEN
    ALTER TABLE friendships ADD CONSTRAINT friendships_requester_id_fkey FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE friendships ADD CONSTRAINT friendships_addressee_id_fkey FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;
