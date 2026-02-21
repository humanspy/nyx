import { useRef, useState, useEffect } from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, RefreshCw } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { getInitials } from '../../utils/helpers.js';
import SettingsModal from '../Settings/Settings.jsx';
import { playMute, playUnmute, playDeafen, playUndeafen } from '../../utils/sounds.js';

const STATUS_OPTIONS = [
  { value: 'online',    label: 'Online',         color: 'var(--color-success)' },
  { value: 'idle',      label: 'Idle',           color: 'var(--color-warning)' },
  { value: 'dnd',       label: 'Do Not Disturb', color: 'var(--color-danger)'  },
  { value: 'invisible', label: 'Invisible',      color: 'var(--color-text-faint)' },
];

export default function UserIndicator({ user }) {
  const { settings, updateSettings, logout } = useAuthStore();
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [status, setStatus] = useState('online');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const statusRef = useRef(null);

  useEffect(() => {
    if (settings?.status) setStatus(settings.status);
  }, [settings?.status]);

  useEffect(() => {
    if (!showStatusPicker) return;
    function h(e) { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatusPicker(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showStatusPicker]);

  async function handleStatus(s) {
    setStatus(s);
    setShowStatusPicker(false);
    try { await updateSettings({ status: s }); } catch {}
    window.dispatchEvent(new CustomEvent('nexus:presence_update', { detail: { status: s } }));
  }

  function handleMute() {
    const next = !muted;
    setMuted(next);
    next ? playMute() : playUnmute();
    window.dispatchEvent(new CustomEvent('nexus:voice:local_mute', { detail: { muted: next } }));
  }

  function handleDeafen() {
    const next = !deafened;
    setDeafened(next);
    next ? playDeafen() : playUndeafen();
    window.dispatchEvent(new CustomEvent('nexus:voice:local_deafen', { detail: { deafened: next } }));
  }

  function handleSwitchAccount() {
    setShowStatusPicker(false);
    // Save current account info for reference, then log out to allow re-login
    const savedAccounts = JSON.parse(localStorage.getItem('nyx_saved_accounts') || '[]');
    if (user?.id && !savedAccounts.some(a => a.userId === user.id)) {
      savedAccounts.push({ username: user.display_name || user.username, userId: user.id, avatar_url: user.avatar_url });
      localStorage.setItem('nyx_saved_accounts', JSON.stringify(savedAccounts));
    }
    logout();
  }

  if (!user) return null;

  const currentStatus = STATUS_OPTIONS.find(o => o.value === status) || STATUS_OPTIONS[0];

  return (
    <>
      <div style={{
        position: 'fixed', bottom: 0, left: 0,
        width: 'calc(72px + var(--sidebar-width))',
        height: 52,
        background: 'var(--bg-primary)',
        borderTop: '1px solid var(--border-color)',
        display: 'flex', alignItems: 'center',
        padding: '0 8px', gap: 8, zIndex: 100,
      }}>
        {/* Avatar + status — click to pick status */}
        <div ref={statusRef} style={{ position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => setShowStatusPicker(v => !v)}
            style={{ cursor: 'pointer', position: 'relative', width: 32, height: 32 }}
            title={`Status: ${currentStatus.label}`}
          >
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="avatar" style={{ width: 32, height: 32 }} />
              : <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: 'var(--color-accent)' }}>{getInitials(user.display_name || user.username)}</div>
            }
            {/* Status dot */}
            <div style={{
              position: 'absolute', bottom: -1, right: -1,
              width: 12, height: 12, borderRadius: '50%',
              background: currentStatus.color,
              border: '2px solid var(--bg-primary)',
            }} />
          </div>

          {/* Status picker */}
          {showStatusPicker && (
            <div style={{
              position: 'absolute', bottom: 44, left: 0,
              background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
              borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              minWidth: 200, padding: '4px 0', zIndex: 200,
            }}>
              <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Set Status
              </div>
              {STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => handleStatus(opt.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', fontSize: 13, color: 'var(--color-text)', background: status === opt.value ? 'var(--bg-hover)' : 'none', cursor: 'pointer', fontWeight: status === opt.value ? 600 : 400 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = status === opt.value ? 'var(--bg-hover)' : 'none'; }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: opt.color, flexShrink: 0 }} />
                  {opt.label}
                </button>
              ))}
              <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />
              <button
                onClick={handleSwitchAccount}
                style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '8px 12px', fontSize: 13, color: 'var(--color-text-muted)', background: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--color-text)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
              >
                <RefreshCw size={13} /> Switch Accounts
              </button>
            </div>
          )}
        </div>

        {/* Name + status text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="truncate" style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>
            {user.display_name || user.username}
          </div>
          <div className="truncate" style={{ fontSize: 11, color: currentStatus.color, lineHeight: 1.3 }}>
            {currentStatus.label}
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 1, flexShrink: 0 }}>
          <button className="btn btn-icon btn-ghost btn-sm" title={muted ? 'Unmute' : 'Mute'} onClick={handleMute}
            style={{ color: muted ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {muted ? <MicOff size={15} /> : <Mic size={15} />}
          </button>
          <button className="btn btn-icon btn-ghost btn-sm" title={deafened ? 'Undeafen' : 'Deafen'} onClick={handleDeafen}
            style={{ color: deafened ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
            {deafened ? <HeadphoneOff size={15} /> : <Headphones size={15} />}
          </button>
          <button className="btn btn-icon btn-ghost btn-sm" title="Settings" onClick={() => setShowSettings(true)}>
            <Settings size={15} />
          </button>
        </div>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
