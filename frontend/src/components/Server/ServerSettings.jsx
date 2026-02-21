import { useState, useEffect, useRef } from 'react';
import { X, Hash, Volume2, MessageSquareDot, Plus, Trash2, Rss, Shield, Upload, Crown, Camera, Check, AlertTriangle } from 'lucide-react';
import { serversApi, channelsApi, mediaApi, automodApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import RoleEditor from './RoleEditor.jsx';
import AuditLog from '../Moderation/AuditLog.jsx';
import StaffWarns from '../Moderation/StaffWarns.jsx';

const SECTIONS = [
  {
    label: null,
    items: [
      { id: 'overview',  label: 'Server Profile' },
      { id: 'tag',       label: 'Server Tag' },
    ],
  },
  {
    label: 'EXPRESSION',
    items: [
      { id: 'emoji',  label: 'Emoji' },
    ],
  },
  {
    label: 'PEOPLE',
    items: [
      { id: 'members', label: 'Members' },
      { id: 'roles',   label: 'Roles' },
      { id: 'invites', label: 'Invites' },
    ],
  },
  {
    label: 'MODERATION',
    items: [
      { id: 'safety',      label: 'Safety Setup' },
      { id: 'audit',       label: 'Audit Log' },
      { id: 'staffwarns',  label: 'Staff Warnings' },
    ],
  },
  {
    label: 'MUSIC',
    items: [
      { id: 'music',  label: 'Music Bot' },
    ],
  },
];

export default function ServerSettings({ onClose }) {
  const [tab, setTab] = useState('overview');
  const { activeServerId, getActiveServer, fetchChannels, fetchCategories, fetchRoles } = useServerStore();
  const { user } = useAuthStore();
  const server = getActiveServer();
  const serverId = activeServerId;
  const isOwner = server?.owner_id === user?.id;

  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  async function deleteServer() {
    if (!confirm(`Delete "${server?.name}"? This action is irreversible and will delete all channels, messages, and members.`)) return;
    const confirmed = prompt(`Type the server name "${server?.name}" to confirm deletion:`);
    if (confirmed !== server?.name) { alert('Server name did not match.'); return; }
    await serversApi.delete(serverId);
    onClose();
    window.location.href = '/';
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 5000, display: 'flex', background: 'var(--bg-primary)' }}>
      {/* Left nav */}
      <div style={{ width: 232, flexShrink: 0, background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ flex: 1, padding: '60px 8px 8px' }}>
          {/* Server name header */}
          <div style={{ padding: '0 10px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {server?.name}
          </div>

          {SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.label && (
                <div style={{ padding: '8px 10px 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)' }}>
                  {section.label}
                </div>
              )}
              {section.items.map(item => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%',
                    padding: '8px 10px', borderRadius: 4, fontSize: 14, cursor: 'pointer',
                    background: tab === item.id ? 'var(--bg-hover)' : 'none',
                    color: tab === item.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                    fontWeight: tab === item.id ? 600 : 400, textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (tab !== item.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (tab !== item.id) e.currentTarget.style.background = 'none'; }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}

          {isOwner && (
            <>
              <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 10px' }} />
              <button onClick={deleteServer}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 4, fontSize: 14, cursor: 'pointer', color: 'var(--color-danger)', background: 'none', textAlign: 'left' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
              >
                <Trash2 size={14} /> Delete Server
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: 780, width: '100%', padding: '60px 40px 80px' }}>
          {tab === 'overview'    && <OverviewTab server={server} serverId={serverId} onClose={onClose} />}
          {tab === 'tag'         && <TagTab server={server} serverId={serverId} />}
          {tab === 'emoji'       && <EmojiTab serverId={serverId} />}
          {tab === 'members'     && <MembersTab server={server} serverId={serverId} user={user} isOwner={isOwner} />}
          {tab === 'roles'       && <RoleEditor serverId={serverId} />}
          {tab === 'invites'     && <InvitesTab serverId={serverId} />}
          {tab === 'safety'      && <SafetyTab serverId={serverId} />}
          {tab === 'audit'       && <AuditLog serverId={serverId} />}
          {tab === 'staffwarns'  && <StaffWarns serverId={serverId} />}
          {tab === 'music'       && <MusicTab serverId={serverId} />}
        </div>
      </div>

      {/* Close */}
      <div style={{ width: 80, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 60, gap: 8 }}>
        <button onClick={onClose}
          style={{ width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--color-text-muted)', color: 'var(--color-text-muted)', cursor: 'pointer', background: 'none' }}
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

/* ─── Overview / Server Profile ─── */
function OverviewTab({ server, serverId, onClose }) {
  const { fetchChannels, fetchCategories } = useServerStore();
  const [name, setName] = useState(server?.name || '');
  const [vanityUrl, setVanityUrl] = useState(server?.vanity_url || '');
  const [description, setDescription] = useState(server?.description || '');
  const [iconUrl, setIconUrl] = useState(server?.icon_url || null);
  const [bannerUrl, setBannerUrl] = useState(server?.banner_url || null);
  const [xpEnabled, setXpEnabled] = useState(server?.xp_enabled !== false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(null);
  const iconRef = useRef(null);
  const bannerRef = useRef(null);

  async function uploadImage(file, type) {
    setUploading(type);
    try {
      const { uploadUrl, fileId } = await mediaApi.getUploadUrl({ filename: file.name, contentType: file.type, size: file.size, purpose: type });
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
      const { url } = await mediaApi.completeUpload({ fileId });
      if (type === 'server_icon') setIconUrl(url);
      else setBannerUrl(url);
    } catch (err) { alert('Upload failed: ' + (err.message || 'Unknown error')); }
    finally { setUploading(null); }
  }

  async function save(e) {
    e?.preventDefault();
    setSaving(true);
    try {
      await serversApi.update(serverId, {
        name: name.trim(),
        vanity_url: vanityUrl.trim() || null,
        description: description.trim() || null,
        icon_url: iconUrl,
        banner_url: bannerUrl,
        xpEnabled,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert(err.message || 'Save failed'); }
    finally { setSaving(false); }
  }

  const initials = (name || 'S').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 3);

  return (
    <div>
      <h2 style={h2Style}>Server Profile</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Customize how your server appears to its members.
      </p>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          {/* Server Name */}
          <SettingsField label="Server Name">
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
          </SettingsField>

          {/* Description */}
          <SettingsField label="Server Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: 'vertical' }} placeholder="What's this server about?" />
          </SettingsField>

          {/* Vanity URL */}
          <SettingsField label="Vanity URL">
            <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              <span style={{ padding: '10px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRight: 'none', borderRadius: '4px 0 0 4px', fontSize: 14, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                nyx.spygaming.dev/
              </span>
              <input value={vanityUrl} onChange={e => setVanityUrl(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="my-server" style={{ ...inputStyle, borderRadius: '0 4px 4px 0', flex: 1 }} />
            </div>
          </SettingsField>

          {/* XP */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Enable XP & Levels</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Members earn XP for messages and gain levels.</div>
            </div>
            <ToggleSwitch value={xpEnabled} onChange={setXpEnabled} />
          </div>

          <button onClick={save} disabled={saving} style={btnPrimaryStyle}>
            {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Right: icon + banner */}
        <div style={{ width: 200, flexShrink: 0 }}>
          {/* Icon */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 8 }}>Server Icon</div>
          <div style={{ position: 'relative', width: 100, height: 100, marginBottom: 12 }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#fff' }}>
              {iconUrl ? <img src={iconUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
            </div>
            <button onClick={() => iconRef.current?.click()} title="Change icon" style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Camera size={13} />
            </button>
          </div>
          <input ref={iconRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'server_icon')} />
          <button onClick={() => iconRef.current?.click()} style={{ ...btnAccentStyle, width: '100%', justifyContent: 'center', marginBottom: 8 }} disabled={uploading === 'server_icon'}>
            {uploading === 'server_icon' ? 'Uploading…' : 'Change Icon'}
          </button>
          {iconUrl && <button onClick={() => setIconUrl(null)} style={{ ...btnDangerOutlineStyle, width: '100%', justifyContent: 'center' }}>Remove Icon</button>}

          {/* Banner */}
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-faint)', marginBottom: 8, marginTop: 16 }}>Server Banner</div>
          <div onClick={() => bannerRef.current?.click()} style={{ height: 80, borderRadius: 8, background: bannerUrl ? `url(${bannerUrl}) center/cover` : 'var(--bg-secondary)', border: '2px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', marginBottom: 8 }}>
            {!bannerUrl && <Camera size={20} style={{ opacity: 0.4 }} />}
          </div>
          <input ref={bannerRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'server_banner')} />
          <button onClick={() => bannerRef.current?.click()} style={{ ...btnAccentStyle, width: '100%', justifyContent: 'center', marginBottom: 8 }} disabled={uploading === 'server_banner'}>
            {uploading === 'server_banner' ? 'Uploading…' : 'Change Banner'}
          </button>
          {bannerUrl && <button onClick={() => setBannerUrl(null)} style={{ ...btnDangerOutlineStyle, width: '100%', justifyContent: 'center' }}>Remove Banner</button>}
        </div>
      </div>
    </div>
  );
}

/* ─── Server Tag ─── */
function TagTab({ server, serverId }) {
  const [tag, setTag] = useState(server?.tag || '');
  const [enabled, setEnabled] = useState(!!server?.tag);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await serversApi.update(serverId, { tag: enabled ? (tag.trim() || null) : null });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { alert(err.message || 'Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <h2 style={h2Style}>Server Tag</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Create a tag that your server members can display next to their name. Up to 4 characters, letters only.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: 24 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>Enable Server Tag</div>
        <ToggleSwitch value={enabled} onChange={setEnabled} />
      </div>

      {enabled && (
        <SettingsField label="Tag (2–4 letters)">
          <input
            value={tag}
            onChange={e => setTag(e.target.value.toUpperCase().replace(/[^A-Za-z]/g, '').slice(0, 4))}
            placeholder="SPY"
            maxLength={4}
            style={{ ...inputStyle, width: 120, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}
          />
        </SettingsField>
      )}

      <button onClick={save} disabled={saving} style={btnPrimaryStyle}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  );
}

/* ─── Emoji ─── */
function EmojiTab({ serverId }) {
  return (
    <div>
      <h2 style={h2Style}>Emoji</h2>
      <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: 24, color: 'var(--color-text-muted)', fontSize: 14 }}>
        Custom emoji management is coming soon. You'll be able to upload up to 50 custom emoji for your server.
      </div>
    </div>
  );
}

/* ─── Members ─── */
function MembersTab({ server, serverId, user, isOwner }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferConfirm, setTransferConfirm] = useState('');
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    setLoading(true);
    serversApi.getMembers(serverId).then(setMembers).catch(() => {}).finally(() => setLoading(false));
  }, [serverId]);

  const filtered = members.filter(m =>
    (m.display_name || m.username || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.username || '').toLowerCase().includes(search.toLowerCase())
  );

  async function kick(userId) {
    if (!confirm('Kick this member from the server?')) return;
    await serversApi.kickMember(serverId, userId);
    setMembers(m => m.filter(x => x.user_id !== userId));
  }

  async function transferOwnership() {
    if (!transferTarget || transferConfirm !== server?.name) {
      alert('Server name did not match.');
      return;
    }
    setTransferring(true);
    try {
      await serversApi.update(serverId, { owner_id: transferTarget.user_id });
      alert(`Ownership transferred to ${transferTarget.display_name || transferTarget.username}.`);
      setTransferTarget(null);
      setTransferConfirm('');
    } catch (err) { alert(err.message || 'Failed to transfer ownership'); }
    finally { setTransferring(false); }
  }

  if (loading) return <div style={{ color: 'var(--color-text-muted)' }}>Loading members…</div>;

  return (
    <div>
      <h2 style={h2Style}>Members — {members.length}</h2>

      <input
        value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search members"
        style={{ ...inputStyle, marginBottom: 16 }}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {filtered.map(m => {
          const isMe = m.user_id === user?.id;
          const isServerOwner = m.user_id === server?.owner_id;
          return (
            <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (m.display_name || m.username || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {m.display_name || m.username}
                  {isServerOwner && <Crown size={13} style={{ color: '#f59e0b' }} title="Server Owner" />}
                  {isMe && <span style={{ fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 400 }}>(you)</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{m.username}</div>
              </div>
              {isOwner && !isMe && !isServerOwner && (
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setTransferTarget(m); setTransferConfirm(''); }}
                    style={{ fontSize: 12, padding: '5px 10px', borderRadius: 4, background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.3)' }}
                  >
                    <Crown size={11} style={{ display: 'inline', marginRight: 4 }} />Transfer
                  </button>
                  <button onClick={() => kick(m.user_id)} style={{ fontSize: 12, padding: '5px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.08)', color: 'var(--color-danger)', cursor: 'pointer', border: '1px solid rgba(239,68,68,0.2)' }}>
                    Kick
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transfer Ownership Modal */}
      {transferTarget && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 6000, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setTransferTarget(null); }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 32, width: 440, maxWidth: '90vw', boxShadow: '0 24px 80px rgba(0,0,0,0.6)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Crown size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>Transfer Ownership</h3>
            </div>
            <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 13, color: '#f59e0b' }}>
              <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
              This action cannot be reversed unless the new owner transfers it back.
            </div>
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
              You are about to transfer ownership of <strong>{server?.name}</strong> to{' '}
              <strong>{transferTarget.display_name || transferTarget.username}</strong>.
              You will lose all owner privileges.
            </p>
            <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginBottom: 8 }}>
              Type the server name <strong>{server?.name}</strong> to confirm:
            </div>
            <input
              value={transferConfirm} onChange={e => setTransferConfirm(e.target.value)}
              placeholder={server?.name} autoFocus
              style={{ ...inputStyle, marginBottom: 16 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={transferOwnership}
                disabled={transferring || transferConfirm !== server?.name}
                style={{ ...btnDangerStyle, opacity: transferConfirm !== server?.name ? 0.5 : 1 }}
              >
                {transferring ? 'Transferring…' : 'Transfer Ownership'}
              </button>
              <button onClick={() => setTransferTarget(null)} style={btnGhostStyle}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Invites ─── */
function InvitesTab({ serverId }) {
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);

  async function createInvite() {
    const { code } = await serversApi.createInvite(serverId);
    setInviteCode(code);
  }

  function copyLink() {
    navigator.clipboard.writeText(`${location.origin}/invite/${inviteCode}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      <h2 style={h2Style}>Invites</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        Create invite links to share with friends.
      </p>

      <button onClick={createInvite} style={btnPrimaryStyle}>Generate New Invite Link</button>

      {inviteCode && (
        <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <code style={{ flex: 1, fontSize: 14, fontFamily: 'var(--font-mono, monospace)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {location.origin}/invite/{inviteCode}
          </code>
          <button onClick={copyLink} style={{ ...btnAccentStyle, flexShrink: 0 }}>
            {copied ? <><Check size={13} /> Copied!</> : 'Copy'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Safety / AutoMod ─── */
function SafetyTab({ serverId }) {
  const [config, setConfig] = useState(null);
  const [blockedInput, setBlockedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    automodApi.get(serverId).then(cfg => setConfig(cfg || { blocked_words: [], block_invites: false, block_links: false })).catch(() => setConfig({ blocked_words: [], block_invites: false, block_links: false }));
  }, [serverId]);

  function addWord() {
    const word = blockedInput.trim().toLowerCase();
    if (!word || config.blocked_words.includes(word)) return;
    setConfig(c => ({ ...c, blocked_words: [...c.blocked_words, word] }));
    setBlockedInput('');
  }

  async function save() {
    setSaving(true);
    try { await automodApi.update(serverId, config); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    finally { setSaving(false); }
  }

  if (!config) return <div style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;

  return (
    <div>
      <h2 style={h2Style}>Safety Setup</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 24 }}>
        AutoMod runs client-side to preserve end-to-end encryption. Messages containing blocked content are stopped before being sent.
      </p>

      <SettingsField label="Blocked Words">
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={blockedInput} onChange={e => setBlockedInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWord())} placeholder="Add word and press Enter" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addWord} style={btnAccentStyle}>Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {config.blocked_words.map(w => (
            <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>
              {w}
              <button onClick={() => setConfig(c => ({ ...c, blocked_words: c.blocked_words.filter(x => x !== w) }))} style={{ background: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
            </span>
          ))}
        </div>
      </SettingsField>

      <div style={{ height: 1, background: 'var(--border-color)', margin: '16px 0' }} />

      <ToggleSetting label="Block Invite Links" desc="Block messages containing server invite links." value={config.block_invites} onChange={v => setConfig(c => ({ ...c, block_invites: v }))} />
      <ToggleSetting label="Block External Links" desc="Block all http/https links in messages." value={config.block_links} onChange={v => setConfig(c => ({ ...c, block_links: v }))} />

      <button onClick={save} disabled={saving} style={{ ...btnPrimaryStyle, marginTop: 16 }}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}


/* ─── Music ─── */
function MusicTab({ serverId }) {
  const [config, setConfig] = useState(null);
  const [platforms, setPlatforms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    import('../../utils/api.js').then(({ musicApi }) => {
      musicApi.getPlatforms().then(setPlatforms).catch(() => {});
      musicApi.getConfig(serverId).then(setConfig).catch(() => {});
    });
  }, [serverId]);

  async function save() {
    setSaving(true);
    try {
      await import('../../utils/api.js').then(({ musicApi }) => musicApi.updateConfig(serverId, config));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  if (!config) return <div style={{ color: 'var(--color-text-muted)' }}>Loading…</div>;

  return (
    <div>
      <h2 style={h2Style}>Music Bot</h2>

      <ToggleSetting label="Enable Music System" value={config.enabled} onChange={v => setConfig(c => ({ ...c, enabled: v }))} />

      <SettingsField label="Enabled Platforms" style={{ marginTop: 16 }}>
        {platforms.map(p => (
          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', padding: '6px 0' }}>
            <input
              type="checkbox" checked={config.enabledPlatforms?.includes(p.id)}
              onChange={e => setConfig(c => ({ ...c, enabledPlatforms: e.target.checked ? [...(c.enabledPlatforms || []), p.id] : (c.enabledPlatforms || []).filter(x => x !== p.id) }))}
              style={{ width: 'auto' }}
            />
            {p.name}
          </label>
        ))}
      </SettingsField>

      <SettingsField label="Max Queue Size">
        <input type="number" min={1} max={1000} value={config.maxQueueSize} onChange={e => setConfig(c => ({ ...c, maxQueueSize: Number(e.target.value) }))} style={{ ...inputStyle, width: 120 }} />
      </SettingsField>

      <button onClick={save} disabled={saving} style={btnPrimaryStyle}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

/* ─── Helpers ─── */
function SettingsField({ label, children, style: s }) {
  return (
    <div style={{ marginBottom: 16, ...s }}>
      <div style={labelStyle}>{label}</div>
      {children}
    </div>
  );
}

function ToggleSetting({ label, desc, value, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{label}</div>
        {desc && <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>{desc}</div>}
      </div>
      <ToggleSwitch value={value} onChange={onChange} />
    </div>
  );
}

function ToggleSwitch({ value, onChange }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 40, height: 22, borderRadius: 11, background: value ? 'var(--color-accent)' : 'var(--bg-hover)', position: 'relative', transition: 'background 0.2s', flexShrink: 0, cursor: 'pointer' }}>
      <span style={{ position: 'absolute', top: 2, left: value ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: '#fff', transition: 'left 0.2s' }} />
    </button>
  );
}

const h2Style = { fontSize: 20, fontWeight: 700, marginBottom: 8 };
const labelStyle = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 8 };
const inputStyle = { width: '100%', padding: '10px 12px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 4, color: 'var(--color-text)', fontSize: 14, boxSizing: 'border-box' };
const btnPrimaryStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnAccentStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 4, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' };
const btnGhostStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnDangerStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', borderRadius: 4, background: 'var(--color-danger)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' };
const btnDangerOutlineStyle = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 4, background: 'rgba(239,68,68,0.1)', color: 'var(--color-danger)', fontWeight: 600, fontSize: 13, border: '1px solid rgba(239,68,68,0.25)', cursor: 'pointer' };
