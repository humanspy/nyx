import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Volume2, MessageSquareDot, ChevronDown, ChevronRight,
  Plus, Rss, BellOff, Bell, Trash2, Edit2, Copy, UserPlus,
  Settings, EyeOff, Eye, LogOut,
} from 'lucide-react';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { useMuteStore } from '../../store/muteStore.js';
import ServerSettings from '../Server/ServerSettings.jsx';
import ChannelSettings from '../Channel/ChannelSettings.jsx';
import { channelsApi, serversApi } from '../../utils/api.js';

const CHANNEL_ICONS = {
  text: Hash,
  voice: Volume2,
  forum: MessageSquareDot,
  announcement: Rss,
  voice_text: MessageSquareDot,
};

const HIDDEN_KEY = (serverId) => `nyx_hidden_channels_${serverId}`;

export default function ChannelSidebar() {
  const navigate = useNavigate();
  const { activeServerId, activeChannelId, channels, categories, setActiveChannel, getActiveServer, fetchChannels, fetchCategories } = useServerStore();
  const { user } = useAuthStore();
  const { fetchMutes, isMuted, toggle } = useMuteStore();
  const [collapsed, setCollapsed] = useState({});
  const [showSettings, setShowSettings] = useState(false);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [modal, setModal] = useState(null);
  const [channelSettingsId, setChannelSettingsId] = useState(null);
  const [hiddenChannels, setHiddenChannels] = useState({});
  const [showHidden, setShowHidden] = useState(false);
  const [serverCtxMenu, setServerCtxMenu] = useState(null);

  useEffect(() => { fetchMutes(); }, [activeServerId]);
  useEffect(() => {
    if (activeServerId) {
      const saved = JSON.parse(localStorage.getItem(HIDDEN_KEY(activeServerId)) || '{}');
      setHiddenChannels(saved);
    }
  }, [activeServerId]);

  const server = getActiveServer();
  const serverChannels = channels[activeServerId] || [];
  const serverCategories = categories[activeServerId] || [];
  const isOwner = server?.owner_id === user?.id;

  function selectChannel(ch) {
    setActiveChannel(ch.id);
    navigate(activeServerId ? `/channels/${activeServerId}/${ch.id}` : `/dm/${ch.id}`);
  }

  function toggleCategory(id) {
    setCollapsed(c => ({ ...c, [id]: !c[id] }));
  }

  function toggleHide(channelId) {
    setHiddenChannels(prev => {
      const next = { ...prev, [channelId]: !prev[channelId] };
      localStorage.setItem(HIDDEN_KEY(activeServerId), JSON.stringify(next));
      return next;
    });
    setCtxMenu(null);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCtxMenu(null);
    setServerCtxMenu(null);
  }

  async function deleteChannel(id) {
    if (!confirm('Delete this channel? This cannot be undone.')) return;
    try { await channelsApi.delete(id); await fetchChannels(activeServerId); } catch {}
    setCtxMenu(null);
  }

  async function deleteCategory(id) {
    if (!confirm('Delete this category? Channels inside will become uncategorized.')) return;
    try { await serversApi.deleteCategory(activeServerId, id); await fetchCategories(activeServerId); } catch {}
    setCtxMenu(null);
  }

  function openCtxMenu(e, type, id, extra = {}) {
    e.preventDefault();
    e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type, id, ...extra });
  }

  if (!activeServerId) return <DMSidebar />;

  const uncategorized = serverChannels.filter(c => !c.category_id && c.type !== 'voice_text');
  const byCategory = serverCategories.map(cat => ({
    cat,
    channels: serverChannels.filter(c => c.category_id === cat.id && c.type !== 'voice_text'),
  }));

  function renderChannel(ch) {
    const Icon = CHANNEL_ICONS[ch.type] || Hash;
    const active = activeChannelId === ch.id;
    const muted = isMuted('channel', ch.id);
    const hidden = hiddenChannels[ch.id];
    const pairedTextCh = ch.type === 'voice'
      ? serverChannels.find(c => c.paired_voice_channel_id === ch.id)
      : null;

    if (hidden && !showHidden) return null;

    return (
      <div key={ch.id}>
        <div
          onClick={() => selectChannel(ch)}
          onContextMenu={e => openCtxMenu(e, 'channel', ch.id, { name: ch.name, channelType: ch.type })}
          className="channel-row"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
            borderRadius: 6, cursor: 'pointer', position: 'relative',
            color: active ? 'var(--color-text)' : (muted || hidden) ? 'var(--color-text-faint)' : 'var(--color-text-muted)',
            background: active ? 'var(--bg-active)' : 'transparent',
            transition: 'background 0.1s',
            opacity: hidden ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (!active) e.currentTarget.style.background = 'var(--bg-hover)';
            const btn = e.currentTarget.querySelector('.ch-settings-btn');
            if (btn) btn.style.opacity = '1';
          }}
          onMouseLeave={e => {
            if (!active) e.currentTarget.style.background = 'transparent';
            const btn = e.currentTarget.querySelector('.ch-settings-btn');
            if (btn) btn.style.opacity = '0';
          }}
        >
          <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
          <span style={{ fontSize: 14, fontWeight: active ? 600 : 400, flex: 1 }} className="truncate">{ch.name}</span>
          {muted && <BellOff size={11} style={{ flexShrink: 0, opacity: 0.5 }} />}
          {hidden && <EyeOff size={11} style={{ flexShrink: 0, opacity: 0.4 }} />}
          {isOwner && (
            <button
              className="ch-settings-btn"
              onClick={e => { e.stopPropagation(); setChannelSettingsId(ch.id); }}
              title="Channel Settings"
              style={{
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 3, color: 'var(--color-text-muted)', background: 'none',
                cursor: 'pointer', flexShrink: 0, opacity: 0, transition: 'opacity 0.1s',
              }}
            >
              <Settings size={13} />
            </button>
          )}
        </div>
        {pairedTextCh && (
          <div
            onClick={() => selectChannel(pairedTextCh)}
            onContextMenu={e => openCtxMenu(e, 'channel', pairedTextCh.id, { name: pairedTextCh.name, channelType: pairedTextCh.type })}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', paddingLeft: 28,
              borderRadius: 6, cursor: 'pointer',
              color: activeChannelId === pairedTextCh.id ? 'var(--color-text)' : 'var(--color-text-muted)',
              background: activeChannelId === pairedTextCh.id ? 'var(--bg-active)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (activeChannelId !== pairedTextCh.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeChannelId !== pairedTextCh.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <Hash size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
            <span style={{ fontSize: 13, opacity: 0.85, flex: 1 }} className="truncate">{pairedTextCh.name}</span>
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
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          setServerCtxMenu({ x: rect.left, y: rect.bottom });
        }}
      >
        <span className="truncate">{server?.name}</span>
        {isMuted('server', activeServerId)
          ? <BellOff size={14} style={{ opacity: 0.5 }} />
          : <ChevronDown size={16} style={{ opacity: 0.5 }} />}
      </div>

      {/* Channel list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px', paddingBottom: 60 }}>
        {Object.values(hiddenChannels).some(Boolean) && (
          <button
            onClick={() => setShowHidden(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%', padding: '3px 6px', marginBottom: 4, fontSize: 11, color: 'var(--color-text-faint)', background: 'none', cursor: 'pointer', borderRadius: 4 }}
          >
            {showHidden ? <Eye size={11} /> : <EyeOff size={11} />}
            {showHidden ? 'Hide hidden channels' : 'Show hidden channels'}
          </button>
        )}

        {uncategorized.map(renderChannel)}

        {byCategory.map(({ cat, channels: catChannels }) => (
          <div key={cat.id} style={{ marginTop: 8 }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px', cursor: 'pointer', color: 'var(--color-text-faint)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}
              onClick={() => toggleCategory(cat.id)}
              onContextMenu={e => openCtxMenu(e, 'category', cat.id, { name: cat.name })}
            >
              {collapsed[cat.id] ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span style={{ flex: 1 }} className="truncate">{cat.name}</span>
              {isMuted('category', cat.id) && <BellOff size={10} style={{ opacity: 0.5 }} />}
              {isOwner && (
                <button
                  onClick={e => { e.stopPropagation(); setModal({ type: 'create-channel', data: { categoryId: cat.id } }); }}
                  title="Add channel"
                  style={{ padding: 2, borderRadius: 4, color: 'var(--color-text-faint)', background: 'none', opacity: 0.7 }}
                ><Plus size={13} /></button>
              )}
            </div>
            {!collapsed[cat.id] && catChannels.map(renderChannel)}
          </div>
        ))}
      </div>

      {showSettings && <ServerSettings onClose={() => setShowSettings(false)} />}

      {serverCtxMenu && (
        <ServerContextMenu
          x={serverCtxMenu.x} y={serverCtxMenu.y}
          server={server} isOwner={isOwner}
          isMuted={isMuted('server', activeServerId)}
          onClose={() => setServerCtxMenu(null)}
          onSettings={() => { setShowSettings(true); setServerCtxMenu(null); }}
          onCreateChannel={() => { setModal({ type: 'create-channel', data: {} }); setServerCtxMenu(null); }}
          onCreateCategory={() => { setModal({ type: 'create-category', data: {} }); setServerCtxMenu(null); }}
          onToggleMute={() => { toggle('server', activeServerId); setServerCtxMenu(null); }}
          onInvite={async () => {
            try {
              const { code } = await serversApi.createInvite(activeServerId);
              navigator.clipboard.writeText(`${location.origin}/invite/${code}`).catch(() => {});
            } catch {}
            setServerCtxMenu(null);
          }}
          onLeave={async () => {
            if (!confirm('Leave this server?')) return;
            try { await serversApi.leave(activeServerId); } catch {}
            navigate('/');
            setServerCtxMenu(null);
          }}
        />
      )}

      {ctxMenu && (
        <ChannelContextMenu
          ctxMenu={ctxMenu} isOwner={isOwner}
          isMuted={isMuted(ctxMenu.type, ctxMenu.id)}
          isHidden={hiddenChannels[ctxMenu.id]}
          collapsed={collapsed[ctxMenu.id]}
          onClose={() => setCtxMenu(null)}
          onToggleMute={() => { toggle(ctxMenu.type, ctxMenu.id); setCtxMenu(null); }}
          onToggleHide={() => toggleHide(ctxMenu.id)}
          onToggleCollapse={() => { toggleCategory(ctxMenu.id); setCtxMenu(null); }}
          onEdit={() => {
            if (ctxMenu.type === 'category') {
              setModal({ type: 'edit-category', data: { id: ctxMenu.id, name: ctxMenu.name } });
            } else {
              setChannelSettingsId(ctxMenu.id);
            }
            setCtxMenu(null);
          }}
          onDelete={() => {
            if (ctxMenu.type === 'category') deleteCategory(ctxMenu.id);
            else deleteChannel(ctxMenu.id);
          }}
          onCopyId={() => copyToClipboard(ctxMenu.id)}
          onCreateChannel={() => { setModal({ type: 'create-channel', data: {} }); setCtxMenu(null); }}
        />
      )}

      {modal && (
        <ChannelModal
          modal={modal} serverId={activeServerId} categories={serverCategories}
          onClose={() => setModal(null)}
          onDone={async () => {
            await fetchChannels(activeServerId);
            await fetchCategories(activeServerId);
            setModal(null);
          }}
        />
      )}

      {channelSettingsId && (() => {
        const ch = serverChannels.find(c => c.id === channelSettingsId);
        if (!ch) return null;
        return (
          <ChannelSettings
            channel={ch}
            serverId={activeServerId}
            onClose={() => setChannelSettingsId(null)}
            onDeleted={() => {
              setChannelSettingsId(null);
              navigate('/');
            }}
          />
        );
      })()}
    </div>
  );
}

function ServerContextMenu({ x, y, isOwner, isMuted, onClose, onSettings, onCreateChannel, onCreateCategory, onToggleMute, onInvite, onLeave }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const top = Math.min(y, window.innerHeight - 380);
  return (
    <div ref={ref} style={{ position: 'fixed', zIndex: 3000, top, left: x, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 220, padding: '4px 0' }}>
      <MenuItem icon={<UserPlus size={15} />} onClick={onInvite}>Invite People</MenuItem>
      {isOwner && <MenuItem icon={<Settings size={15} />} onClick={onSettings}>Server Settings</MenuItem>}
      <Divider />
      {isOwner && <MenuItem icon={<Plus size={15} />} onClick={onCreateChannel}>Create Channel</MenuItem>}
      {isOwner && <MenuItem icon={<Plus size={15} />} onClick={onCreateCategory}>Create Category</MenuItem>}
      <Divider />
      <MenuItem icon={isMuted ? <Bell size={15} /> : <BellOff size={15} />} onClick={onToggleMute}>
        {isMuted ? 'Unmute Server' : 'Mute Server'}
      </MenuItem>
      {!isOwner && <><Divider /><MenuItem icon={<LogOut size={15} />} onClick={onLeave} danger>Leave Server</MenuItem></>}
    </div>
  );
}

function ChannelContextMenu({ ctxMenu, isOwner, isMuted, isHidden, collapsed, onClose, onToggleMute, onToggleHide, onToggleCollapse, onEdit, onDelete, onCopyId, onCreateChannel }) {
  const ref = useRef(null);
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const isCategory = ctxMenu.type === 'category';
  const top = Math.min(ctxMenu.y, window.innerHeight - 320);
  return (
    <div ref={ref} style={{ position: 'fixed', zIndex: 3000, top, left: ctxMenu.x, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 200, padding: '4px 0' }}>
      {isCategory ? (
        <>
          <MenuItem onClick={onToggleCollapse}>{collapsed ? 'Expand Category' : 'Collapse Category'}</MenuItem>
          <Divider />
          <MenuItem icon={isMuted ? <Bell size={15} /> : <BellOff size={15} />} onClick={onToggleMute}>{isMuted ? 'Unmute Category' : 'Mute Category'}</MenuItem>
          <Divider />
          {isOwner && <MenuItem icon={<Edit2 size={15} />} onClick={onEdit}>Edit Category</MenuItem>}
          {isOwner && <MenuItem icon={<Trash2 size={15} />} onClick={onDelete} danger>Delete Category</MenuItem>}
          <Divider />
          <MenuItem icon={<Copy size={14} />} onClick={onCopyId} muted>Copy Category ID</MenuItem>
        </>
      ) : (
        <>
          <MenuItem icon={isMuted ? <Bell size={15} /> : <BellOff size={15} />} onClick={onToggleMute}>{isMuted ? 'Unmute Channel' : 'Mute Channel'}</MenuItem>
          <MenuItem icon={isHidden ? <Eye size={15} /> : <EyeOff size={15} />} onClick={onToggleHide}>{isHidden ? 'Show Channel' : 'Hide Channel'}</MenuItem>
          <Divider />
          {isOwner && <MenuItem icon={<Edit2 size={15} />} onClick={onEdit}>Edit Channel</MenuItem>}
          {isOwner && <MenuItem icon={<Plus size={15} />} onClick={onCreateChannel}>Create Text Channel</MenuItem>}
          {isOwner && <MenuItem icon={<Trash2 size={15} />} onClick={onDelete} danger>Delete Channel</MenuItem>}
          <Divider />
          <MenuItem icon={<Copy size={14} />} onClick={onCopyId} muted>Copy Channel ID</MenuItem>
        </>
      )}
    </div>
  );
}

function ChannelModal({ modal, serverId, categories, onClose, onDone }) {
  const [name, setName] = useState(modal.data?.name || '');
  const [type, setType] = useState('text');
  const [categoryId, setCategoryId] = useState(modal.data?.categoryId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCreate = modal.type === 'create-channel' || modal.type === 'create-category';
  const isCategory = modal.type === 'create-category' || modal.type === 'edit-category';

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true); setError('');
    try {
      if (modal.type === 'create-channel') await channelsApi.create({ name: name.trim(), type, serverId, categoryId: categoryId || null });
      else if (modal.type === 'create-category') await serversApi.createCategory(serverId, { name: name.trim() });
      else if (modal.type === 'edit-channel') await channelsApi.update(modal.data.id, { name: name.trim() });
      else if (modal.type === 'edit-category') await serversApi.updateCategory(serverId, modal.data.id, { name: name.trim() });
      await onDone();
    } catch (err) { setError(err.message || 'Failed'); }
    finally { setLoading(false); }
  }

  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ minWidth: 440 }}>
        <div className="modal-header">
          <span className="modal-title">
            {modal.type === 'create-channel' && 'Create Channel'}
            {modal.type === 'create-category' && 'Create Category'}
            {modal.type === 'edit-channel' && 'Edit Channel'}
            {modal.type === 'edit-category' && 'Edit Category'}
          </span>
          <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          {modal.type === 'create-channel' && (
            <div className="form-group">
              <label className="form-label">Channel Type</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['text', 'voice', 'announcement', 'forum'].map(t => (
                  <button key={t} type="button" onClick={() => setType(t)} style={{ flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: type === t ? 'var(--color-accent)' : 'var(--bg-primary)', color: type === t ? '#fff' : 'var(--color-text-muted)', border: `1px solid ${type === t ? 'var(--color-accent)' : 'var(--border-color)'}`, cursor: 'pointer', textTransform: 'capitalize' }}>{t}</button>
                ))}
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">{isCategory ? 'Category Name' : 'Channel Name'}</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder={isCategory ? 'e.g. General' : type === 'voice' ? 'e.g. Voice Chat' : 'e.g. general'} autoFocus required />
          </div>
          {modal.type === 'create-channel' && (
            <div className="form-group">
              <label className="form-label">Category (optional)</label>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} style={{ width: '100%', padding: '8px 12px' }}>
                <option value="">No category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          {error && <div style={{ fontSize: 13, color: 'var(--color-danger)', marginBottom: 12 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>{loading ? 'Saving…' : isCreate ? 'Create' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger, muted }) {
  return (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 12px', fontSize: 13, color: danger ? 'var(--color-danger)' : muted ? 'var(--color-text-faint)' : 'var(--color-text)', background: 'none', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}>
      {icon && <span style={{ opacity: 0.7, flexShrink: 0 }}>{icon}</span>}
      {children}
    </button>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />;
}

function DMSidebar() {
  const navigate = useNavigate();
  const { setActiveChannel, activeChannelId } = useServerStore();
  const [dms, setDms] = useState([]);

  useState(() => {
    import('../../utils/api.js').then(({ usersApi }) => usersApi.getDMs().then(setDms).catch(() => {}));
  }, []);

  return (
    <div style={{ width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', background: 'var(--bg-secondary)', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 'var(--header-height)', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--border-color)', fontWeight: 700 }}>
        Direct Messages
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {dms.map(dm => (
          <div key={dm.id} onClick={() => { setActiveChannel(dm.id); navigate(`/dm/${dm.id}`); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', background: activeChannelId === dm.id ? 'var(--bg-active)' : 'transparent' }}
            onMouseEnter={e => { if (activeChannelId !== dm.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (activeChannelId !== dm.id) e.currentTarget.style.background = 'transparent'; }}>
            <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{dm.name?.[0]?.toUpperCase() || '?'}</div>
            <span className="truncate" style={{ fontSize: 14 }}>{dm.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
