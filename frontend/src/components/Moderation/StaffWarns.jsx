import { useState, useEffect } from 'react';
import { modApi } from '../../utils/api.js';
import { formatTime } from '../../utils/helpers.js';
import { AlertTriangle, Search } from 'lucide-react';

const LIMIT = 20;

export default function StaffWarns({ serverId }) {
  const [warns, setWarns] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [userId, setUserId] = useState('');
  const [pendingUserId, setPendingUserId] = useState('');
  const [selected, setSelected] = useState(null);

  async function load(pg = 0, uid = userId) {
    const data = await modApi.getCases(serverId, { limit: LIMIT, offset: pg * LIMIT, action: 'warn', userId: uid });
    setWarns(data.cases || data);
    setTotal(data.total || (data.cases || data).length);
    setPage(pg);
  }

  useEffect(() => { load(0); }, [serverId]);

  function search() {
    setUserId(pendingUserId);
    load(0, pendingUserId);
  }

  async function deleteWarn(caseNum) {
    if (!confirm(`Delete warning #${caseNum}?`)) return;
    await modApi.deleteCase(serverId, caseNum);
    load(page);
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Search */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)' }} />
          <input
            value={pendingUserId}
            onChange={e => setPendingUserId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search by User ID…"
            style={{ width: '100%', paddingLeft: 30 }}
          />
        </div>
        <button onClick={search} className="btn btn-ghost btn-sm">Search</button>
        {userId && (
          <button onClick={() => { setUserId(''); setPendingUserId(''); load(0, ''); }} className="btn btn-ghost btn-sm" style={{ color: 'var(--color-text-muted)' }}>Clear</button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{total} warning{total !== 1 ? 's' : ''}{userId ? ` for user ${userId}` : ''}</span>
      </div>

      {/* Warn list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {warns.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-faint)', padding: 40, fontSize: 14 }}>No warnings found.</div>
        )}
        {warns.map(w => (
          <div
            key={w.id}
            onClick={() => setSelected(selected?.id === w.id ? null : w)}
            style={{ padding: '10px 12px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer', borderLeft: '3px solid #f59e0b' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--color-text-faint)' }}>#{w.case_number}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{w.target_username || w.target_user_id}</span>
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>by {w.moderator_username || w.moderator_id}</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--color-text-faint)' }}>{formatTime(w.created_at)}</span>
              <button
                className="btn btn-ghost btn-sm"
                style={{ color: 'var(--color-danger)', padding: '2px 6px' }}
                onClick={ev => { ev.stopPropagation(); deleteWarn(w.case_number); }}
              >✕</button>
            </div>
            {selected?.id === w.id && (
              <div style={{ marginTop: 8, padding: 10, background: 'var(--bg-input)', borderRadius: 6, fontSize: 13 }}>
                <strong>Reason:</strong> {w.reason || 'No reason provided'}
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
