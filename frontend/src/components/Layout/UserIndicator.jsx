import { motion } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, Settings, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { getInitials } from '../../utils/helpers.js';
import SettingsModal from '../Settings/Settings.jsx';

export default function UserIndicator({ user }) {
  const { settings, logout } = useAuthStore();
  const constraintsRef = useRef(null);
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);

  const savedX = settings?.indicator_x ?? null;
  const savedY = settings?.indicator_y ?? null;

  const initialX = savedX ?? 0;
  const initialY = savedY ?? 0;

  async function onDragEnd(_, info) {
    const { updateSettings } = useAuthStore.getState();
    await updateSettings({ indicator_x: Math.round(info.point.x), indicator_y: Math.round(info.point.y) });
  }

  if (!user) return null;

  return (
    <>
      <div ref={constraintsRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 998 }} />
      <motion.div
        drag
        dragConstraints={constraintsRef}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        initial={{ x: initialX, y: initialY }}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 'calc(var(--sidebar-width) + 72px)',
          zIndex: 999,
          cursor: 'grab',
          userSelect: 'none',
        }}
        whileDrag={{ cursor: 'grabbing', scale: 1.02 }}
      >
        <div style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid var(--border-color)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          width: 230,
        }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            {user.avatar_url
              ? <img src={user.avatar_url} alt="" className="avatar" style={{ width: 32, height: 32 }} />
              : <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: 'var(--color-accent)' }}>{getInitials(user.display_name || user.username)}</div>
            }
            <div className="status-dot status-online" style={{ position: 'absolute', bottom: -1, right: -1 }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="truncate" style={{ fontSize: 13, fontWeight: 600 }}>{user.display_name || user.username}</div>
            <div className="truncate text-xs text-faint">{user.username}</div>
          </div>
          <div style={{ display: 'flex', gap: 2 }}>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              title={muted ? 'Unmute' : 'Mute'}
              onClick={() => setMuted(m => !m)}
              style={{ color: muted ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
            >
              {muted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>
            <button
              className="btn btn-icon btn-ghost btn-sm"
              title={deafened ? 'Undeafen' : 'Deafen'}
              onClick={() => setDeafened(d => !d)}
              style={{ color: deafened ? 'var(--color-danger)' : 'var(--color-text-muted)' }}
            >
              {deafened ? <HeadphoneOff size={15} /> : <Headphones size={15} />}
            </button>
            <button className="btn btn-icon btn-ghost btn-sm" title="Settings" onClick={() => setShowSettings(true)}>
              <Settings size={15} />
            </button>
          </div>
        </div>
      </motion.div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
