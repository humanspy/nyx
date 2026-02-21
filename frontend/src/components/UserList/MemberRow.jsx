import { Crown } from 'lucide-react';
import Avatar from '../Common/Avatar.jsx';
import { ServerTagBadge } from '../Common/Badge.jsx';
import { getRoleStyle } from '../../utils/helpers.js';

/**
 * MemberRow — a single member entry in the user list.
 *
 * @param {object}  member        Member record (user_id, display_name, nickname, avatar_url, role_ids, show_tag)
 * @param {Array}   roles         Full roles array for the server
 * @param {string}  ownerId       Server owner's user_id
 * @param {boolean} showCrown     Whether the crown rule is active (owner shares top role with 5+ members)
 * @param {object}  presenceData  { status, activity } from presence store
 * @param {string}  serverTag     The server's tag string (shown only if member.show_tag is true)
 * @param {func}    onClick
 */
export default function MemberRow({ member, roles, ownerId, showCrown, presenceData, serverTag, onClick }) {
  const status = presenceData?.status || 'offline';
  const displayName = member.nickname || member.display_name || member.username;

  const memberRoles = roles
    .filter(r => member.role_ids?.includes(r.id))
    .sort((a, b) => a.position - b.position);

  const nameStyle = memberRoles[0] ? getRoleStyle(memberRoles[0]) : {};
  const isOwner = member.user_id === ownerId;

  return (
    <div
      onClick={() => onClick?.(member)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 8px', borderRadius: 6,
        cursor: onClick ? 'pointer' : 'default',
        opacity: (status === 'offline' || status === 'invisible') ? 0.5 : 1,
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar
        src={member.avatar_url}
        name={displayName}
        size={32}
        status={status}
        showStatus
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 500, ...nameStyle }} className="truncate">
            {displayName}
          </span>
          {isOwner && showCrown && <Crown size={11} color="#f59e0b" />}
          {serverTag && member.show_tag && <ServerTagBadge tag={serverTag} />}
        </div>
        {presenceData?.activity && (
          <div className="truncate text-xs text-faint">{presenceData.activity}</div>
        )}
      </div>
    </div>
  );
}
