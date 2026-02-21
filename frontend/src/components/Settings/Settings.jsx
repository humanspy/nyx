import { useState, useRef, useMemo, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore.js';
import { usersApi, mediaApi, authApi } from '../../utils/api.js';
import {
  User, Bell, Palette, Shield, Mic, Monitor, Keyboard,
  Globe, Sliders, X, Upload, Check, AlertTriangle, Trash2,
  Lock, LogOut, Eye, EyeOff, Camera, ChevronRight,
} from 'lucide-react';
import UICustomizer from './UICustomizer.jsx';

const SECTIONS = [
  {
    label: 'USER SETTINGS',
    items: [
      { id: 'account',  label: 'My Account',       icon: User },
      { id: 'profiles', label: 'Profiles',          icon: User },
      { id: 'privacy',  label: 'Privacy & Safety',  icon: Shield },
    ],
  },
  {
    label: 'APP SETTINGS',
    items: [
      { id: 'appearance',    label: 'Appearance',       icon: Palette },
      { id: 'notifications', label: 'Notifications',    icon: Bell },
      { id: 'voice',         label: 'Voice & Video',    icon: Mic },
      { id: 'keybinds',      label: 'Keybinds',         icon: Keyboard },
      { id: 'advanced',      label: 'Advanced',         icon: Sliders },
    ],
  },
];

export default function Settings({ onClose }) {
  const { user, settings, updateSettings, logout } = useAuthStore();
  const [tab, setTab] = useState('account');

  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Left nav */}
      <div style={{
        width: 232, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }}>
        <div style={{ flex: 1, padding: '60px 8px 8px' }}>
          {SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 16 }}>
              <div style={{ padding: '4px 10px 6px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)' }}>
                {section.label}
              </div>
              {section.items.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '8px 10px', borderRadius: 4, fontSize: 14, cursor: 'pointer',
                    background: tab === item.id ? 'var(--bg-hover)' : 'none',
                    color: tab === item.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontWeight: tab === item.id ? 600 : 400,
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (tab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (tab !== item.id) e.currentTarget.style.background = 'none'; }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 10px' }} />

          <button
            onClick={() => { logout(); onClose(); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: '8px 10px', borderRadius: 4, fontSize: 14, cursor: 'pointer',
              color: 'var(--color-danger)', background: 'none', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>

        {/* Version */}
        <div style={{ padding: '8px 18px 16px', fontSize: 11, color: 'var(--color-text-faint)' }}>
          NYX v1.0.0
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 740, width: '100%', padding: '60px 40px 80px' }}>
          {tab === 'account'       && <AccountTab user={user} />}
          {tab === 'profiles'      && <ProfilesTab user={user} updateSettings={updateSettings} />}
          {tab === 'privacy'       && <PrivacyTab user={user} onClose={onClose} />}
          {tab === 'appearance'    && <UICustomizer settings={settings} updateSettings={updateSettings} />}
          {tab === 'notifications' && <NotificationsTab settings={settings} updateSettings={updateSettings} />}
          {tab === 'voice'         && <VoiceTab />}
          {tab === 'keybinds'      && <PlaceholderTab title="Keybinds" desc="Custom keybinds are not yet supported." />}
          {tab === 'advanced'      && <PlaceholderTab title="Advanced" desc="Advanced settings coming soon." />}
        </div>
      </div>

      {/* Close button area */}
      <div style={{ width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 8 }}>
        <button
          onClick={onClose}
          style={{
            width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--color-text-muted)', color: 'var(--color-text-muted)', cursor: 'pointer', background: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
        >
          <X size={18} />
        </button>
        <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>ESC</span>
      </div>
    </div>
  );
}

