import { useState, useEffect } from 'react';
import { Plus, MessageSquareDot, X } from 'lucide-react';
import { channelsApi } from '../../utils/api.js';
import { formatTime } from '../../utils/helpers.js';
import MessageList from '../Message/MessageList.jsx';
import MessageInput from '../Message/MessageInput.jsx';
import { useServerStore } from '../../store/serverStore.js';

export default function ForumChannel({ channel }) {
  const { activeServerId } = useServerStore();
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => {
    channelsApi.getForumThreads(channel.id).then(setThreads).catch(() => {});
  }, [channel.id]);

  async function createThread(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const thread = await channelsApi.createForumThread(channel.id, { title: newTitle.trim() });
    setThreads(t => [...t, thread]);
    setNewTitle('');
    setShowCreate(false);
    setActiveThread(thread);
  }

  if (activeThread) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
        <div style={{ height: 'var(--channel-header-height)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border-color)' }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setActiveThread(null)}>← Back</button>
          <MessageSquareDot size={16} style={{ opacity: 0.7 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{activeThread.title}</span>
          {activeThread.closed && <span style={{ fontSize: 12, background: 'var(--color-muted)', padding: '2px 8px', borderRadius: 4 }}>Closed</span>}
        </div>
        <MessageList channelId={activeThread.id} />
        {!activeThread.closed && (
          <MessageInput
            channel={{ id: activeThread.id, name: activeThread.title, type: 'text' }}
            sendTypingStart={() => {}}
            sendTypingStop={() => {}}
            sendMusicCommand={() => {}}
            serverId={activeServerId}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      <div style={{ height: 'var(--channel-header-height)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageSquareDot size={18} style={{ opacity: 0.7 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{channel.name}</span>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)} style={{ gap: 4 }}>
          <Plus size={14} /> New Thread
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {threads.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 40 }}>No threads yet. Start the first one!</div>
        )}
        {threads.map(t => (
          <div
            key={t.id}
            onClick={() => setActiveThread(t)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 6, cursor: 'pointer', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
          >
            <MessageSquareDot size={18} color="var(--color-accent)" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.title}</div>
              <div className="text-faint text-xs" style={{ marginTop: 2 }}>
                {t.reply_count || 0} replies · {formatTime(t.created_at)}
                {t.closed && ' · Closed'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">New Thread</span>
              <button onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm"><X size={16} /></button>
            </div>
            <form onSubmit={createThread}>
              <div className="form-group">
                <label className="form-label">Thread Title</label>
                <input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What's on your mind?" required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Create Thread</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
