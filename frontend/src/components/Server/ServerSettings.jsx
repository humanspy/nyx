import { useState, useEffect } from 'react';
import { X, Hash, Volume2, MessageSquareDot, Plus, Trash2, Rss, Shield } from 'lucide-react';
import { serversApi, channelsApi, automodApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import RoleEditor from './RoleEditor.jsx';

const TABS = ['Overview', 'Channels', 'Roles', 'Members', 'Invites', 'Moderation', 'AutoMod', 'Music'];

const CHANNEL_TYPES = [
  { value: 'text', label: 'Text', icon: Hash },
  { value: 'voice', label: 'Voice', icon: Volume2 },
  { value: 'forum', label: 'Forum', icon: MessageSquareDot },
  { value: 'announcement', label: 'Announcement', icon: Rss },
];

export default function ServerSettings({ onClose }) {
  const [tab, setTab] = useState('Overview');
  const { activeServerId, getActiveServer, fetchChannels, channels, categories, fetchCategories, fetchRoles } = useServerStore();
  const { user } = useAuthStore();
  const server = getActiveServer();
  const [form, setForm] = useState({ name: server?.name || '', vanity_url: server?.vanity_url || '', xp_enabled: server?.xp_enabled !== false });
  const [saving, setSaving] = useState(false);
  const [newChannel, setNewChannel] = useState({ name: '', type: 'text', category_id: '' });
  const [members, setMembers] = useState([]);
  const [inviteCode, setInviteCode] = useState('');

  const serverId = activeServerId;
  const serverChannels = channels[serverId] || [];
  const serverCategories = categories[serverId] || [];

  useEffect(() => {
    if (tab === 'Members') serversApi.getMembers(serverId).then(setMembers).catch(() => {});
    if (tab === 'Roles') fetchRoles(serverId);
  }, [tab]);

  async function saveOverview(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await serversApi.update(serverId, { name: form.name, vanity_url: form.vanity_url || null, xpEnabled: form.xp_enabled });
    } finally { setSaving(false); }
  }

  async function createChannel(e) {
    e.preventDefault();
    if (!newChannel.name.trim()) return;
    const ch = await channelsApi.create({ ...newChannel, serverId, name: newChannel.name.trim() });
    // If it's a voice channel, also create a paired voice-text channel
    if (newChannel.type === 'voice') {
      await channelsApi.create({
        serverId, type: 'voice_text',
        name: `${newChannel.name.trim()}-chat`,
        category_id: newChannel.category_id || null,
        paired_voice_channel_id: ch.id,
      });
    }
    fetchChannels(serverId);
    setNewChannel({ name: '', type: 'text', category_id: '' });
  }

  async function deleteChannel(id) {
    if (!confirm('Delete this channel?')) return;
    await channelsApi.delete(id);
    fetchChannels(serverId);
  }

  async function createInvite() {
    const { code } = await serversApi.createInvite(serverId);
    setInviteCode(code);
  }

  async function kickMember(userId) {
    if (!confirm('Kick this member?')) return;
    await serversApi.kickMember(serverId, userId);
    setMembers(m => m.filter(x => x.user_id !== userId));
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-xl)', width: '90vw', maxWidth: 860, height: '80vh', display: 'flex', overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
        {/* Sidebar tabs */}
        <div style={{ width: 200, borderRight: '1px solid var(--border-color)', padding: '16px 8px', overflowY: 'auto', background: 'var(--bg-primary)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 8px', marginBottom: 4 }}>
            {server?.name}
          </div>
          {TABS.map(t => (
            <button
              key={t}
              className={`btn btn-ghost`}
              style={{ width: '100%', justifyContent: 'flex-start', padding: '7px 10px', marginBottom: 2, background: tab === t ? 'var(--bg-active)' : 'transparent', color: tab === t ? 'var(--color-text)' : 'var(--color-text-muted)', fontWeight: tab === t ? 600 : 400 }}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
          <div className="divider" style={{ margin: '8px 0' }} />
          <button className="btn btn-danger btn-sm" style={{ width: '100%', justifyContent: 'flex-start', gap: 4 }} onClick={() => { serversApi.delete(serverId).then(onClose); }}>
            <Trash2 size={13} /> Delete Server
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontWeight: 700, fontSize: 18 }}>{tab}</h2>
            <button onClick={onClose} className="btn btn-ghost btn-icon"><X size={18} /></button>
          </div>

          {tab === 'Overview' && (
            <form onSubmit={saveOverview}>
              <div className="form-group">
                <label className="form-label">Server Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Vanity URL <span style={{ color: 'var(--color-text-faint)', fontWeight: 400, textTransform: 'none', fontSize: 12 }}>(min. 3 characters)</span></label>
                <input value={form.vanity_url} onChange={e => setForm(f => ({ ...f, vanity_url: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} placeholder="my-server" minLength={3} />
              </div>
              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input
                    type="checkbox" checked={form.xp_enabled}
                    onChange={e => setForm(f => ({ ...f, xp_enabled: e.target.checked }))}
                    style={{ width: 'auto' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>Enable XP & Levels</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Members earn XP for messages and gain levels in this server.</div>
                  </div>
                </label>
              </div>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </form>
          )}

          {tab === 'Channels' && (
            <div>
              <form onSubmit={createChannel} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <input value={newChannel.name} onChange={e => setNewChannel(n => ({ ...n, name: e.target.value }))} placeholder="channel-name" style={{ flex: 1, minWidth: 160 }} required />
                <select value={newChannel.type} onChange={e => setNewChannel(n => ({ ...n, type: e.target.value }))} style={{ width: 140 }}>
                  {CHANNEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <select value={newChannel.category_id} onChange={e => setNewChannel(n => ({ ...n, category_id: e.target.value }))} style={{ width: 140 }}>
                  <option value="">No category</option>
                  {serverCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="submit" className="btn btn-primary btn-sm" style={{ gap: 4 }}><Plus size={13} /> Add</button>
              </form>
              <div style={{ color: 'var(--color-text-faint)', fontSize: 12, marginBottom: 12 }}>
                Voice channels automatically get a paired voice-text channel for music commands.
              </div>
              {serverChannels.filter(c => c.type !== 'voice_text').map(ch => {
                const Icon = CHANNEL_TYPES.find(t => t.value === ch.type)?.icon || Hash;
                return (
                  <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                    <Icon size={15} style={{ opacity: 0.6 }} />
                    <span style={{ flex: 1, fontSize: 14 }}>{ch.name}</span>
                    <span className="text-faint text-xs">{ch.type}</span>
                    <button className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => deleteChannel(ch.id)}><Trash2 size={13} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'Roles' && <RoleEditor serverId={serverId} />}

          {tab === 'Members' && (
            <div>
              {members.map(m => (
                <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{(m.display_name || m.username)?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{m.display_name || m.username}</div>
                    <div className="text-faint text-xs">{m.username}</div>
                  </div>
                  {m.user_id !== user?.id && m.user_id !== server?.owner_id && (
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => kickMember(m.user_id)}>Kick</button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'Invites' && (
            <div>
              <button className="btn btn-primary" onClick={createInvite}>Generate Invite Link</button>
              {inviteCode && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--bg-input)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                  {location.origin}/join/{inviteCode}
                  <button className="btn btn-ghost btn-sm" style={{ marginLeft: 12 }} onClick={() => navigator.clipboard.writeText(`${location.origin}/join/${inviteCode}`)}>Copy</button>
                </div>
              )}
            </div>
          )}

          {tab === 'Moderation' && (
            <div>
              <p className="text-muted">Full moderation panel is available under the Moderation section in the channel sidebar.</p>
            </div>
          )}

          {tab === 'AutoMod' && <AutoModConfig serverId={serverId} />}

          {tab === 'Music' && <MusicConfig serverId={serverId} />}
        </div>
      </div>
    </div>
  );
}

function AutoModConfig({ serverId }) {
  const [config, setConfig] = useState(null);
  const [blockedInput, setBlockedInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    automodApi.get(serverId)
      .then(cfg => setConfig(cfg || { blocked_words: [], block_invites: false, block_links: false }))
      .catch(() => setConfig({ blocked_words: [], block_invites: false, block_links: false }));
  }, [serverId]);

  function addWord() {
    const word = blockedInput.trim().toLowerCase();
    if (!word || config.blocked_words.includes(word)) return;
    setConfig(c => ({ ...c, blocked_words: [...c.blocked_words, word] }));
    setBlockedInput('');
  }

  function removeWord(w) {
    setConfig(c => ({ ...c, blocked_words: c.blocked_words.filter(x => x !== w) }));
  }

  async function save() {
    setSaving(true);
    try {
      await automodApi.update(serverId, config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  if (!config) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Shield size={16} style={{ color: 'var(--color-accent)' }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>AutoMod</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
        AutoMod runs client-side to preserve end-to-end encryption. Messages containing blocked content are stopped before they are encrypted and sent.
      </p>

      {/* Blocked words */}
      <div className="form-group">
        <label className="form-label">Blocked Words</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            value={blockedInput}
            onChange={e => setBlockedInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addWord())}
            placeholder="Type a word and press Enter"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary btn-sm" onClick={addWord} type="button">Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {config.blocked_words.map(w => (
            <span key={w} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '3px 8px', fontSize: 13 }}>
              {w}
              <button onClick={() => removeWord(w)} style={{ background: 'none', color: 'var(--color-danger,#ef4444)', cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>×</button>
            </span>
          ))}
          {config.blocked_words.length === 0 && <span style={{ fontSize: 13, color: 'var(--color-text-faint)' }}>No blocked words.</span>}
        </div>
      </div>

      {/* Toggle options */}
      <div className="form-group">
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, marginBottom: 10 }}>
          <input type="checkbox" checked={!!config.block_invites} onChange={e => setConfig(c => ({ ...c, block_invites: e.target.checked }))} style={{ width: 'auto' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Block Invite Links</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Block messages containing server invite links.</div>
          </div>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
          <input type="checkbox" checked={!!config.block_links} onChange={e => setConfig(c => ({ ...c, block_links: e.target.checked }))} style={{ width: 'auto' }} />
          <div>
            <div style={{ fontWeight: 600 }}>Block External Links</div>
            <div style={{ fontSize: 12, color: 'var(--color-text-faint)' }}>Block all external http/https links in messages.</div>
          </div>
        </label>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={saving}>
        {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save AutoMod Config'}
      </button>
    </div>
  );
}

function MusicConfig({ serverId }) {
  const [config, setConfig] = useState(null);
  const [platforms, setPlatforms] = useState([]);

  useEffect(() => {
    import('../../utils/api.js').then(({ musicApi }) => {
      musicApi.getPlatforms().then(setPlatforms);
      musicApi.getConfig(serverId).then(setConfig);
    });
  }, [serverId]);

  async function save() {
    await import('../../utils/api.js').then(({ musicApi }) => musicApi.updateConfig(serverId, config));
  }

  if (!config) return <div className="text-muted">Loading…</div>;

  return (
    <div>
      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={config.enabled} onChange={e => setConfig(c => ({ ...c, enabled: e.target.checked }))} style={{ width: 'auto' }} />
          Enable Music System
        </label>
      </div>
      <div className="form-group">
        <label className="form-label">Enabled Platforms</label>
        {platforms.map(p => (
          <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, cursor: 'pointer', marginBottom: 6 }}>
            <input
              type="checkbox"
              checked={config.enabledPlatforms?.includes(p.id)}
              onChange={e => setConfig(c => ({ ...c, enabledPlatforms: e.target.checked ? [...(c.enabledPlatforms || []), p.id] : (c.enabledPlatforms || []).filter(x => x !== p.id) }))}
              style={{ width: 'auto' }}
            />
            {p.name}
          </label>
        ))}
      </div>
      <div className="form-group">
        <label className="form-label">Max Queue Size</label>
        <input type="number" min="1" max="1000" value={config.maxQueueSize} onChange={e => setConfig(c => ({ ...c, maxQueueSize: Number(e.target.value) }))} style={{ width: 120 }} />
      </div>
      <button className="btn btn-primary" onClick={save}>Save Music Config</button>
    </div>
  );
}
