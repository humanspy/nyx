import { useMemo } from 'react';
import MemberRow from './MemberRow.jsx';
import EmptyState from '../Common/EmptyState.jsx';
import { groupMembersByRole, shouldShowCrown } from '../../utils/helpers.js';
import { Users } from 'lucide-react';

/**
 * UserList — grouped member list with hoisted role sections.
 *
 * @param {Array}   members       Full member array for the server
 * @param {Array}   roles         Full roles array for the server
 * @param {string}  ownerId       Server owner's user_id
 * @param {object}  presence      { [userId]: { status, activity } }
 * @param {string}  serverTag     Tag shown next to members who opted in
 * @param {func}    onMemberClick Optional click handler per member
 */
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {groups.map((group, i) => (
        <div key={i} style={{ marginBottom: 8 }}>
          {/* Role section header */}
          <div style={{
            fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--color-text-faint)',
            padding: '4px 8px', marginBottom: 4,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <span>{group.label || group.role?.name}</span>
            <span style={{ opacity: 0.6, fontWeight: 400 }}>{group.members.length}</span>
          </div>

          {/* Members */}
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
