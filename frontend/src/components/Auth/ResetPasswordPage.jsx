import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { authApi } from '../../utils/api.js';

function checkPassword(pw) {
  return {
    length:  pw.length >= 8,
    letters: (pw.match(/[a-zA-Z]/g) || []).length >= 4,
    upper:   /[A-Z]/.test(pw),
    symbol:  /[^a-zA-Z0-9]/.test(pw),
  };
}

function PwRule({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? '#22c55e' : 'var(--color-text-faint)' }}>
      {ok ? <Check size={11} /> : <X size={11} />}
      {label}
    </div>
  );
}

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const pwChecks = useMemo(() => checkPassword(password), [password]);
  const pwValid = Object.values(pwChecks).every(Boolean);

  async function submit(e) {
    e.preventDefault();
    if (!pwValid) { setError('Password does not meet the requirements below.'); return; }
    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>Invalid reset link.</p>
          <Link to="/" style={{ color: 'var(--color-accent)', fontSize: 14 }}>← Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            marginBottom: 14, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px',
          }}>
            NYX
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Choose a new password</h1>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {done ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Password updated!</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginBottom: 20 }}>
                All sessions have been signed out. Please sign in with your new password.
              </p>
              <Link to="/" style={{
                display: 'inline-block', padding: '10px 28px', borderRadius: 8,
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                color: '#fff', fontWeight: 700, fontSize: 14,
              }}>
                Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input
                  type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required autoFocus minLength={8}
                />
              </div>
              {password.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                  <PwRule ok={pwChecks.length}  label="At least 8 characters" />
                  <PwRule ok={pwChecks.letters} label="At least 4 letters" />
                  <PwRule ok={pwChecks.upper}   label="At least 1 uppercase letter" />
                  <PwRule ok={pwChecks.symbol}  label="At least 1 symbol (e.g. ! @ # $)" />
                </div>
              )}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-danger,#ef4444)', marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <button
                type="submit" disabled={loading || !pwValid}
                style={{ width: '100%', padding: '10px 0', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff', fontWeight: 700, fontSize: 15, opacity: (loading || !pwValid) ? 0.55 : 1, cursor: (loading || !pwValid) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          )}
        </div>

        {!done && (
          <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Link to="/" style={{ color: 'var(--color-accent)' }}>← Back to Sign In</Link>
          </div>
        )}
      </div>
    </div>
  );
}
