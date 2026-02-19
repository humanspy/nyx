import { useState, useEffect } from 'react';
import { modApi } from '../../utils/api.js';
import { formatTime } from '../../utils/helpers.js';

const ACTION_COLORS = {
  ban: '#ef4444', unban: '#22c55e', kick: '#f59e0b', warn: '#f59e0b',
  mute: '#8b5cf6', unmute: '#22c55e', hackban: '#dc2626', timeout: '#f97316',
  untimeout: '#22c55e',
};

export default function CaseViewer({ serverId }) {
  const [cases, setCases] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState({ userId: '', action: '' });
  const [selected, setSelected] = useState(null);
  const LIMIT = 25;

  async function load(pg = 0) {
    const data = await modApi.getCases(serverId, { limit: LIMIT, offset: pg * LIMIT, ...filter });
    setCases(data.cases || data);
    setTotal(data.total || (data.cases || data).length);
    setPage(pg);
  }

  useEffect(() => { load(0); }, [serverId, filter]);

  async function deleteCase(caseNum) {
    if (!confirm(`Delete case #${caseNum}?`)) return;
    await modApi.deleteCase(serverId, caseNum);
    load(page);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input value={filter.userId} onChange={e => setFilter(f => ({ ...f, userId: e.target.value }))} placeholder="Filter by User ID" style={{ width: 200 }} />
        <select value={filter.action} onChange={e => setFilter(f => ({ ...f, action: e.target.value }))} style={{ width: 160 }}>
          <option value="">All Actions</option>
          {['warn', 'mute', 'unmute', 'timeout', 'untimeout', 'kick', 'ban', 'unban', 'hackban'].map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Case list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {cases.map(c => (
          <div
            key={c.id}
            onClick={() => setSelected(selected?.id === c.id ? null : c)}
            style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', borderLeft: `3px solid ${ACTION_COLORS[c.action] || '#64748b'}`, transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-faint)' }}>#{c.case_number}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: ACTION_COLORS[c.action] || 'inherit', textTransform: 'uppercase' }}>{c.action}</span>
              <span style={{ flex: 1 }} />
              <span className="text-faint text-xs">{formatTime(c.created_at)}</span>
              <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', padding: '2px 6px' }} onClick={ev => { ev.stopPropagation(); deleteCase(c.case_number); }}>✕</button>
            </div>
            <div className="text-sm text-muted truncate">
              <strong>User:</strong> {c.target_username || c.target_user_id} · <strong>Mod:</strong> {c.moderator_username || c.moderator_id}
            </div>
            {selected?.id === c.id && (
              <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-input)', borderRadius: 6, fontSize: 13 }}>
                <div><strong>Reason:</strong> {c.reason || 'No reason provided'}</div>
                {c.duration_seconds && <div><strong>Duration:</strong> {Math.floor(c.duration_seconds / 3600)}h {Math.floor((c.duration_seconds % 3600) / 60)}m</div>}
                {c.expires_at && <div><strong>Expires:</strong> {formatTime(c.expires_at)}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 0 0', borderTop: '1px solid var(--border-color)' }}>
        <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => load(page - 1)}>Previous</button>
        <span className="text-faint text-sm">{page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}</span>
        <button className="btn btn-ghost btn-sm" disabled={(page + 1) * LIMIT >= total} onClick={() => load(page + 1)}>Next</button>
      </div>
    </div>
  );
}
