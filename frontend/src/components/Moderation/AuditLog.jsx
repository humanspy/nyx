import { useState, useEffect } from 'react';
import { modApi } from '../../utils/api.js';
import { formatTime } from '../../utils/helpers.js';
import { RefreshCw } from 'lucide-react';

const ACTION_ICONS = {
  ban: '🔨', unban: '✅', kick: '👢', warn: '⚠️',
  mute: '🔇', unmute: '🔊', timeout: '⏱️', untimeout: '✅',
  hackban: '🔨', role_assign: '🎭', role_remove: '🎭',
  channel_create: '📝', channel_delete: '🗑️',
  server_update: '⚙️', message_delete: '🗑️',
  invite_create: '🔗', invite_delete: '🗑️',
};

const ACTION_COLORS = {
  ban: '#ef4444', unban: '#22c55e', kick: '#f59e0b', warn: '#f59e0b',
  mute: '#8b5cf6', unmute: '#22c55e', hackban: '#dc2626',
  timeout: '#f97316', untimeout: '#22c55e',
  channel_create: '#3b82f6', channel_delete: '#ef4444',
  role_assign: '#8b5cf6', role_remove: '#f59e0b',
};

const LIMIT = 50;

export default function AuditLog({ serverId }) {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState({ action: '', userId: '' });
  const [loading, setLoading] = useState(false);

  async function load(pg = 0) {
    setLoading(true);
    try {
      const data = await modApi.getAuditLog(serverId, { limit: LIMIT, offset: pg * LIMIT, ...filter });
      setEntries(data.entries || data);
      setTotal(data.total || (data.entries || data).length);
      setPage(pg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(0); }, [serverId, filter]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} style={{ width: 180 }}>
          <option value="">All Actions</option>
          {Object.keys(ACTION_ICONS).map(a => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
        <input value={filter.userId} onChange={e => setFilter(f => ({ ...f, userId: e.target.value }))} placeholder="Filter by User ID" style={{ width: 200 }} />
        <button onClick={() => load(page)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg-hover)', color: 'var(--color-text-muted)', fontSize: 13 }}>
          <RefreshCw size={13} className={loading ? 'spin' : ''} /> Refresh
        </button>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-faint)' }}>{total} entries</span>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {entries.length === 0 && !loading && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 40, fontSize: 14 }}>No audit log entries found.</div>
        )}
        {entries.map((e, i) => (
          <div key={e.id || i} style={{ display: 'flex', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border-color)', alignItems: 'flex-start' }}>
            <div style={{ fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{ACTION_ICONS[e.action] || '📋'}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ACTION_COLORS[e.action] || 'var(--color-text)', textTransform: 'uppercase' }}>{e.action?.replace('_', ' ')}</span>
                {e.target_username && <span style={{ fontSize: 13, color: 'var(--color-text)' }}>→ <strong>{e.target_username}</strong></span>}
                {e.moderator_username && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>by {e.moderator_username}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-faint)', whiteSpace: 'nowrap' }}>{formatTime(e.created_at)}</span>
              </div>
              {e.reason && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{e.reason}</div>}
              {e.changes && (
                <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                  {typeof e.changes === 'string' ? e.changes : JSON.stringify(e.changes)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0 0', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 0 || loading} onClick={() => load(page - 1)}>Previous</button>
        <span className="text-faint text-sm">{page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
        <button className="btn btn-ghost btn-sm" disabled={(page + 1) * LIMIT >= total || loading} onClick={() => load(page + 1)}>Next</button>
      </div>
    </div>
  );
}