/* ─── My Account ─── */
function AccountTab({ user }) {
  const { updateSettings, logout } = useAuthStore();
  const [editField, setEditField] = useState(null); // 'displayName' | 'username' | 'email'
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit(field, current) {
    setEditField(field);
    setValue(current || '');
    setError('');
  }

  async function saveField(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (editField === 'displayName') await updateSettings({ display_name: value.trim() || null });
      setEditField(null);
    } catch (err) { setError(err.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={h2Style}>My Account</h2>

      {/* Profile card */}
      <div style={{ borderRadius: 8, overflow: 'hidden', marginBottom: 32 }}>
        {/* Banner */}
        <div style={{ height: 100, background: 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)' }} />
        {/* Avatar + username row */}
        <div style={{ background: 'var(--bg-secondary)', padding: '0 16px 16px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, paddingTop: 0 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: '6px solid var(--bg-secondary)', overflow: 'hidden', marginTop: -40, flexShrink: 0, background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff' }}>
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (user?.display_name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ paddingBottom: 8 }}>
              <div style={{ fontWeight: 700, fontSize: 20 }}>{user?.display_name || user?.username}</div>
              <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>{user?.username}</div>
            </div>
            <button
              onClick={() => setEditField('profile')}
              style={{ marginLeft: 'auto', padding: '8px 16px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', marginBottom: 8 }}
            >
              Edit User Profile
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, overflow: 'hidden' }}>
        <AccountField label="Display Name" value={user?.display_name || '—'} onEdit={() => startEdit('displayName', user?.display_name)} />
        <AccountField label="Username"     value={user?.username || '—'} onEdit={null} hint="Contact support to change username" />
        <AccountField label="Email"        value={user?.email ? maskEmail(user.email) : '—'} onEdit={null} hint="Contact support to change email" />
      </div>

      {editField === 'displayName' && (
        <div style={{ marginTop: 16, padding: 16, background: 'var(--bg-secondary)', borderRadius: 8 }}>
          <form onSubmit={saveField}>
            <div style={labelStyle}>Display Name</div>
            <input value={value} onChange={e => setValue(e.target.value)} style={inputStyle} placeholder="Enter display name" autoFocus />
            {error && <div style={errorStyle}>{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button type="submit" disabled={saving} style={btnPrimaryStyle}>{saving ? 'Saving…' : 'Save'}</button>
              <button type="button" onClick={() => setEditField(null)} style={btnGhostStyle}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ height: 1, background: 'var(--border-color)', margin: '32px 0' }} />
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Password and Authentication</h3>
      <ChangePasswordSection />
    </div>
  );
}

function maskEmail(email) {
  const [user, domain] = email.split('@');
  return '•'.repeat(Math.min(user.length, 10)) + '@' + domain;
}

function AccountField({ label, value, onEdit, hint }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 16px', borderBottom: '1px solid var(--border-color)' }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 14 }}>{value}</div>
        {hint && <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2 }}>{hint}</div>}
      </div>
      {onEdit && (
        <button onClick={onEdit} style={{ padding: '6px 16px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--border-color)', flexShrink: 0 }}>
          Edit
        </button>
      )}
    </div>
  );
}

