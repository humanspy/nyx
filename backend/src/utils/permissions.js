/**
 * NYX Role Permissions — Discord-compatible bitfield names.
 * Reference: https://whop.com/blog/discord-role-permissions/
 *
 * Stored as a JSONB object on roles.permissions: { [PERM_KEY]: true }
 * ADMINISTRATOR overrides all permission checks.
 */

export const PERMISSIONS = {
  // General server permissions
  ADMINISTRATOR:            'ADMINISTRATOR',           // Grants all permissions, overrides denies
  VIEW_CHANNELS:            'VIEW_CHANNELS',
  MANAGE_CHANNELS:          'MANAGE_CHANNELS',
  MANAGE_ROLES:             'MANAGE_ROLES',
  MANAGE_EMOJIS:            'MANAGE_EMOJIS',
  VIEW_AUDIT_LOG:           'VIEW_AUDIT_LOG',
  MANAGE_WEBHOOKS:          'MANAGE_WEBHOOKS',
  MANAGE_SERVER:            'MANAGE_SERVER',           // Rename, icon, vanity, etc.

  // Membership
  CREATE_INVITE:            'CREATE_INVITE',
  CHANGE_NICKNAME:          'CHANGE_NICKNAME',
  MANAGE_NICKNAMES:         'MANAGE_NICKNAMES',
  KICK_MEMBERS:             'KICK_MEMBERS',
  BAN_MEMBERS:              'BAN_MEMBERS',
  TIMEOUT_MEMBERS:          'TIMEOUT_MEMBERS',

  // Text channel
  SEND_MESSAGES:            'SEND_MESSAGES',
  SEND_TTS_MESSAGES:        'SEND_TTS_MESSAGES',
  MANAGE_MESSAGES:          'MANAGE_MESSAGES',         // Delete others' messages, pin
  EMBED_LINKS:              'EMBED_LINKS',
  ATTACH_FILES:             'ATTACH_FILES',
  READ_MESSAGE_HISTORY:     'READ_MESSAGE_HISTORY',
  MENTION_EVERYONE:         'MENTION_EVERYONE',        // @everyone / @here
  USE_EXTERNAL_EMOJIS:      'USE_EXTERNAL_EMOJIS',
  ADD_REACTIONS:            'ADD_REACTIONS',
  USE_SLASH_COMMANDS:       'USE_SLASH_COMMANDS',

  // Voice channel
  CONNECT:                  'CONNECT',
  SPEAK:                    'SPEAK',
  MUTE_MEMBERS:             'MUTE_MEMBERS',            // Server-mute other members in voice
  DEAFEN_MEMBERS:           'DEAFEN_MEMBERS',
  MOVE_MEMBERS:             'MOVE_MEMBERS',
  USE_VOICE_ACTIVITY:       'USE_VOICE_ACTIVITY',
  PRIORITY_SPEAKER:         'PRIORITY_SPEAKER',
  STREAM:                   'STREAM',                  // Go live / screenshare

  // Music (NYX-specific)
  USE_MUSIC:                'USE_MUSIC',               // Play, queue, skip own
  DJ:                       'DJ',                      // Skip/stop/clear queue for all
};

/** Permissions that every member has by default (no role required) */
export const DEFAULT_PERMISSIONS = new Set([
  PERMISSIONS.VIEW_CHANNELS,
  PERMISSIONS.SEND_MESSAGES,
  PERMISSIONS.EMBED_LINKS,
  PERMISSIONS.ATTACH_FILES,
  PERMISSIONS.READ_MESSAGE_HISTORY,
  PERMISSIONS.ADD_REACTIONS,
  PERMISSIONS.USE_EXTERNAL_EMOJIS,
  PERMISSIONS.USE_SLASH_COMMANDS,
  PERMISSIONS.CONNECT,
  PERMISSIONS.SPEAK,
  PERMISSIONS.USE_VOICE_ACTIVITY,
  PERMISSIONS.STREAM,
  PERMISSIONS.USE_MUSIC,
  PERMISSIONS.CREATE_INVITE,
  PERMISSIONS.CHANGE_NICKNAME,
]);

/**
 * Resolve member permissions from their roles.
 * Returns a Set of permission strings.
 */
export function resolvePermissions(memberRoles = []) {
  const perms = new Set(DEFAULT_PERMISSIONS);
  for (const role of memberRoles) {
    const rp = role.permissions || {};
    if (rp[PERMISSIONS.ADMINISTRATOR]) return new Set(Object.values(PERMISSIONS));
    for (const key of Object.values(PERMISSIONS)) {
      if (rp[key]) perms.add(key);
    }
  }
  return perms;
}

/**
 * Check if a permission set (or list of roles) has a given permission.
 */
export function hasPermission(memberRoles, permission) {
  const perms = memberRoles instanceof Set ? memberRoles : resolvePermissions(memberRoles);
  return perms.has(PERMISSIONS.ADMINISTRATOR) || perms.has(permission);
}
