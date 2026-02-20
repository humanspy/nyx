import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MessageSquare, Home } from 'lucide-react';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { getInitials } from '../../utils/helpers.js';
import CreateServerModal from '../Server/CreateServerModal.jsx';

export default function ServerSidebar() {
  const { servers, activeServerId, setActiveServer } = useServerStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);

  function selectServer(id) {
    setActiveServer(id);
    navigate(`/channels/${id}`);
  }

  return (
    <div style={{
      width: 72, minWidth: 72, background: 'var(--bg-primary)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 8, paddingBottom: 60, gap: 4, overflowY: 'auto',
    }}>
      {/* DMs / Home */}
      <ServerIcon label="Direct Messages" active={!activeServerId} onClick={() => { setActiveServer(null); navigate('/'); }}>
        <MessageSquare size={22} />
      </ServerIcon>

      <div style={{ width: 32, height: 2, background: 'var(--border-color)', borderRadius: 2, margin: '4px 0' }} />

      {servers.map(server => (
        <ServerIcon
          key={server.id}
          label={server.name}
          active={activeServerId === server.id}
          onClick={() => selectServer(server.id)}
        >
          {server.icon_url
            ? <img src={server.icon_url} alt="" style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />
            : <span style={{ fontSize: 18, fontWeight: 700 }}>{getInitials(server.name)}</span>
          }
        </ServerIcon>
      ))}

      <div style={{ width: 32, height: 2, background: 'var(--border-color)', borderRadius: 2, margin: '4px 0' }} />

      <ServerIcon label="Add a Server" onClick={() => setShowCreate(true)}>
        <Plus size={22} color="var(--color-success)" />
      </ServerIcon>

      {showCreate && <CreateServerModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function ServerIcon({ label, active, onClick, children }) {
  return (
    <div
      onClick={onClick}
      title={label}
      style={{
        width: 48, height: 48,
        borderRadius: active ? 16 : 24,
        background: active ? 'var(--color-accent)' : 'var(--bg-secondary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'border-radius 0.2s, background 0.15s',
        overflow: 'hidden', flexShrink: 0,
        color: active ? '#fff' : 'var(--color-text-muted)',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.background = 'var(--bg-hover)'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.borderRadius = '24px'; e.currentTarget.style.background = 'var(--bg-secondary)'; } }}
    >
      {active && (
        <div style={{
          position: 'absolute', left: -8, width: 4, height: 32,
          background: 'var(--color-text)', borderRadius: '0 4px 4px 0',
        }} />
      )}
      {children}
    </div>
  );
}
