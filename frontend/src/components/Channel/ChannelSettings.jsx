import { useState, useEffect } from 'react';
import { Hash, Volume2, Rss, MessageSquareDot, X, Trash2, Check, Minus } from 'lucide-react';
import { channelsApi, serversApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';

// Permission bit flags
const PERMS = {
  VIEW_CHANNEL:        { bit: 1n,     label: 'View Channel',        desc: 'Allows members to view this channel.', voice: false },
  MANAGE_CHANNEL:      { bit: 2n,     label: 'Manage Channel',      desc: 'Allows members to change this channel\'s name and settings.', voice: false },
  MANAGE_PERMISSIONS:  { bit: 4n,     label: 'Manage Permissions',  desc: 'Allows members to change this channel\'s permissions.', voice: false },
  SEND_MESSAGES:       { bit: 8n,     label: 'Send Messages',       desc: 'Allows members to send messages in this channel.', voice: false },
  EMBED_LINKS:         { bit: 16n,    label: 'Embed Links',         desc: 'Allows links to show embedded previews.', voice: false },
  ATTACH_FILES:        { bit: 32n,    label: 'Attach Files',        desc: 'Allows members to upload files.', voice: false },
  READ_MESSAGE_HISTORY:{ bit: 64n,    label: 'Read Message History',desc: 'Allows members to read previous messages.', voice: false },
  MENTION_EVERYONE:    { bit: 128n,   label: 'Mention @everyone',   desc: 'Allows members to use @everyone and @here.', voice: false },
  ADD_REACTIONS:       { bit: 256n,   label: 'Add Reactions',       desc: 'Allows members to add reactions to messages.', voice: false },
  MANAGE_MESSAGES:     { bit: 16384n, label: 'Manage Messages',     desc: 'Allows members to delete or pin messages.', voice: false },
  CONNECT:             { bit: 512n,   label: 'Connect',             desc: 'Allows members to connect to voice channels.', voice: true },
  SPEAK:               { bit: 1024n,  label: 'Speak',               desc: 'Allows members to speak in voice channels.', voice: true },
  MUTE_MEMBERS:        { bit: 2048n,  label: 'Mute Members',        desc: 'Allows members to mute other members.', voice: true },
  DEAFEN_MEMBERS:      { bit: 4096n,  label: 'Deafen Members',      desc: 'Allows members to deafen other members.', voice: true },
  MOVE_MEMBERS:        { bit: 8192n,  label: 'Move Members',        desc: 'Allows members to move others between voice channels.', voice: true },
};

const GENERAL_PERMS = Object.entries(PERMS).filter(([, v]) => !v.voice);
const VOICE_PERMS   = Object.entries(PERMS).filter(([, v]) => v.voice);

const CHANNEL_ICONS = { text: Hash, voice: Volume2, announcement: Rss, forum: MessageSquareDot, voice_text: Hash };

const SLOWMODE_OPTIONS = [
  { value: 0, label: 'Off' }, { value: 5, label: '5 seconds' },
  { value: 10, label: '10 seconds' }, { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' }, { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' }, { value: 300, label: '5 minutes' },
  { value: 600, label: '10 minutes' }, { value: 900, label: '15 minutes' },
  { value: 1800, label: '30 minutes' }, { value: 3600, label: '1 hour' },
  { value: 7200, label: '2 hours' },
];

export default function ChannelSettings({ channel, serverId, onClose, onDeleted }) {
  const { fetchChannels, fetchCategories } = useServerStore();
  const [tab, setTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Overview state
  const [name, setName] = useState(channel.name || '');
  const [topic, setTopic] = useState(channel.topic || '');
  const [slowmode, setSlowmode] = useState(channel.slowmode_seconds || 0);
  const [bitrate, setBitrate] = useState(Math.round((channel.bitrate || 64000) / 1000));
  const [userLimit, setUserLimit] = useState(channel.user_limit || 0);

  // Permissions state
  const [roles, setRoles] = useState([]);
  const [permsMap, setPermsMap] = useState({}); // { `${targetType}:${targetId}`: { allow: bigint, deny: bigint } }
  const [selectedTarget, setSelectedTarget] = useState(null); // { type, id, name, color }
  const [permsLoading, setPermsLoading] = useState(false);
  const [pendingPerms, setPendingPerms] = useState({}); // overrides not yet saved

  const isVoice = channel.type === 'voice';
  const Icon = CHANNEL_ICONS[channel.type] || Hash;

  // Close on ESC
  useEffect(() => {
    function h(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  // Load roles + permissions when permissions tab opens
  useEffect(() => {
    if (tab !== 'permissions') return;
    setPermsLoading(true);
    Promise.all([
      serversApi.getRoles(serverId),
      channelsApi.getPermissions(channel.id),
    ]).then(([roleList, overrides]) => {
      setRoles(roleList || []);
      const map = {};
      for (const o of (overrides || [])) {
        map[`${o.target_type}:${o.target_id}`] = {
          allow: BigInt(o.allow_bits ?? 0),
          deny: BigInt(o.deny_bits ?? 0),
        };
      }
      setPermsMap(map);
      // Select @everyone (last role / lowest position) by default
      if (roleList?.length) {
        const everyone = roleList.find(r => r.name === '@everyone') || roleList[roleList.length - 1];
        setSelectedTarget({ type: 'role', id: everyone.id, name: everyone.name, color: everyone.color });
      }
    }).catch(() => {}).finally(() => setPermsLoading(false));
  }, [tab, channel.id, serverId]);

  async function saveOverview(e) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await channelsApi.update(channel.id, {
        name: name.trim(),
        topic: topic.trim() || null,
        slowmodeSeconds: isVoice ? undefined : slowmode,
        bitrate: isVoice ? bitrate * 1000 : undefined,
        userLimit: isVoice ? userLimit : undefined,
      });
      await fetchChannels(serverId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { setError(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm(`Delete #${channel.name}? This cannot be undone.`)) return;
    try {
      await channelsApi.delete(channel.id);
      await fetchChannels(serverId);
      onDeleted?.();
      onClose();
    } catch (err) { setError(err.message || 'Failed to delete'); }
  }

  // For selected role: get effective allow/deny (pending overrides take priority)
  function getOverride(targetType, targetId) {
    const key = `${targetType}:${targetId}`;
    if (pendingPerms[key] !== undefined) return pendingPerms[key];
    return permsMap[key] || { allow: 0n, deny: 0n };
  }

  // State for a given bit: 'allow' | 'deny' | 'inherit'
  function permState(bit) {
    if (!selectedTarget) return 'inherit';
    const ov = getOverride(selectedTarget.type, selectedTarget.id);
    const a = BigInt(ov.allow ?? 0n);
    const d = BigInt(ov.deny ?? 0n);
    if (a & bit) return 'allow';
    if (d & bit) return 'deny';
    return 'inherit';
  }

  function setPerm(bit, state) {
    if (!selectedTarget) return;
    const key = `${selectedTarget.type}:${selectedTarget.id}`;
    const current = getOverride(selectedTarget.type, selectedTarget.id);
    let a = BigInt(current.allow ?? 0n);
    let d = BigInt(current.deny ?? 0n);
    // Clear both first
    a &= ~bit;
    d &= ~bit;
    if (state === 'allow') a |= bit;
    else if (state === 'deny') d |= bit;
    setPendingPerms(prev => ({ ...prev, [key]: { allow: a, deny: d } }));
  }

  async function savePermissions() {
    setSaving(true); setError('');
    try {
      for (const [key, ov] of Object.entries(pendingPerms)) {
        const [targetType, targetId] = key.split(':');
        await channelsApi.setPermission(channel.id, targetType, targetId, String(ov.allow), String(ov.deny));
      }
      // Merge pending into permsMap
      setPermsMap(prev => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(pendingPerms)) next[k] = v;
        return next;
      });
      setPendingPerms({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) { setError(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  }

  const hasPendingPerms = Object.keys(pendingPerms).length > 0;
  const hasOverviewChanges = name !== channel.name || topic !== (channel.topic || '') ||
    slowmode !== (channel.slowmode_seconds || 0) ||
    bitrate !== Math.round((channel.bitrate || 64000) / 1000) ||
    userLimit !== (channel.user_limit || 0);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 5000,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        display: 'flex', width: '100%', height: '100%',
        background: 'var(--bg-primary)',
      }}>
        {/* Left sidebar */}
        <div style={{
          width: 232, flexShrink: 0,
          background: 'var(--bg-secondary)',
          display: 'flex', flexDirection: 'column',
          paddingTop: 60,
          overflowY: 'auto',
        }}>
          {/* Channel name header */}
          <div style={{ padding: '0 16px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon size={13} />
            <span className="truncate">{channel.name}</span>
          </div>

          {(['overview', 'permissions', 'invites'] ).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{
                display: 'flex', alignItems: 'center', padding: '8px 16px',
                fontSize: 14, fontWeight: tab === t ? 600 : 400,
                color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)',
                background: tab === t ? 'var(--bg-hover)' : 'none',
                borderRadius: 4, cursor: 'pointer', textAlign: 'left',
                textTransform: 'capitalize',
              }}
              onMouseEnter={e => { if (tab !== t) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { if (tab !== t) e.currentTarget.style.background = 'none'; }}
            >{t === 'overview' ? 'Overview' : t === 'permissions' ? 'Permissions' : 'Invites'}</button>
          ))}

          <div style={{ height: 1, background: 'var(--border-color)', margin: '8px 16px' }} />

          <button onClick={handleDelete}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              fontSize: 14, color: 'var(--color-danger)', background: 'none',
              borderRadius: 4, cursor: 'pointer', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
          >
            <Trash2 size={14} /> Delete Channel
          </button>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Top bar with close button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '16px 24px', flexShrink: 0 }}>
            <button onClick={onClose} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'var(--bg-hover)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0 40px 40px' }}>
            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--color-danger)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, color: 'var(--color-danger)', fontSize: 13 }}>
                {error}
              </div>
            )}

            {tab === 'overview' && (
              <form onSubmit={saveOverview}>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Overview</h2>

                <Label>Channel Name</Label>
                <input
                  value={name} onChange={e => setName(e.target.value)}
                  style={{ ...inputStyle, marginBottom: 20 }}
                  placeholder="channel-name"
                />

                {!isVoice && (
                  <>
                    <Label>Channel Topic</Label>
                    <textarea
                      value={topic} onChange={e => setTopic(e.target.value)}
                      rows={3}
                      style={{ ...inputStyle, resize: 'vertical', marginBottom: 20 }}
                      placeholder="Let everyone know what this channel is about"
                    />

                    <Label>Slowmode</Label>
                    <select value={slowmode} onChange={e => setSlowmode(Number(e.target.value))}
                      style={{ ...inputStyle, marginBottom: 20 }}>
                      {SLOWMODE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <p style={helpText}>Members are restricted to one message per interval unless they have Bypass Slowmode permission.</p>
                  </>
                )}

                {isVoice && (
                  <>
                    <Label>Bitrate</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>8kbps</span>
                      <input type="range" min={8} max={384} value={bitrate}
                        onChange={e => setBitrate(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--color-accent)' }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-faint)', minWidth: 52, textAlign: 'right' }}>384kbps</span>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 52 }}>{bitrate}kbps</span>
                    </div>
                    <p style={{ ...helpText, marginBottom: 20 }}>Going above 64 kbps may adversely affect people on poor connections.</p>

                    <Label>User Limit</Label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>∞</span>
                      <input type="range" min={0} max={99} value={userLimit}
                        onChange={e => setUserLimit(Number(e.target.value))}
                        style={{ flex: 1, accentColor: 'var(--color-accent)' }} />
                      <span style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>99</span>
                      <span style={{ fontSize: 13, fontWeight: 600, minWidth: 52 }}>{userLimit === 0 ? '∞' : userLimit}</span>
                    </div>
                    <p style={{ ...helpText, marginBottom: 20 }}>Limit the number of users that can connect to this channel. 0 = no limit.</p>
                  </>
                )}

                {hasOverviewChanges && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                    <button type="submit" disabled={saving}
                      style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                      {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => { setName(channel.name); setTopic(channel.topic || ''); setSlowmode(channel.slowmode_seconds || 0); setBitrate(Math.round((channel.bitrate || 64000) / 1000)); setUserLimit(channel.user_limit || 0); }}
                      style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                      Reset
                    </button>
                  </div>
                )}
              </form>
            )}

            {tab === 'permissions' && (
              <PermissionsTab
                channel={channel}
                roles={roles}
                selectedTarget={selectedTarget}
                setSelectedTarget={setSelectedTarget}
                permState={permState}
                setPerm={setPerm}
                hasPendingPerms={hasPendingPerms}
                saving={saving}
                saved={saved}
                onSave={savePermissions}
                isVoice={isVoice}
                loading={permsLoading}
              />
            )}

            {tab === 'invites' && (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>Invites</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Invite management coming soon.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PermissionsTab({ channel, roles, selectedTarget, setSelectedTarget, permState, setPerm, hasPendingPerms, saving, saved, onSave, isVoice, loading }) {
  const generalPerms = GENERAL_PERMS;
  const voicePerms = VOICE_PERMS;

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* Role list */}
      <div style={{ width: 200, flexShrink: 0, marginRight: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Permissions</h2>
        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          Use permissions to customize who can do what in this channel.
        </p>

        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-faint)', marginBottom: 6, padding: '0 4px' }}>
          Roles / Members
        </div>

        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>Loading…</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {roles.map(role => (
              <button key={role.id}
                onClick={() => setSelectedTarget({ type: 'role', id: role.id, name: role.name, color: role.color })}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                  borderRadius: 6, cursor: 'pointer', fontSize: 13,
                  background: selectedTarget?.id === role.id ? 'var(--bg-hover)' : 'none',
                  color: selectedTarget?.id === role.id ? 'var(--color-text)' : 'var(--color-text-muted)',
                  textAlign: 'left', fontWeight: selectedTarget?.id === role.id ? 600 : 400,
                }}
                onMouseEnter={e => { if (selectedTarget?.id !== role.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={e => { if (selectedTarget?.id !== role.id) e.currentTarget.style.background = 'none'; }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: role.color || 'var(--color-text-faint)', flexShrink: 0 }} />
                <span className="truncate">{role.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Permission controls */}
      <div style={{ flex: 1 }}>
        {selectedTarget ? (
          <>
            <PermSection title="General Channel Permissions" perms={generalPerms} permState={permState} setPerm={setPerm} />
            {isVoice && <PermSection title="Voice Permissions" perms={voicePerms} permState={permState} setPerm={setPerm} />}

            {hasPendingPerms && (
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button onClick={onSave} disabled={saving}
                  style={{ padding: '9px 20px', borderRadius: 'var(--radius-md)', background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ color: 'var(--color-text-muted)', fontSize: 14, paddingTop: 40 }}>
            Select a role to configure permissions.
          </div>
        )}
      </div>
    </div>
  );
}

function PermSection({ title, perms, permState, setPerm }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {perms.map(([key, perm]) => {
          const state = permState(perm.bit);
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ flex: 1, marginRight: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{perm.label}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{perm.desc}</div>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <PermBtn active={state === 'deny'} type="deny" onClick={() => setPerm(perm.bit, state === 'deny' ? 'inherit' : 'deny')}>
                  <X size={13} />
                </PermBtn>
                <PermBtn active={state === 'inherit'} type="inherit" onClick={() => setPerm(perm.bit, 'inherit')}>
                  <Minus size={13} />
                </PermBtn>
                <PermBtn active={state === 'allow'} type="allow" onClick={() => setPerm(perm.bit, state === 'allow' ? 'inherit' : 'allow')}>
                  <Check size={13} />
                </PermBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PermBtn({ children, active, type, onClick }) {
  const colors = {
    deny:    { active: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
    inherit: { active: 'var(--color-text-muted)', bg: 'rgba(255,255,255,0.08)' },
    allow:   { active: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  };
  const c = colors[type];
  return (
    <button onClick={onClick} style={{
      width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 6, cursor: 'pointer',
      background: active ? c.bg : 'var(--bg-hover)',
      color: active ? c.active : 'var(--color-text-faint)',
      border: active ? `1px solid ${c.active}` : '1px solid transparent',
      transition: 'all 0.1s',
    }}>
      {children}
    </button>
  );
}

function Label({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-faint)', marginBottom: 8 }}>{children}</div>;
}

const inputStyle = {
  width: '100%', padding: '10px 12px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--color-text)', fontSize: 14,
  boxSizing: 'border-box',
};

const helpText = {
  fontSize: 12, color: 'var(--color-text-faint)', marginTop: -14, marginBottom: 20,
};
