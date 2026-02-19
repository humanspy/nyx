import { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useAuthStore } from '../../store/authStore.js';
import { authApi } from '../../utils/api.js';

export default function EmailVerificationBanner() {
  const { promptEmailVerification, dismissEmailPrompt } = useAuthStore();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  if (!promptEmailVerification) return null;

  async function resend() {
    setSending(true);
    try {
      await authApi.resendVerification();
      setSent(true);
    } catch { /* ignore */ }
    finally { setSending(false); }
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
      color: '#fff', padding: '10px 16px',
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 500,
    }}>
      <Mail size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>
        {sent
          ? 'Verification email sent! Check your inbox.'
          : 'Please verify your email address to keep your account secure.'}
      </span>
      {!sent && (
        <button
          onClick={resend} disabled={sending}
          style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
        >
          {sending ? 'Sending…' : 'Resend email'}
        </button>
      )}
      <button onClick={dismissEmailPrompt} style={{ background: 'none', color: '#fff', padding: 4, cursor: 'pointer', flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  );
}
