/**
 * Parse message content and render mention tokens as styled spans.
 *
 * Supported formats:
 *   @username          → user mention (display name)
 *   #channelname       → channel mention
 *   <@userId>          → user mention by ID
 *   <#channelId>       → channel mention by ID
 *   <@?roleId>         → role mention by ID
 *
 * Provide resolver maps for ID-based lookups:
 *   users:    { [id]: { username, display_name } }
 *   channels: { [id]: { name } }
 *   roles:    { [id]: { name, color } }
 */
export function parseMentions(content, { users = {}, channels = {}, roles = {} } = {}) {
  if (!content) return content;

  // Combined regex for all mention types
  const MENTION_RE = /(<@\?([A-Za-z0-9_-]+)>|<@([A-Za-z0-9_-]+)>|<#([A-Za-z0-9_-]+)>|@([A-Za-z0-9._-]+)|#([A-Za-z0-9_-]+))/g;

  const parts = [];
  let last = 0;
  let match;

  while ((match = MENTION_RE.exec(content)) !== null) {
    if (match.index > last) {
      parts.push(content.slice(last, match.index));
    }

    const [full, , roleId, userId, channelId, atName, hashName] = match;

    if (roleId) {
      const role = roles[roleId];
      parts.push(
        <span key={match.index} style={{ color: role?.color || 'var(--color-accent)', background: role?.color ? `${role.color}22` : 'rgba(124,58,237,0.15)', borderRadius: 4, padding: '0 3px', fontWeight: 600, fontSize: '0.95em' }}>
          @{role?.name || roleId}
        </span>
      );
    } else if (userId) {
      const u = users[userId];
      parts.push(
        <span key={match.index} style={{ color: 'var(--color-accent)', background: 'rgba(59,130,246,0.15)', borderRadius: 4, padding: '0 3px', fontWeight: 600, fontSize: '0.95em' }}>
          @{u?.display_name || u?.username || userId}
        </span>
      );
    } else if (channelId) {
      const ch = channels[channelId];
      parts.push(
        <span key={match.index} style={{ color: 'var(--color-accent)', background: 'rgba(124,58,237,0.15)', borderRadius: 4, padding: '0 3px', fontWeight: 600, fontSize: '0.95em' }}>
          #{ch?.name || channelId}
        </span>
      );
    } else if (atName) {
      // @name mention — look up by username/display_name
      const found = Object.values(users).find(
        u => u.username?.toLowerCase() === atName.toLowerCase() || u.display_name?.toLowerCase() === atName.toLowerCase()
      );
      if (found) {
        parts.push(
          <span key={match.index} style={{ color: 'var(--color-accent)', background: 'rgba(59,130,246,0.15)', borderRadius: 4, padding: '0 3px', fontWeight: 600, fontSize: '0.95em' }}>
            @{found.display_name || found.username}
          </span>
        );
      } else {
        parts.push(full);
      }
    } else if (hashName) {
      // #channelname — look up by name
      const found = Object.values(channels).find(c => c.name?.toLowerCase() === hashName.toLowerCase());
      if (found) {
        parts.push(
          <span key={match.index} style={{ color: 'var(--color-accent)', background: 'rgba(124,58,237,0.15)', borderRadius: 4, padding: '0 3px', fontWeight: 600, fontSize: '0.95em' }}>
            #{found.name}
          </span>
        );
      } else {
        parts.push(full);
      }
    } else {
      parts.push(full);
    }

    last = match.index + full.length;
  }

  if (last < content.length) {
    parts.push(content.slice(last));
  }

  return parts.length > 0 ? parts : content;
}