/* ─── Profiles ─── */
function ProfilesTab({ user, updateSettings }) {
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [pronouns, setPronouns] = useState(user?.pronouns || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || null);
  const [bannerUrl, setBannerUrl] = useState(user?.banner_url || null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const avatarRef = useRef(null);
  const bannerRef = useRef(null);

  async function uploadImage(file, type) {
    setUploading(type);
    try {
      const { uploadUrl, fileId } = await mediaApi.getUploadUrl({ filename: file.name, contentType: file.type, size: file.size, purpose: type });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const { url } = await mediaApi.completeUpload({ fileId });
      if (type === 'avatar') setAvatarUrl(url);
      else setBannerUrl(url);
    } catch (err) { alert('Upload failed: ' + (err.message || 'Unknown error')); }
    finally { setUploading(null); }
  }

  async function save() {
    setSaving(true);
    try {
      await usersApi.updateMe({ display_name: displayName || null, pronouns: pronouns || null, bio: bio || null, avatar_url: avatarUrl, banner_url: bannerUrl });
      await updateSettings({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert(err.message || 'Save failed'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={h2Style}>Profiles</h2>
      <div style={{ display: 'flex', gap: 24 }}>
        {/* Left: form */}
        <div style={{ flex: 1 }}>
          {/* Banner */}
          <div style={labelStyle}>Profile Banner</div>
          <div
            onClick={() => bannerRef.current?.click()}
            style={{
              height: 100, borderRadius: 8, marginBottom: 16, cursor: 'pointer', overflow: 'hidden',
              background: bannerUrl ? `url(${bannerUrl}) center/cover` : 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)',
              border: '2px dashed var(--border-color)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 6, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6, color: '#fff', fontSize: 13 }}>
              <Camera size={14} /> {uploading === 'banner' ? 'Uploading…' : 'Change Banner'}
            </div>
          </div>
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'banner')} />

          {/* Avatar */}
          <div style={labelStyle}>Avatar</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
              {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.display_name || user?.username || '?')[0].toUpperCase()}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => avatarRef.current?.click()} style={btnAccentStyle} disabled={uploading === 'avatar'}>
                {uploading === 'avatar' ? 'Uploading…' : 'Change Avatar'}
              </button>
              {avatarUrl && <button onClick={() => setAvatarUrl(null)} style={btnDangerOutlineStyle}>Remove Avatar</button>}
            </div>
          </div>
          <input ref={avatarRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'avatar')} />

          <SettingsField label="Display Name">
            <input value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} placeholder="Enter display name" />
          </SettingsField>

          <SettingsField label="Pronouns">
            <input value={pronouns} onChange={e => setPronouns(e.target.value)} style={inputStyle} placeholder="e.g. he/him, she/her, they/them" />
          </SettingsField>

          <SettingsField label="About Me">
            <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={190} rows={4} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Tell people a bit about yourself" />
            <div style={{ fontSize: 12, color: 'var(--color-text-faint)', textAlign: 'right', marginTop: 4 }}>{bio.length}/190</div>
          </SettingsField>

          <button onClick={save} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 8 }}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Right: preview */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: 8, letterSpacing: '0.05em' }}>Preview</div>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
            <div style={{ height: 60, background: bannerUrl ? `url(${bannerUrl}) center/cover` : 'linear-gradient(135deg, var(--color-accent) 0%, #7c3aed 100%)' }} />
            <div style={{ padding: '0 12px 12px', position: 'relative' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', border: '4px solid var(--bg-secondary)', overflow: 'hidden', background: 'var(--color-accent)', marginTop: -24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.display_name || user?.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{displayName || user?.username}</div>
              {pronouns && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{pronouns}</div>}
              {bio && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>{bio}</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Privacy & Safety ─── */
function PrivacyTab({ user, onClose }) {
  return (
    <div>
      <h2 style={h2Style}>Privacy & Safety</h2>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>End-to-End Encryption</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
          NYX encrypts all messages and files end-to-end using X25519 key exchange and AES-256-GCM.
          Your encryption keys are stored only on your devices — even NYX cannot read your messages.
          <br /><br />
          Voice and video calls are encrypted at the media frame level using AES-GCM via the WebRTC Insertable Streams API, in addition to mandatory DTLS-SRTP transport encryption.
        </div>
      </div>

      <div style={{ fontSize: 13, color: 'var(--color-text-faint)', marginBottom: 32 }}>
        Read our full{' '}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Privacy Policy</a>
        {' '}and{' '}
        <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-accent)' }}>Terms of Service</a>.
      </div>

      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Password and Authentication</h3>
      <ChangePasswordSection />

      <div style={{ height: 1, background: 'var(--border-color)', margin: '32px 0' }} />
      <DangerZone user={user} onClose={onClose} />
    </div>
  );
}

/* ─── Notifications ─── */
function NotificationsTab({ settings, updateSettings }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const ringtoneUrl = settings?.ringtone_url;
  const ringtoneName = settings?.ringtone_name;

  async function handleRingtoneUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) { alert('Please select an audio file.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Max 5 MB.'); return; }
    setUploading(true);
    try {
      const { uploadUrl, fileId } = await mediaApi.getUploadUrl({ filename: file.name, contentType: file.type, size: file.size, purpose: 'ringtone' });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const { url } = await mediaApi.completeUpload({ fileId });
      await updateSettings({ ringtone_file_id: fileId, ringtone_name: file.name, ringtone_url: url });
    } catch (err) { alert('Upload failed: ' + (err.message || 'Unknown error')); }
    finally { setUploading(false); }
  }

  return (
    <div>
      <h2 style={h2Style}>Notifications</h2>

      <SettingSection title="Voice Channel Ringtone" desc="Plays when someone joins a voice channel while you're not in it.">
        {ringtoneUrl ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
            <span style={{ flex: 1, fontSize: 13 }}>{ringtoneName || 'Custom ringtone'}</span>
            <button onClick={() => { const a = new Audio(ringtoneUrl); a.volume = 0.6; a.play().catch(() => {}); }} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Preview</button>
            <button onClick={() => updateSettings({ ringtone_file_id: null, ringtone_name: null, ringtone_url: null })} style={{ color: 'var(--color-danger)', cursor: 'pointer', padding: 4 }}><X size={14} /></button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: 'var(--bg-hover)', border: '2px dashed var(--border-color)', color: 'var(--color-text-muted)', fontSize: 14, cursor: 'pointer', width: '100%' }}>
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Ringtone (MP3, OGG, WAV — max 5 MB)'}
          </button>
        )}
        <input ref={fileRef} type="file" accept="audio/*" style={{ display: 'none' }} onChange={handleRingtoneUpload} />
      </SettingSection>

      <div style={{ height: 1, background: 'var(--border-color)', margin: '24px 0' }} />

      <SettingSection title="Notification Sounds">
        <ToggleSetting label="Message sounds" value={settings?.notif_sounds !== false} onChange={v => updateSettings({ notif_sounds: v })} />
        <ToggleSetting label="Mention sounds"  value={settings?.mention_sounds !== false} onChange={v => updateSettings({ mention_sounds: v })} />
      </SettingSection>
    </div>
  );
}

