import { useState, useRef, useMemo } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { usersApi, mediaApi, authApi } from '../../utils/api.js';
import { Bell, Palette, Shield, User, Upload, X, Volume2, Check, AlertTriangle, Trash2, Lock } from 'lucide-react';
import UICustomizer from './UICustomizer.jsx';

const TABS = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'notifications', label: 'Notifications & Sound', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
];

export default function Settings({ onClose }) {
  const { user, settings, updateSettings } = useAuthStore();
  const [tab, setTab] = useState('profile');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: 760, maxHeight: '90vh', display: 'flex', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: 'var(--bg-primary)', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
        {/* Sidebar */}
        <div style={{ width: 200, background: 'var(--bg-secondary)', padding: '24px 8px', display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
          <div style={{ padding: '0 8px 16px', fontSize: 12, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 1 }}>Settings</div>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--radius-md)', background: tab === t.id ? 'var(--bg-hover)' : 'transparent', color: tab === t.id ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: tab === t.id ? 600 : 400, fontSize: 14, textAlign: 'left', transition: 'all 0.1s' }}>
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
          <div style={{ marginTop: 'auto', padding: '16px 8px 0', borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Logged in as</div>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.display_name || user?.username}</div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{TABS.find(t => t.id === tab)?.label}</h2>
            <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-hover)', color: 'var(--color-text-muted)' }}>
              <X size={16} />
            </button>
          </div>

          {tab === 'profile' && <ProfileTab user={user} updateSettings={updateSettings} />}
          {tab === 'notifications' && <NotificationsTab settings={settings} updateSettings={updateSettings} />}
          {tab === 'appearance' && <UICustomizer settings={settings} updateSettings={updateSettings} />}
          {tab === 'privacy' && <PrivacyTab user={user} onClose={onClose} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, updateSettings }) {
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateSettings({ display_name: displayName, bio });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Field label="Display Name">
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder={user?.username} style={{ width: '100%' }} />
      </Field>
      <Field label="Bio" hint="Max 200 characters">
        <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={200} rows={3} style={{ width: '100%', resize: 'vertical' }} />
      </Field>
      <button onClick={save} disabled={saving} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#fff', fontWeight: 600 }}>
        {saved ? <><Check size={14} /> Saved</> : saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

function NotificationsTab({ settings, updateSettings }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const ringtoneUrl = settings?.ringtone_url;
  const ringtoneName = settings?.ringtone_name;

  async function handleRingtoneUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('Please select an audio file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Ringtone must be under 5 MB.'); return; }
    setUploading(true);
    try {
      const { url, fileId } = await mediaApi.uploadRingtone(file);
      await updateSettings({ ringtone_file_id: fileId, ringtone_name: file.name, ringtone_url: url });
      setPreview(url);
    } catch (err) {
      alert('Upload failed: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }

  async function removeRingtone() {
    await updateSettings({ ringtone_file_id: null, ringtone_name: null, ringtone_url: null });
  }

  function playPreview() {
    const url = preview || ringtoneUrl;
    if (!url) return;
    const a = new Audio(url); a.volume = 0.6; a.play().catch(() => {});
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Section title="Voice Channel Ringtone" description="Plays when someone joins a voice channel while you're not in it. Synced across all your devices.">
        {(ringtoneUrl || preview) ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <Volume2 size={16} style={{ color: 'var(--color-accent)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ringtoneName || 'Custom ringtone'}</span>
            <button onClick={playPreview} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', color: 'var(--color-text-muted)' }}>Preview</button>
            <button onClick={removeRingtone} style={{ color: 'var(--color-danger, #ef4444)', padding: 4 }}><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', color: 'var(--color-text-muted)', border: '1px dashed var(--border-color)', fontSize: 14 }}>
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Ringtone (MP3, OGG, WAV — max 5 MB)'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleRingtoneUpload} />
        {(ringtoneUrl || preview) && (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ alignSelf: 'flex-start', fontSize: 12, color: 'var(--color-text-muted)', marginTop: -8 }}>
            {uploading ? 'Uploading…' : 'Replace ringtone'}
          </button>
        )}
      </Section>

      <Section title="Notification Sounds">
        <ToggleSetting label="Message sounds" value={settings?.notif_sounds !== false} onChange={v => updateSettings({ notif_sounds: v })} />
        <ToggleSetting label="Mention sounds" value={settings?.mention_sounds !== false} onChange={v => updateSettings({ mention_sounds: v })} />
      </Section>
    </div>
  );
}

function PrivacyTab({ user, onClose }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
        <div style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 8 }}>End-to-End Encryption</div>
        NYX encrypts all messages and files end-to-end using X25519 key exchange and AES-256-GCM. Your encryption keys are stored only on your devices — even NYX cannot read your messages.
        <br /><br />
        Voice and video calls are encrypted at the media frame level using AES-GCM via the WebRTC Insertable Streams API, in addition to mandatory DTLS-SRTP transport encryption.
      </div>
      <div style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>
        Read our full <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Privacy Policy</a> and <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Terms of Service</a>.
      </div>

      {/* Change password */}
      <ChangePasswordSection />

      {/* Danger zone */}
      <DangerZone user={user} onClose={onClose} />
    </div>
  );
}

function checkPassword(pw) {
  return {
    length:  pw.length >= 8,
    letters: (pw.match(/[a-zA-Z]/g) || []).length >= 4,
    upper:   /[A-Z]/.test(pw),
    symbol:  /[^a-zA-Z0-9]/.test(pw),
  };
}

function ChangePasswordSection() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ current: '', next: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { logout } = useAuthStore();

  const pwChecks = useMemo(() => checkPassword(form.next), [form.next]);
  const pwValid = Object.values(pwChecks).every(Boolean);

  async function save() {
    if (!form.current) { setError('Enter your current password.'); return; }
    if (!pwValid) { setError('New password does not meet the requirements.'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.changePassword(form.current, form.next);
      setSuccess(true);
      setTimeout(() => { logout(); }, 2000);
    } catch (err) {
      setError(err.data?.error || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        onClick={() => { setOpen(o => !o); setError(''); setSuccess(false); setForm({ current: '', next: '' }); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 14, textAlign: 'left', cursor: 'pointer' }}
      >
        <Lock size={15} />
        Change Password
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          {success ? (
            <div style={{ padding: '12px 0', fontSize: 14, color: '#22c55e' }}>
              Password changed. Signing you out…
            </div>
          ) : (
            <>
              <div className="form-group" style={{ marginTop: 14 }}>
                <label className="form-label">Current password</label>
                <input type="password" placeholder="••••••••" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">New password</label>
                <input type="password" placeholder="••••••••" value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} />
              </div>
              {form.next.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12, padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 12 }}>
                  {[
                    [pwChecks.length,  'At least 8 characters'],
                    [pwChecks.letters, 'At least 4 letters'],
                    [pwChecks.upper,   'At least 1 uppercase letter'],
                    [pwChecks.symbol,  'At least 1 symbol (e.g. ! @ # $)'],
                  ].map(([ok, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: ok ? '#22c55e' : 'var(--color-text-faint)' }}>
                      {ok ? <Check size={10} /> : <X size={10} />} {label}
                    </div>
                  ))}
                </div>
              )}
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '7px 10px', fontSize: 13, color: 'var(--color-danger,#ef4444)', marginBottom: 10 }}>
                  {error}
                </div>
              )}
              <button
                onClick={save} disabled={loading || !pwValid || !form.current}
                style={{ padding: '8px 20px', borderRadius: 6, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 13, opacity: (loading || !pwValid || !form.current) ? 0.55 : 1, cursor: (loading || !pwValid || !form.current) ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving…' : 'Update Password'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function DangerZone({ user, onClose }) {
  const { logout } = useAuthStore();
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const isPending = !!user?.deletion_scheduled_at;
  const deletionDate = isPending ? new Date(user.deletion_scheduled_at) : null;

  async function scheduleDelete() {
    if (confirmText !== user?.username) { setError('Username does not match.'); return; }
    setDeleting(true);
    setError('');
    try {
      await usersApi.scheduleAccountDeletion();
      logout();
      onClose?.();
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to schedule deletion.');
    } finally {
      setDeleting(false);
    }
  }

  async function cancelDelete() {
    setCancelling(true);
    try {
      await usersApi.reactivateAccount();
      // Refresh user data
      window.location.reload();
    } catch (err) {
      setError(err.data?.error || err.message || 'Failed to cancel deletion.');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <AlertTriangle size={15} style={{ color: 'var(--color-danger, #ef4444)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger, #ef4444)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danger Zone</span>
      </div>

      {isPending ? (
        /* Account is already scheduled for deletion */
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-danger, #ef4444)', marginBottom: 6 }}>
            Account scheduled for deletion
          </div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            Your account and all your messages will be permanently deleted on{' '}
            <strong>{deletionDate?.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
            {' '}You can cancel this before that date.
          </div>
          {error && <div style={{ fontSize: 12, color: 'var(--color-danger, #ef4444)', marginBottom: 8 }}>{error}</div>}
          <button
            onClick={cancelDelete}
            disabled={cancelling}
            style={{ padding: '8px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14 }}
          >
            {cancelling ? 'Cancelling…' : 'Cancel Account Deletion'}
          </button>
        </div>
      ) : confirming ? (
        /* Confirmation prompt */
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius-md)' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Are you sure?</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 14, lineHeight: 1.6 }}>
            Your account will be scheduled for <strong>permanent deletion in 3 days</strong>. All your messages will be deleted. You will be logged out immediately. You can log back in during those 3 days to cancel.
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            Type your username <strong>{user?.username}</strong> to confirm:
          </div>
          <input
            value={confirmText}
            onChange={e => { setConfirmText(e.target.value); setError(''); }}
            placeholder={user?.username}
            style={{ width: '100%', marginBottom: 10 }}
            onKeyDown={e => e.key === 'Enter' && scheduleDelete()}
            autoFocus
          />
          {error && <div style={{ fontSize: 12, color: 'var(--color-danger, #ef4444)', marginBottom: 8 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={scheduleDelete}
              disabled={deleting || confirmText !== user?.username}
              style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger, #ef4444)', color: '#fff', fontWeight: 600, fontSize: 13, opacity: confirmText !== user?.username ? 0.5 : 1 }}
            >
              {deleting ? 'Scheduling…' : 'Delete My Account'}
            </button>
            <button onClick={() => { setConfirming(false); setConfirmText(''); setError(''); }} style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Idle state */
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Delete Account</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
              Permanently delete your account and all messages after a 3-day grace period.
            </div>
          </div>
          <button
            onClick={() => setConfirming(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger, #ef4444)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(239,68,68,0.25)', flexShrink: 0, marginLeft: 16 }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        {label} {hint && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— {hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{title}</div>
      {description && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{description}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}

function ToggleSetting({ label, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <button onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? 'var(--color-accent)' : 'var(--bg-hover)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left 0.2s' }} />
      </button>
    </div>
  );
}
