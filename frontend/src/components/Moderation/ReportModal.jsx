import { useState } from 'react';
import { Flag, ChevronRight, X } from 'lucide-react';
import { reportsApi } from '../../utils/api.js';

const CATEGORIES = {
  user: [
    { id: 'harassment',      label: 'Harassment or bullying' },
    { id: 'hate_speech',     label: 'Hate speech or symbols' },
    { id: 'impersonation',   label: 'Impersonation' },
    { id: 'spam',            label: 'Spam or scam' },
    { id: 'self_harm',       label: 'Encouraging self-harm or suicide' },
    { id: 'violent_content', label: 'Threats or violent content' },
    { id: 'illegal_content', label: 'Illegal content or activity' },
    { id: 'other',           label: 'Something else' },
  ],
  message: [
    { id: 'harassment',      label: 'Harassment or bullying' },
    { id: 'hate_speech',     label: 'Hate speech or symbols' },
    { id: 'spam',            label: 'Spam or scam links' },
    { id: 'violent_content', label: 'Graphic or violent content' },
    { id: 'sexual_content',  label: 'Explicit sexual content' },
    { id: 'self_harm',       label: 'Encouraging self-harm or suicide' },
    { id: 'illegal_content', label: 'Illegal content or activity' },
    { id: 'misinformation',  label: 'Dangerous misinformation' },
    { id: 'other',           label: 'Something else' },
  ],
  server: [
    { id: 'hate_speech',     label: 'Hate speech or symbols' },
    { id: 'violent_content', label: 'Promoting violence or terrorism' },
    { id: 'sexual_content',  label: 'Explicit sexual content' },
    { id: 'illegal_content', label: 'Illegal content or activity' },
    { id: 'spam',            label: 'Spam or scam operation' },
    { id: 'misinformation',  label: 'Dangerous misinformation' },
    { id: 'other',           label: 'Something else' },
  ],
};

const TYPE_LABELS = {
  user:    'User',
  message: 'Message',
  server:  'Server',
};

export default function ReportModal({ type, targetId, onClose }) {
  const [step, setStep] = useState('category'); // category | details | done
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const categories = CATEGORIES[type] || CATEGORIES.user;

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await reportsApi.submit({ reportType: type, targetId, category, details: details.trim() || undefined });
      setStep('done');
    } catch (err) {
      setError(err.data?.error || 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: 460, background: 'var(--bg-primary)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '18px 20px 14px', borderBottom: '1px solid var(--border-color)' }}>
          <Flag size={18} style={{ color: 'var(--color-danger,#ef4444)' }} />
          <span style={{ fontWeight: 700, fontSize: 16 }}>Report {TYPE_LABELS[type]}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {step === 'category' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>
                What best describes what you're reporting?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setStep('details'); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '11px 14px', borderRadius: 8, fontSize: 14,
                      background: 'var(--bg-secondary)', color: 'var(--color-text)',
                      textAlign: 'left', cursor: 'pointer',
                      border: '1px solid transparent',
                      transition: 'border-color 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                  >
                    {cat.label}
                    <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'details' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 6 }}>
                <strong style={{ color: 'var(--color-text)' }}>{categories.find(c => c.id === category)?.label}</strong>
              </p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14 }}>
                Add any additional details to help our team review this report (optional).
              </p>
              <textarea
                value={details}
                onChange={e => setDetails(e.target.value)}
                placeholder="Describe what happened…"
                maxLength={500}
                rows={4}
                style={{ width: '100%', resize: 'vertical', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--color-text)', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', textAlign: 'right', marginBottom: 14 }}>
                {details.length}/500
              </div>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 10px', fontSize: 13, color: 'var(--color-danger,#ef4444)', marginBottom: 10 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('category')} style={{ flex: 1, padding: '9px 0', borderRadius: 8, background: 'var(--bg-secondary)', color: 'var(--color-text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  Back
                </button>
                <button
                  onClick={submit} disabled={loading}
                  style={{ flex: 2, padding: '9px 0', borderRadius: 8, background: 'var(--color-danger,#ef4444)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}
                >
                  {loading ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </>
          )}

          {step === 'done' && (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✓</div>
              <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Report submitted</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 20 }}>
                Thank you for helping keep NYX safe. Our team will review your report.
              </p>
              <button
                onClick={onClose}
                style={{ padding: '9px 28px', borderRadius: 8, background: 'var(--color-accent)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
