import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hash, Volume2, MessageSquareDot, ChevronDown, ChevronRight, Plus, Settings, Rss, BellOff, Bell } from 'lucide-react';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useMuteStore } from '../../store/muteStore.js';
import ServerSettings from '../Server/ServerSettings.jsx';

const CHANNEL_ICONS = {
  text: Hash,
  voice: Volume2,
  forum: MessageSquareDot,
  announcement: Rss,
  voice_text: MessageSquareDot,
};

export default function ChannelSidebar() {
  const navigate = useNavigate();
  const { activeServerId, activeChannelId, channels, categories, setActiveChannel, getActiveServer } = useServerStore();
  const { user } = useAuthStore();
  const { fetchMutes, isMuted, toggle } = useMuteStore();
  const [collapsed, setCollapsed] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null); // { x, y, type, id, label }

  useEffect(() => { fetchMutes(); }, [activeServerId]);

  const server = getActiveServer();
  const serverChannels = channels[activeServerId] || [];
  const serverCategories = categories[activeServerId] || [];

  function selectChannel(ch) {
    setActiveChannel(ch.id);
    navigate(`/channels/${activeServerId}/${ch.id}`);
  }

  function toggleCategory(id) {
    setCollapsed(c => ({ ...c, [id]: !c[id] }));
  }

  if (!activeServerId) {
    // DM sidebar
    return <DMSidebar />;
  }

  // Group channels by category; voice channels pair with voice_text channels
  const uncategorized = serverChannels.filter(c => !c.category_id && c.type !== 'voice_text');
  const byCategory = serverCategories.map(cat => ({
    cat,
    channels: serverChannels.filter(c => c.category_id === cat.id && c.type !== 'voice_text'),
  }));

  function openCtxMenu(e, type, id, label) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type, id, label });
  }

  function renderChannel(ch) {
    const Icon = CHANNEL_ICONS[ch.type] || Hash;
    const active = activeChannelId === ch.id;
    const muted = isMuted('channel', ch.id);
    // Find paired voice-text channel for voice channels
    const pairedTextCh = ch.type === 'voice' ? serverChannels.find(c => c.paired_voice_channel_id === ch.id) : null;

    return (
      <div key={ch.id}>
        <div
          onClick={() => selectChannel(ch)}
          onContextMenu={e => openCtxMenu(e, 'channel', ch.id, `#${ch.name}`)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px',
            borderRadius: 6, cursor: 'pointer',
            color: active ? 'var(--color-text)' : muted ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
            background: active ? 'var(--bg-active)' : 'transparent',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
        >
          <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400 }} className="truncate">{ch.name}</span>
          {muted && <BellOff size={11} style={{ marginLeft: 'auto', flexShrink: 0, opacity: 0.5 }} />}
        </div>
        {/* Paired voice-text channel rendered below voice channel */}
        {pairedTextCh && (
          <div
            onClick={() => selectChannel(pairedTextCh)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', paddingLeft: 28,
              borderRadius: 6, cursor: 'pointer',
              color: activeChannelId === pairedTextCh.id ? 'var(--color-text)' : 'var(--color-text-muted)',
              background: activeChannelId === pairedTextCh.id ? 'var(--bg-active)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (activeChannelId !== pairedTextCh.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeChannelId !== pairedTextCh.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <Hash size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span style={{ fontSize: 13, opacity: 0.85 }} className="truncate">{pairedTextCh.name}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{
      width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* Server Header */}
      <div
        style={{
          height: 'var(--header-height)', display: 'flex', alignItems: 'center',
          padding: '0 16px', borderBottom: '1px solid var(--border-color)',
          cursor: 'pointer', fontWeight: 700, fontSize: 15,
          justifyContent: 'space-between',
        }}
        onClick={() => setShowSettings(true)}
        onContextMenu={e => openCtxMenu(e, 'server', activeServerId, server?.name)}
      >
        <span className="truncate">{server?.name}</span>
        {isMuted('server', activeServerId)
          ? <BellOff size={14} style={{ opacity: 0.5 }} />
          : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {uncategorized.map(renderChannel)}

        {byCategory.map(({ cat, channels: catChannels }) => (
          <div key={cat.id} style={{ marginTop: 8 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              onClick={() => toggleCategory(cat.id)}
              onContextMenu={e => openCtxMenu(e, 'category', cat.id, cat.name)}
            >
              {collapsed[cat.id] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              {cat.name}
              {isMuted('category', cat.id) && <BellOff size={10} style={{ marginLeft: 4, opacity: 0.5 }} />}
            </div>
            {!collapsed[cat.id] && catChannels.map(renderChannel)}
          </div>
        ))}
      </div>

      {showSettings && <ServerSettings onClose={() => setShowSettings(false)} />}

      {/* Context menu for mute/unmute */}
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          label={ctxMenu.label}
          muted={isMuted(ctxMenu.type, ctxMenu.id)}
          onToggle={() => { toggle(ctxMenu.type, ctxMenu.id); setCtxMenu(null); }}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </div>
  );
}

function ContextMenu({ x, y, label, muted, onToggle, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed', zIndex: 3000, top: y, left: x,
        background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
        borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        minWidth: 180, overflow: 'hidden',
      }}
    >
      <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 700, borderBottom: '1px solid var(--border-color)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <button
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', fontSize: 13, color: muted ? 'var(--color-accent)' : 'var(--color-text)', background: 'none', cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
      >
        {muted ? <Bell size={14} /> : <BellOff size={14} />}
        {muted ? 'Unmute' : 'Mute'}
      </button>
    </div>
  );
}

function DMSidebar() {
  const navigate = useNavigate();
  const { setActiveChannel } = useServerStore();
  const [dms, setDms] = useState([]);
  const { activeChannelId } = useServerStore();

  useState(() => {
    import('../../utils/api.js').then(({ usersApi }) => usersApi.getDMs().then(setDms).catch(() => {}));
  }, []);

  return (
    <div style={{
      width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)',
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
        Direct Messages
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {dms.map(dm => (
          <div
            key={dm.id}
            onClick={() => { setActiveChannel(dm.id); navigate(`/dm/${dm.id}`); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
              cursor: 'pointer', background: activeChannelId === dm.id ? 'var(--bg-active)' : 'transparent',
            }}
            onMouseEnter={e => { if (activeChannelId !== dm.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeChannelId !== dm.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
              {dm.name?.[0]?.toUpperCase() || '?'}
            </div>
            <span className="truncate" style={{ fontSize: 14 }}>{dm.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
