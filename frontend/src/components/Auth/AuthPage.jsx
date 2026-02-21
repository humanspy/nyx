import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { Check, X } from 'lucide-react';

function checkPassword(pw) {
  return {
    length:   pw.length >= 8,
    letters:  (pw.match(/[a-zA-Z]/g) || []).length >= 4,
    upper:    /[A-Z]/.test(pw),
    symbol:   /[^a-zA-Z0-9]/.test(pw),
  };
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ username: '', email: '', password: '', tosAccepted: false, stayLoggedIn: true });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setCheck = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.checked }));

  const pwChecks = useMemo(() => checkPassword(form.password), [form.password]);
  const pwValid = Object.values(pwChecks).every(Boolean);

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (mode === 'register') {
      if (!form.email) { setError('Email address is required.'); return; }
      if (!pwValid) { setError('Password does not meet the requirements below.'); return; }
      if (!form.tosAccepted) { setError('You must accept the Terms of Service and Privacy Policy to continue.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.username, form.password, form.stayLoggedIn);
      } else {
        await register(form.username, form.email, form.password, true);
      }
    } catch (err) {
      setError(err.data?.error || err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)' }}>
      <div style={{ width: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 20,
            background: 'linear-gradient(135deg, #7c3aed 0%, #3b82f6 100%)',
            marginBottom: 14, fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: '-1px',
          }}>
            NYX
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4 }}>
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Private, end-to-end encrypted communication
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'var(--bg-primary)', borderRadius: 'var(--radius-md)', padding: 3 }}>
            {['login', 'register'].map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '7px 0', borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: mode === m ? 'var(--color-accent)' : 'transparent',
                  color: mode === m ? '#fff' : 'var(--color-text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <form onSubmit={submit}>
            {mode === 'register' && (
              <div className="form-group">
                <label className="form-label">
                  Email <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={set('email')}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                type="text" placeholder="username" value={form.username}
                onChange={set('username')} required autoFocus={mode === 'login'} minLength={2} maxLength={32}
              />
            </div>

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                {mode === 'login' && (
                  <Link to="/forgot-password" style={{ fontSize: 12, color: 'var(--color-accent)' }}>
                    Forgot password?
                  </Link>
                )}
              </div>
              <input
                type="password" placeholder="••••••••" value={form.password}
                onChange={set('password')} required minLength={8}
              />
            </div>

            {mode === 'register' && form.password.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 14, padding: '10px 12px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                <PwRule ok={pwChecks.length} label="At least 8 characters" />
                <PwRule ok={pwChecks.letters} label="At least 4 letters" />
                <PwRule ok={pwChecks.upper}  label="At least 1 uppercase letter" />
                <PwRule ok={pwChecks.symbol} label="At least 1 symbol (e.g. ! @ # $)" />
              </div>
            )}

            {mode === 'register' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer', fontSize: 13, lineHeight: 1.6, color: 'var(--color-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={form.tosAccepted}
                    onChange={setCheck('tosAccepted')}
                    style={{ width: 'auto', marginTop: 3, flexShrink: 0 }}
                  />
                  <span>
                    I have read and agree to the{' '}
                    <Link to="/terms" target="_blank" style={{ color: 'var(--color-accent)' }}>Terms of Service</Link>
                    {' '}and{' '}
                    <Link to="/privacy" target="_blank" style={{ color: 'var(--color-accent)' }}>Privacy Policy</Link>.
                    I understand that NYX uses end-to-end encryption and my private key cannot be recovered if I lose my password.
                  </span>
                </label>
              </div>
            )}

            {/* Stay logged in (login mode only) */}
            {mode === 'login' && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', gap: 10, alignItems: 'center', cursor: 'pointer', fontSize: 13, color: 'var(--color-text-muted)' }}>
                  <input
                    type="checkbox"
                    checked={form.stayLoggedIn}
                    onChange={setCheck('stayLoggedIn')}
                    style={{ width: 'auto', flexShrink: 0, accentColor: 'var(--color-accent)' }}
                  />
                  Stay logged in
                </label>
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-danger, #ef4444)', marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === 'register' && (!form.tosAccepted || !pwValid))}
              style={{
                width: '100%', padding: '10px 0', borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                opacity: (loading || (mode === 'register' && (!form.tosAccepted || !pwValid))) ? 0.55 : 1,
                transition: 'opacity 0.15s',
                cursor: (loading || (mode === 'register' && (!form.tosAccepted || !pwValid))) ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--color-text-faint)' }}>
          <Link to="/terms" style={{ color: 'var(--color-text-faint)' }}>Terms</Link>
          {' · '}
          <Link to="/privacy" style={{ color: 'var(--color-text-faint)' }}>Privacy</Link>
          {' · '}
          nyx.spygaming.dev
        </div>
      </div>
    </div>
  );
}

function PwRule({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? '#22c55e' : 'var(--color-text-faint)' }}>
      {ok ? <Check size={11} /> : <X size={11} />}
      {label}
    </div>
  );
}
