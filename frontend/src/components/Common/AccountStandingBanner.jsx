import { useEffect, useState } from 'react';
import { AlertTriangle, ShieldOff } from 'lucide-react';
import { reportsApi } from '../../utils/api.js';
import { useAuthStore } from '../../store/authStore.js';

const STATUS_CONFIG = {
  warning: {
    icon: AlertTriangle,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    border: 'rgba(245,158,11,0.35)',
    message: 'Your account has received a warning. Please review our community guidelines.',
  },
  restricted: {
    icon: ShieldOff,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    border: 'rgba(239,68,68,0.35)',
    message: 'Your account has been restricted. Some features may be limited.',
  },
  suspended: {
    icon: ShieldOff,
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.15)',
    border: 'rgba(239,68,68,0.4)',
    message: 'Your account has been suspended. Contact support if you believe this is an error.',
  },
};

export default function AccountStandingBanner() {
  const { token } = useAuthStore();
  const [standing, setStanding] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!token) return;
    reportsApi.getStanding()
      .then(data => {
        if (data?.status && data.status !== 'good') setStanding(data);
      })
      .catch(() => {});
  }, [token]);

  if (!standing || dismissed) return null;
  const cfg = STATUS_CONFIG[standing.status];
  if (!cfg) return null;
  const Icon = cfg.icon;

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8, padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
      fontSize: 13, color: 'var(--color-text)',
      margin: '8px 12px 0',
    }}>
      <Icon size={15} style={{ color: cfg.color, flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1 }}>
        <strong style={{ color: cfg.color }}>Account {standing.status.charAt(0).toUpperCase() + standing.status.slice(1)}</strong>
        {' — '}
        <span style={{ color: 'var(--color-text-muted)' }}>{cfg.message}</span>
        {standing.reason && (
          <div style={{ marginTop: 4, color: 'var(--color-text-muted)', fontSize: 12 }}>
            Reason: {standing.reason}
          </div>
        )}
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}>×</button>
    </div>
  );
}
