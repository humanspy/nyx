import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../../utils/api.js';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('No verification token provided.'); return; }
    authApi.verifyEmail(token)
      .then(() => setStatus('success'))
      .catch((err) => { setStatus('error'); setMessage(err.data?.error || 'Invalid or expired verification link.'); });
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 400, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64, borderRadius: 20,
          background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
          marginBottom: 20, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px',
        }}>
          NYX
        </div>

        {status === 'loading' && (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verifying your email…</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Just a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Email verified!</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>
              Your email address has been confirmed.
            </p>
            <Link to="/" style={{
              display: 'inline-block', padding: '10px 28px', borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              Continue to NYX
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✕</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Verification failed</h1>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 24 }}>{message}</p>
            <Link to="/" style={{
              display: 'inline-block', padding: '10px 28px', borderRadius: 8,
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              color: '#fff', fontWeight: 700, fontSize: 14,
            }}>
              Back to NYX
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
