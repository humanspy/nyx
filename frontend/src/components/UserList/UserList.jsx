import { useMemo } from 'react';
import MemberRow from './MemberRow.jsx';
import EmptyState from '../Common/EmptyState.jsx';
import { groupMembersByRole, shouldShowCrown, getRoleStyle } from '../../utils/helpers.js';
import { Users } from 'lucide-react';

const STATUS_DOT = {
  online:    '#22c55e',
  idle:      '#f59e0b',
  dnd:       '#ef4444',
  offline:   '#52555a',
  invisible: '#52555a',
};

function GroupHeader({ group }) {
  const role = group.role;

  if (role) {
    // Hoisted role header — show role color dot + role name in role color
    const hasGradient = !!role.color_gradient;
    const dotStyle = hasGradient
      ? (() => {
          const { type, angle = 135, stops = [] } = role.color_gradient;
          const stopStr = stops.map(s => `${s.color} ${s.position * 100}%`).join(', ');
          return {
            background: type === 'radial'
              ? `radial-gradient(circle, ${stopStr})`
              : `linear-gradient(${angle}deg, ${stopStr})`,
          };
        })()
      : { background: role.color || 'var(--color-muted)' };

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '16px 8px 4px',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, ...dotStyle }} />
        <span style={{ flex: 1, ...getRoleStyle(role), color: (!role.color && !role.color_gradient) ? 'var(--color-text-faint)' : undefined }}>
          {role.name}
        </span>
        <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>
          {group.members.length}
        </span>
      </div>
    );
  }

  // Online / Offline section
  const isOnline = group.label?.startsWith('Online');
  const dotColor = isOnline ? STATUS_DOT.online : STATUS_DOT.offline;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '16px 8px 4px',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
      color: 'var(--color-text-faint)',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: dotColor }} />
      <span style={{ flex: 1 }}>{isOnline ? 'Online' : 'Offline'}</span>
      <span style={{ fontWeight: 400 }}>{group.members.length}</span>
    </div>
  );
}

export default function UserList({ members = [], roles = [], ownerId, presence = {}, serverTag, onMemberClick }) {
  const showCrown = useMemo(
    () => shouldShowCrown(members, roles, ownerId),
    [members, roles, ownerId]
  );

  const groups = useMemo(() => groupMembersByRole(
    members.map(m => ({ ...m, status: presence[m.user_id]?.status || 'offline' })),
    roles,
    ownerId
  ), [members, roles, ownerId, presence]);

  if (members.length === 0) {
    return <EmptyState icon={<Users size={28} />} title="No members yet" />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {groups.map((group, i) => (
        <div key={i}>
          <GroupHeader group={group} />
          {group.members.map(member => (
            <MemberRow
              key={member.user_id}
              member={member}
              roles={roles}
              ownerId={ownerId}
              showCrown={showCrown}
              presenceData={presence[member.user_id]}
              serverTag={serverTag}
              onClick={onMemberClick}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
