import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../../utils/api.js';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(err.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Reset your password</h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="card" style={{ padding: 28 }}>
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
              <p style={{ fontWeight: 600, marginBottom: 8 }}>Check your inbox</p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                If an account with that email exists, a reset link has been sent. It expires in 1 hour.
              </p>
            </div>
          ) : (
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Email address</label>
                <input
                  type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                />
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: 'var(--color-danger,#ef4444)', marginBottom: 12 }}>
                  {error}
                </div>
              )}
              <button
                type="submit" disabled={loading}
                style={{ width: '100%', padding: '10px 0', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg,#7c3aed,#3b82f6)', color: '#fff', fontWeight: 700, fontSize: 15, opacity: loading ? 0.6 : 1 }}
              >
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: 'var(--color-text-muted)' }}>
          <Link to="/" style={{ color: 'var(--color-accent)' }}>← Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
