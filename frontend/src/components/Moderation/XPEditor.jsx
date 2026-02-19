import { useState, useEffect } from 'react';
import { modApi } from '../../utils/api.js';
import { useServerStore } from '../../store/serverStore.js';
import { Search, Edit2, Check, X } from 'lucide-react';

export default function XPEditor({ serverId }) {
  const { members } = useServerStore();
  const serverMembers = members[serverId] || [];
  const [search, setSearch] = useState('');
  const [xpData, setXpData] = useState({});  // { userId: { xp, level } }
  const [editing, setEditing] = useState(null); // userId
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    modApi.getLeaderboard(serverId, { limit: 100, offset: 0 })
      .then(data => {
        const map = {};
        (data.entries || data).forEach(e => { map[e.user_id] = e; });
        setXpData(map);
      })
      .catch(() => {});
  }, [serverId]);

  const filtered = serverMembers.filter(m => {
    const name = (m.nickname || m.display_name || m.username || '').toLowerCase();
    const id = m.user_id || '';
    return !search || name.includes(search.toLowerCase()) || id.includes(search);
  });

  async function saveXp(userId) {
    const val = parseInt(editValue, 10);
    if (isNaN(val) || val < 0) { alert('Enter a valid XP value (0 or more).'); return; }
    setSaving(true);
    try {
      const result = await modApi.setXP(serverId, { userId, xp: val });
      setXpData(prev => ({ ...prev, [userId]: { ...prev[userId], xp: result.xp, level: result.level } }));
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 12, position: 'relative' }}>
        <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search members…" style={{ width: '100%', paddingLeft: 30 }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 40, fontSize: 14 }}>No members found.</div>
        )}
        {filtered.map(m => {
          const uid = m.user_id;
          const data = xpData[uid];
          const displayName = m.nickname || m.display_name || m.username;
          const isEditing = editing === uid;

          return (
            <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border-color)' }}>
              <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: 'var(--color-accent)', flexShrink: 0 }}>
                {(displayName || '?')[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{uid}</div>
              </div>

              {data ? (
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Level <strong style={{ color: 'var(--color-accent)' }}>{data.level ?? '—'}</strong></div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{data.xp ?? 0} XP</div>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--color-text-faint)', flexShrink: 0 }}>No XP</div>
              )}

              {isEditing ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <input
                    type="number"
                    min={0}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveXp(uid); if (e.key === 'Escape') setEditing(null); }}
                    style={{ width: 80, textAlign: 'right' }}
                    autoFocus
                  />
                  <button onClick={() => saveXp(uid)} disabled={saving} style={{ color: '#10b981', padding: 4 }}><Check size={14} /></button>
                  <button onClick={() => setEditing(null)} style={{ color: 'var(--color-text-muted)', padding: 4 }}><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => { setEditing(uid); setEditValue(String(data?.xp ?? 0)); }} style={{ color: 'var(--color-text-muted)', padding: 4, flexShrink: 0 }} title="Edit XP">
                  <Edit2 size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
