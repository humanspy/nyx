import { Tag } from 'lucide-react';
import { useServerStore } from '../../store/serverStore.js';
import { useMessageStore } from '../../store/messageStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { serversApi } from '../../utils/api.js';
import Toggle from '../Common/Toggle.jsx';
import { ServerTagBadge } from '../Common/Badge.jsx';
import { UserList } from '../UserList/index.js';

export { ServerTagBadge };

export default function UserListPanel() {
  const { activeServerId, members, roles, getActiveServer, fetchMembers } = useServerStore();
  const { presence } = useMessageStore();
  const { user } = useAuthStore();

  const server = getActiveServer();
  const serverMembers = activeServerId ? (members[activeServerId] || []) : [];
  const serverRoles = activeServerId ? (roles[activeServerId] || []) : [];

  if (!activeServerId) return null;

  const myMember = serverMembers.find(m => m.user_id === user?.id);

  async function toggleMyTag() {
    await serversApi.setShowTag(activeServerId, !myMember?.show_tag);
    fetchMembers(activeServerId);
  }

  return (
    <div style={{
      width: 'var(--user-list-width)', minWidth: 'var(--user-list-width)',
      background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {server?.tag && myMember && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flex: 1 }}>
            Show <ServerTagBadge tag={server.tag} /> tag
          </span>
          <Toggle
            checked={!!myMember.show_tag}
            onChange={toggleMyTag}
            size="sm"
          />
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        <UserList
          members={serverMembers}
          roles={serverRoles}
          ownerId={server?.owner_id}
          presence={presence}
          serverTag={server?.tag}
        />
      </div>
    </div>
  );
}
