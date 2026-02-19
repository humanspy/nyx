import { useState } from 'react';
import { Edit2, Trash2, History, Flag } from 'lucide-react';
import { useMessageStore } from '../../store/messageStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { formatTime, getInitials } from '../../utils/helpers.js';
import { messagesApi } from '../../utils/api.js';
import { parseMentions } from '../../utils/parseMentions.jsx';
import ReportModal from '../Moderation/ReportModal.jsx';

const MINUTE = 60000;

export default function MessageItem({ message, prevMessage, channelId }) {
  const { user } = useAuthStore();
  const { editMessage, deleteMessage } = useMessageStore();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);

  const isOwn = message.author_id === user?.id;
  const isSystem = message.type === 'system';
  const isDeleted = !!message.deleted_at;

  const prevIsSameAuthor = prevMessage?.author_id === message.author_id
    && (new Date(message.created_at) - new Date(prevMessage.created_at)) < 5 * MINUTE;

  const displayName = message.display_name || message.username || 'Unknown';
  const avatar = message.avatar_url;

  async function startEdit() {
    setEditContent(message.content || '');
    setEditing(true);
    setShowMenu(false);
  }

  async function submitEdit(e) {
    e.preventDefault();
    if (!editContent.trim()) return;
    await editMessage(channelId, message.id, editContent.trim());
    setEditing(false);
  }

  async function handleDelete() {
    if (!confirm('Delete this message?')) return;
    await deleteMessage(channelId, message.id);
    setShowMenu(false);
  }

  async function loadHistory() {
    const h = await messagesApi.getHistory(channelId, message.id);
    setHistory(h);
    setShowHistory(true);
  }

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', padding: '4px 16px', fontSize: 12, color: 'var(--color-text-faint)' }}>
        {message.content}
      </div>
    );
  }

  return (
    <div
      style={{ position: 'relative', display: 'flex', gap: 12, padding: prevIsSameAuthor ? '2px 16px' : '12px 16px 2px', alignItems: 'flex-start' }}
      onMouseEnter={e => e.currentTarget.querySelector('.msg-actions')?.style && (e.currentTarget.querySelector('.msg-actions').style.opacity = '1')}
      onMouseLeave={e => e.currentTarget.querySelector('.msg-actions')?.style && (e.currentTarget.querySelector('.msg-actions').style.opacity = '0')}
    >
      {/* Avatar / spacer */}
      <div style={{ width: 40, flexShrink: 0 }}>
        {!prevIsSameAuthor && (
          avatar
            ? <img src={avatar} alt="" className="avatar" style={{ width: 40, height: 40 }} />
            : <div className="avatar" style={{ width: 40, height: 40, fontSize: 14, background: 'var(--bg-tertiary)' }}>{getInitials(displayName)}</div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {!prevIsSameAuthor && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{displayName}</span>
            <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>{formatTime(message.created_at)}</span>
          </div>
        )}

        {editing ? (
          <form onSubmit={submitEdit}>
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              autoFocus
              onKeyDown={e => { if (e.key === 'Escape') setEditing(false); if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitEdit(e); } }}
              style={{ width: '100%', resize: 'none', minHeight: 60, padding: 8 }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button type="submit" className="btn btn-primary btn-sm">Save</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </form>
        ) : (
          <div style={{ fontSize: 14, lineHeight: 1.5, color: isDeleted ? 'var(--color-text-faint)' : 'var(--color-text)', fontStyle: isDeleted ? 'italic' : 'normal' }}>
            {isDeleted
              ? '[message deleted]'
              : message.content
                ? parseMentions(message.content)
                : '[unable to decrypt]'}
            {message.edited_at && !isDeleted && (
              <span style={{ fontSize: 11, color: 'var(--color-text-faint)', marginLeft: 6 }}>(edited)</span>
            )}
          </div>
        )}

        {/* Attachments */}
        {message.attachments?.map(a => (
          <div key={a.id} style={{ marginTop: 4 }}>
            {a.mime_type?.startsWith('image/') ? (
              <img src={a.url} alt={a.filename} style={{ maxWidth: 400, maxHeight: 300, borderRadius: 8, objectFit: 'contain' }} />
            ) : (
              <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', padding: '6px 12px', borderRadius: 6, fontSize: 13 }}>
                📎 {a.filename}
              </a>
            )}
          </div>
        ))}
      </div>

      {/* Hover actions */}
      {!isDeleted && (
        <div className="msg-actions" style={{ position: 'absolute', top: 4, right: 12, display: 'flex', gap: 2, opacity: 0, transition: 'opacity 0.1s', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: 2 }}>
          {isOwn && (
            <>
              <button className="btn btn-icon btn-ghost btn-sm" title="Edit" onClick={startEdit}><Edit2 size={14} /></button>
              <button className="btn btn-icon btn-ghost btn-sm" title="Delete" onClick={handleDelete} style={{ color: 'var(--color-danger)' }}><Trash2 size={14} /></button>
            </>
          )}
          {message.edited_at && (
            <button className="btn btn-icon btn-ghost btn-sm" title="Edit history" onClick={loadHistory}><History size={14} /></button>
          )}
          {!isOwn && (
            <button className="btn btn-icon btn-ghost btn-sm" title="Report message" onClick={() => setShowReport(true)} style={{ color: 'var(--color-text-faint)' }}>
              <Flag size={14} />
            </button>
          )}
        </div>
      )}

      {showReport && (
        <ReportModal type="message" targetId={message.id} onClose={() => setShowReport(false)} />
      )}

      {/* Edit history modal */}
      {showHistory && (
        <div className="overlay" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Edit History</span>
              <button onClick={() => setShowHistory(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            {history.map((h, i) => (
              <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', fontSize: 13 }}>
                <div className="text-faint text-xs" style={{ marginBottom: 4 }}>{formatTime(h.edited_at)}</div>
                <div>{h.content}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