/* ─── Voice & Video ─── */
function VoiceTab() {
  return (
    <div>
      <h2 style={h2Style}>Voice & Video</h2>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 24, color: 'var(--color-text-muted)', fontSize: 14, lineHeight: 1.7 }}>
        <p style={{ marginBottom: 12 }}>Voice and video settings (input/output device selection) will be available in a future update.</p>
        <p>Voice channels use end-to-end encryption via WebRTC with AES-GCM encryption applied at the media frame level.</p>
      </div>
    </div>
  );
}

function PlaceholderTab({ title, desc }) {
  return (
    <div>
      <h2 style={h2Style}>{title}</h2>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 24, color: 'var(--color-text-muted)', fontSize: 14 }}>{desc}</div>
    </div>
  );
}

/* ─── Shared sub-components ─── */
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
    if (!pwValid) { setError('New password does not meet requirements.'); return; }
    setError(''); setLoading(true);
    try {
      await authApi.changePassword(form.current, form.next);
      setSuccess(true);
      setTimeout(logout, 2000);
    } catch (err) { setError(err.data?.error || 'Failed to change password'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ border: '1px solid var(--border-color)', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={() => { setOpen(o => !o); setError(''); setSuccess(false); setForm({ current: '', next: '' }); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', color: 'var(--color-text)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
      >
        <Lock size={15} /> Change Password
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-color)' }}>
          {success ? (
            <div style={{ padding: '12px 0', fontSize: 14, color: '#22c55e' }}>Password changed. Signing you out…</div>
          ) : (
            <>
              <div style={{ marginTop: 14 }}>
                <div style={labelStyle}>Current password</div>
                <input type="password" value={form.current} onChange={e => setForm(f => ({ ...f, current: e.target.value }))} style={inputStyle} placeholder="••••••••" />
              </div>
              <div style={{ marginTop: 12 }}>
                <div style={labelStyle}>New password</div>
                <input type="password" value={form.next} onChange={e => setForm(f => ({ ...f, next: e.target.value }))} style={inputStyle} placeholder="••••••••" />
              </div>
              {form.next.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, margin: '10px 0', padding: '8px 10px', background: 'var(--bg-primary)', borderRadius: 6, fontSize: 12 }}>
                  {[
                    [pwChecks.length,  'At least 8 characters'],
                    [pwChecks.letters, 'At least 4 letters'],
                    [pwChecks.upper,   'At least 1 uppercase letter'],
                    [pwChecks.symbol,  'At least 1 symbol (! @ # $)'],
                  ].map(([ok, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, color: ok ? '#22c55e' : 'var(--color-text-faint)' }}>
                      {ok ? <Check size={10} /> : <X size={10} />} {label}
                    </div>
                  ))}
                </div>
              )}
              {error && <div style={errorStyle}>{error}</div>}
              <button onClick={save} disabled={loading || !pwValid || !form.current} style={{ ...btnPrimaryStyle, opacity: (loading || !pwValid || !form.current) ? 0.55 : 1 }}>
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

  const isPending = !!user?.deletion_scheduled_at;

  async function scheduleDelete() {
    if (confirmText !== user?.username) { setError('Username does not match.'); return; }
    setDeleting(true); setError('');
    try { await usersApi.scheduleAccountDeletion(); logout(); onClose?.(); }
    catch (err) { setError(err.data?.error || err.message || 'Failed.'); }
    finally { setDeleting(false); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <AlertTriangle size={15} style={{ color: 'var(--color-danger)' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Danger Zone</span>
      </div>
      {isPending ? (
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-danger)', marginBottom: 8 }}>Account scheduled for deletion</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>You can cancel this in the next 3 days.</div>
          <button onClick={async () => { await usersApi.reactivateAccount(); window.location.reload(); }} style={btnPrimaryStyle}>Cancel Deletion</button>
        </div>
      ) : confirming ? (
        <div style={{ padding: 16, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Are you sure?</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>
            Your account will be permanently deleted in 3 days. Type your username <strong>{user?.username}</strong> to confirm:
          </div>
          <input value={confirmText} onChange={e => { setConfirmText(e.target.value); setError(''); }} placeholder={user?.username} style={{ ...inputStyle, marginBottom: 10 }} autoFocus />
          {error && <div style={errorStyle}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={scheduleDelete} disabled={deleting || confirmText !== user?.username} style={{ ...btnDangerStyle, opacity: confirmText !== user?.username ? 0.5 : 1 }}>
              {deleting ? 'Scheduling…' : 'Delete My Account'}
            </button>
            <button onClick={() => { setConfirming(false); setConfirmText(''); }} style={btnGhostStyle}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Delete Account</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>Permanently delete your account after a 3-day grace period.</div>
          </div>
          <button onClick={() => setConfirming(true)} style={{ ...btnDangerOutlineStyle, flexShrink: 0, marginLeft: 16 }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function SettingsField({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function SettingSection({ title, desc, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: desc ? 4 : 12 }}>{title}</div>
      {desc && <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 12 }}>{desc}</div>}
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

// Shared styles
const h2Style = { fontSize: 20, fontWeight: 700, marginBottom: 24 };
const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 8 };
const inputStyle = { width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box' };
const errorStyle = { background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, padding: '7px 10px', fontSize: 13, color: 'var(--color-danger)', marginBottom: 10 };
const btnPrimaryStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnAccentStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnGhostStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnDangerStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 4, background: 'var(--color-danger)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnDangerOutlineStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' };
