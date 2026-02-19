import { useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { serversApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';

// Grouped Discord-like permissions
const PERM_GROUPS = [
  {
    label: 'General Server',
    perms: [
      { key: 'administrator',      label: 'Administrator',           desc: 'Grants all permissions. Use with caution.' },
      { key: 'manage_server',      label: 'Manage Server',           desc: 'Edit server name, region, and settings.' },
      { key: 'manage_channels',    label: 'Manage Channels',         desc: 'Create, edit, and delete channels.' },
      { key: 'manage_roles',       label: 'Manage Roles',            desc: 'Create, edit, and assign roles below this one.' },
      { key: 'view_audit_log',     label: 'View Audit Log',          desc: 'View the audit log for moderation actions.' },
      { key: 'create_invite',      label: 'Create Invite',           desc: 'Create invite links for this server.' },
    ],
  },
  {
    label: 'Membership',
    perms: [
      { key: 'kick_members',       label: 'Kick Members',            desc: 'Remove members from the server.' },
      { key: 'ban_members',        label: 'Ban Members',             desc: 'Permanently ban members from the server.' },
      { key: 'timeout_members',    label: 'Timeout Members',         desc: 'Temporarily restrict member from sending messages.' },
    ],
  },
  {
    label: 'Text Channels',
    perms: [
      { key: 'view_channels',      label: 'View Channels',           desc: 'View text channels and read message history.' },
      { key: 'send_messages',      label: 'Send Messages',           desc: 'Send messages in text channels.' },
      { key: 'manage_messages',    label: 'Manage Messages',         desc: 'Delete or pin messages from other users.' },
      { key: 'embed_links',        label: 'Embed Links',             desc: 'Show link previews in messages.' },
      { key: 'attach_files',       label: 'Attach Files',            desc: 'Upload files and images to channels.' },
      { key: 'read_history',       label: 'Read Message History',    desc: 'Read older messages in text channels.' },
      { key: 'mention_everyone',   label: 'Mention @everyone',       desc: 'Mention @everyone, @here, and all roles.' },
      { key: 'use_slash_commands', label: 'Use Slash Commands',      desc: 'Use / commands in text channels.' },
    ],
  },
  {
    label: 'Voice Channels',
    perms: [
      { key: 'connect',            label: 'Connect',                 desc: 'Join voice and video channels.' },
      { key: 'speak',              label: 'Speak',                   desc: 'Transmit audio in voice channels.' },
      { key: 'stream',             label: 'Stream / Share Screen',   desc: 'Share video or screen in voice channels.' },
      { key: 'mute_members',       label: 'Mute Members',            desc: 'Server-mute other members in voice.' },
      { key: 'deafen_members',     label: 'Deafen Members',          desc: 'Server-deafen other members in voice.' },
      { key: 'move_members',       label: 'Move Members',            desc: 'Move members between voice channels.' },
    ],
  },
  {
    label: 'Music',
    perms: [
      { key: 'use_music',          label: 'Use Music Commands',      desc: 'Use /play, /queue, /nowplaying, etc.' },
      { key: 'dj',                 label: 'DJ',                      desc: 'Use DJ commands: /skip, /stop, /clearqueue, /shuffle.' },
    ],
  },
];

export default function RoleEditor({ serverId }) {
  const { roles, fetchRoles } = useServerStore();
  const serverRoles = roles[serverId] || [];
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [gradientMode, setGradientMode] = useState(false);

  function selectRole(role) {
    setSelected(role);
    setGradientMode(!!role.color_gradient);
    setForm({
      name: role.name,
      color: role.color || '#ffffff',
      color_gradient: role.color_gradient || { type: 'linear', angle: 135, stops: [{ color: '#7c3aed', position: 0 }, { color: '#60a5fa', position: 1 }] },
      icon_emoji: role.icon_emoji || '',
      icon_url: role.icon_url || '',
      hoist: role.hoist || false,
      xp_per_message: role.xp_per_message ?? '',
      permissions: role.permissions || {},
    });
  }

  async function createRole() {
    const role = await serversApi.createRole(serverId, { name: 'New Role', color: '#7c3aed' });
    await fetchRoles(serverId);
    selectRole(role);
  }

  async function save() {
    setSaving(true);
    const payload = {
      name: form.name,
      color: gradientMode ? null : form.color,
      color_gradient: gradientMode ? form.color_gradient : null,
      icon_emoji: form.icon_emoji || null,
      icon_url: form.icon_url || null,
      hoist: form.hoist,
      xp_per_message: form.xp_per_message !== '' ? Number(form.xp_per_message) : null,
      permissions: form.permissions,
    };
    await serversApi.updateRole(serverId, selected.id, payload);
    await fetchRoles(serverId);
    setSaving(false);
  }

  async function deleteRole() {
    if (!confirm(`Delete role "${selected.name}"?`)) return;
    await serversApi.deleteRole(serverId, selected.id);
    setSelected(null);
    fetchRoles(serverId);
  }

  function updateGradientStop(idx, key, val) {
    const stops = [...(form.color_gradient?.stops || [])];
    stops[idx] = { ...stops[idx], [key]: val };
    setForm(f => ({ ...f, color_gradient: { ...f.color_gradient, stops } }));
  }

  function togglePerm(key) {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  }

  return (
    <div style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      {/* Role list */}
      <div style={{ width: 200, borderRight: '1px solid var(--border-color)', overflowY: 'auto', padding: 8 }}>
        {serverRoles.map(role => (
          <div
            key={role.id}
            onClick={() => selectRole(role)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 6, cursor: 'pointer',
              background: selected?.id === role.id ? 'var(--bg-active)' : 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { if (selected?.id !== role.id) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (selected?.id !== role.id) e.currentTarget.style.background = 'transparent'; }}
          >
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: role.color || 'var(--color-muted)', flexShrink: 0 }} />
            <span className="truncate" style={{ fontSize: 13 }}>{role.name}</span>
          </div>
        ))}
        <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 8, gap: 4 }} onClick={createRole}>
          <Plus size={13} /> Add Role
        </button>
      </div>

      {/* Role editor */}
      {selected && form.name !== undefined ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 16 }}>Edit Role</h3>
            <button className="btn btn-danger btn-sm" onClick={deleteRole} style={{ gap: 4 }}><Trash2 size={13} /> Delete</button>
          </div>

          <div className="form-group">
            <label className="form-label">Role Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>

          {/* Color */}
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <button className={`btn btn-sm ${!gradientMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGradientMode(false)}>Solid</button>
              <button className={`btn btn-sm ${gradientMode ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setGradientMode(true)}>Gradient</button>
            </div>
            {!gradientMode ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 36, padding: 2, cursor: 'pointer' }} />
                <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ flex: 1 }} />
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <select value={form.color_gradient?.type} onChange={e => setForm(f => ({ ...f, color_gradient: { ...f.color_gradient, type: e.target.value } }))} style={{ width: 120 }}>
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                  {form.color_gradient?.type === 'linear' && (
                    <input type="number" value={form.color_gradient?.angle || 135} onChange={e => setForm(f => ({ ...f, color_gradient: { ...f.color_gradient, angle: Number(e.target.value) } }))} min="0" max="360" style={{ width: 80 }} placeholder="Angle" />
                  )}
                </div>
                {(form.color_gradient?.stops || []).map((stop, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <input type="color" value={stop.color} onChange={e => updateGradientStop(i, 'color', e.target.value)} style={{ width: 36, height: 30, padding: 1 }} />
                    <input type="range" min="0" max="1" step="0.01" value={stop.position} onChange={e => updateGradientStop(i, 'position', Number(e.target.value))} style={{ flex: 1 }} />
                    <span style={{ fontSize: 12, width: 36 }}>{Math.round(stop.position * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role icon */}
          <div className="form-group">
            <label className="form-label">Role Icon</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={form.icon_emoji} onChange={e => setForm(f => ({ ...f, icon_emoji: e.target.value }))} placeholder="Emoji (e.g. 🎭)" style={{ width: 120 }} />
              <input value={form.icon_url} onChange={e => setForm(f => ({ ...f, icon_url: e.target.value }))} placeholder="Or image URL" style={{ flex: 1 }} />
            </div>
          </div>

          {/* Hoist */}
          <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
              <input type="checkbox" checked={form.hoist} onChange={e => setForm(f => ({ ...f, hoist: e.target.checked }))} style={{ width: 'auto' }} />
              Separate role in user list (hoist)
            </label>
          </div>

          {/* XP per message */}
          <div className="form-group">
            <label className="form-label">XP Per Message <span style={{ color: 'var(--color-text-faint)', fontWeight: 400, textTransform: 'none' }}>(leave blank to use server default)</span></label>
            <input
              type="number" min="0" max="10000"
              value={form.xp_per_message}
              onChange={e => setForm(f => ({ ...f, xp_per_message: e.target.value }))}
              placeholder="e.g. 15"
              style={{ width: 120 }}
            />
          </div>

          {/* Permissions */}
          <div className="form-group">
            <label className="form-label">Permissions</label>
            {form.permissions?.administrator && (
              <div style={{ padding: '8px 12px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, fontSize: 12, color: '#f59e0b', marginBottom: 10 }}>
                Administrator grants all permissions.
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {PERM_GROUPS.map(group => (
                <div key={group.label}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 6 }}>
                    {group.label}
                  </div>
                  {group.perms.map(({ key, label, desc }) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={!!(form.permissions?.administrator && key !== 'administrator') || !!form.permissions?.[key]}
                        disabled={!!form.permissions?.administrator && key !== 'administrator'}
                        onChange={() => togglePerm(key)}
                        style={{ width: 'auto', marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
                        <div style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 1 }}>{desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save Role'}
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
          Select a role to edit
        </div>
      )}
    </div>
  );
}
