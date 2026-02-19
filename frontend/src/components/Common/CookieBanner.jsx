import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'nyx_cookie_consent';

export function useCookieConsent() {
  const accepted = localStorage.getItem(STORAGE_KEY);
  return { accepted: accepted === 'true' };
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => localStorage.getItem(STORAGE_KEY) === null);

  if (!visible) return null;

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  }

  function decline() {
    // NYX requires essential storage to function (auth token).
    // Inform the user and keep the banner open rather than breaking the site.
    localStorage.setItem(STORAGE_KEY, 'false');
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      style={{
        position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        zIndex: 2000,
        width: 'min(620px, calc(100vw - 32px))',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        padding: '16px 20px',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: 2 }}>
        <Cookie size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
          We use essential storage only
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.55 }}>
          NYX stores your authentication token and UI preferences in <strong>localStorage</strong>. We use no third-party cookies or tracking technologies. Your messages are end-to-end encrypted and never read by us.{' '}
          <Link to="/privacy" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
        <button
          onClick={decline}
          title="Decline (site may not function)"
          style={{
            padding: '6px 14px', borderRadius: 'var(--radius-md)',
            background: 'var(--bg-hover)',
            color: 'var(--color-text-muted)',
            fontSize: 13, fontWeight: 500,
          }}
        >
          Decline
        </button>
        <button
          onClick={accept}
          style={{
            padding: '6px 16px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)', color: '#fff',
            fontSize: 13, fontWeight: 600,
          }}
        >
          Accept
        </button>
        <button
          onClick={accept}
          title="Dismiss"
          style={{ color: 'var(--color-text-faint)', padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
