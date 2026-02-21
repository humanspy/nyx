import { useState, useEffect } from 'react';
import { UserPlus, Users, Clock, Check, X, MessageCircle, Search } from 'lucide-react';
import { friendsApi, channelsApi } from '../../utils/api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useNavigate } from 'react-router-dom';
import Avatar from '../Common/Avatar.jsx';

const STATUS_COLORS = {
  online: '#22c55e', idle: '#f59e0b', dnd: '#ef4444', offline: '#747f8d', invisible: '#747f8d',
};

const TABS = [
  { id: 'online',  label: 'Online',  icon: Users },
  { id: 'all',     label: 'All',     icon: Users },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'add',     label: 'Add Friend', icon: UserPlus, accent: true },
];

export default function FriendsPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState('online');
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addUsername, setAddUsername] = useState('');
  const [addStatus, setAddStatus] = useState(null); // { type: 'success'|'error', msg }
  const [addLoading, setAddLoading] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const data = await friendsApi.getAll();
      setFriends(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function sendRequest(e) {
    e.preventDefault();
    if (!addUsername.trim()) return;
    setAddLoading(true);
    setAddStatus(null);
    try {
      const res = await friendsApi.send(addUsername.trim());
      if (res.status === 'accepted') {
        setAddStatus({ type: 'success', msg: `You are now friends with ${res.user?.display_name || addUsername}!` });
      } else {
        setAddStatus({ type: 'success', msg: `Friend request sent to ${addUsername}!` });
      }
      setAddUsername('');
      load();
    } catch (err) {
      setAddStatus({ type: 'error', msg: err.data?.error || 'Failed to send request' });
    } finally {
      setAddLoading(false);
    }
  }

  async function acceptFriend(friendId) {
    try { await friendsApi.accept(friendId); load(); } catch {}
  }

  async function removeFriend(friendId) {
    try { await friendsApi.remove(friendId); load(); } catch {}
  }

  async function openDM(friendId) {
    try {
      const ch = await channelsApi.createDM({ participantIds: [friendId] });
      navigate(`/dm/${ch.id}`);
    } catch {}
  }

  const accepted = friends.filter(f => f.status === 'accepted');
  const online = accepted.filter(f => f.presence && f.presence !== 'offline' && f.presence !== 'invisible');
  const pending = friends.filter(f => f.status === 'pending');
  const incoming = pending.filter(f => f.direction === 'incoming');
  const outgoing = pending.filter(f => f.direction === 'outgoing');

  const displayed =
    tab === 'online'  ? online :
    tab === 'all'     ? accepted :
    tab === 'pending' ? pending : [];

  const pendingCount = incoming.length;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        height: 48, display: 'flex', alignItems: 'center', gap: 16,
        padding: '0 16px', borderBottom: '1px solid var(--border-color)',
        flexShrink: 0,
      }}>
        <Users size={20} color="var(--color-text-muted)" />
        <span style={{ fontWeight: 700, fontSize: 16 }}>Friends</span>
        <div style={{ width: 1, height: 24, background: 'var(--border-color)' }} />
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '4px 12px', borderRadius: 4, fontSize: 14, fontWeight: 500,
              cursor: 'pointer',
              background: tab === t.id ? 'var(--bg-hover)' : 'none',
              color: t.accent
                ? (tab === t.id ? 'var(--color-success)' : 'var(--color-success)')
                : (tab === t.id ? 'var(--color-text)' : 'var(--color-text-muted)'),
              position: 'relative',
            }}
          >
            {t.label}
            {t.id === 'pending' && pendingCount > 0 && (
              <span style={{
                position: 'absolute', top: 1, right: 2,
                background: 'var(--color-danger)', color: '#fff',
                borderRadius: '50%', width: 16, height: 16,
                fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

          {/* Add Friend tab */}
          {tab === 'add' && (
            <div style={{ maxWidth: 480 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Add Friend</h2>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16 }}>
                You can add friends by their username.
              </p>
              <form onSubmit={sendRequest} style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  flex: 1, display: 'flex', alignItems: 'center', gap: 8,
                  background: 'var(--bg-tertiary)', borderRadius: 8,
                  padding: '0 12px', border: '1px solid var(--border-color)',
                }}>
                  <Search size={14} color="var(--color-text-muted)" />
                  <input
                    value={addUsername}
                    onChange={e => { setAddUsername(e.target.value); setAddStatus(null); }}
                    placeholder="Enter a username"
                    style={{
                      flex: 1, background: 'none', border: 'none', outline: 'none',
                      color: 'var(--color-text)', fontSize: 14, padding: '10px 0',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={!addUsername.trim() || addLoading}
                  style={{
                    padding: '0 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: 'var(--color-accent)', color: '#fff', cursor: 'pointer',
                    opacity: (!addUsername.trim() || addLoading) ? 0.5 : 1,
                  }}
                >
                  Send Friend Request
                </button>
              </form>
              {addStatus && (
                <div style={{
                  marginTop: 12, padding: '10px 14px', borderRadius: 6,
                  background: addStatus.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                  color: addStatus.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
                  fontSize: 13,
                }}>
                  {addStatus.msg}
                </div>
              )}
            </div>
          )}

          {/* Friend lists */}
          {tab !== 'add' && (
            <>
              {loading ? (
                <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading…</div>
              ) : (
                <>
                  {/* Pending: split incoming/outgoing */}
                  {tab === 'pending' && (
                    <>
                      {incoming.length > 0 && (
                        <FriendSection
                          title={`Incoming — ${incoming.length}`}
                          items={incoming}
                          onAccept={acceptFriend}
                          onRemove={removeFriend}
                          onDM={openDM}
                          type="incoming"
                        />
                      )}
                      {outgoing.length > 0 && (
                        <FriendSection
                          title={`Outgoing — ${outgoing.length}`}
                          items={outgoing}
                          onRemove={removeFriend}
                          type="outgoing"
                        />
                      )}
                      {pending.length === 0 && (
                        <EmptyState icon="🕐" text="No pending friend requests" />
                      )}
                    </>
                  )}

                  {/* Online / All */}
                  {(tab === 'online' || tab === 'all') && (
                    <>
                      {displayed.length > 0 ? (
                        <FriendSection
                          title={`${tab === 'online' ? 'Online' : 'All Friends'} — ${displayed.length}`}
                          items={displayed}
                          onRemove={removeFriend}
                          onDM={openDM}
                          type="accepted"
                        />
                      ) : (
                        <EmptyState
                          icon={tab === 'online' ? '😴' : '👥'}
                          text={tab === 'online' ? 'No friends online' : 'No friends yet — add some!'}
                        />
                      )}
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Active Now sidebar */}
        <div style={{
          width: 240, borderLeft: '1px solid var(--border-color)',
          padding: '16px 12px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Active Now
          </div>
          {online.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 8px' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👻</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.4 }}>
                It's quiet for now…
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-text-faint)', marginTop: 4 }}>
                When a friend starts an activity—like a game or voice channel—we'll show it here.
              </div>
            </div>
          ) : (
            online.slice(0, 6).map(f => (
              <div key={f.friend_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Avatar
                  src={f.avatar_url}
                  name={f.display_name || f.username}
                  size={28}
                  status={f.presence}
                  showStatus
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="truncate" style={{ fontSize: 12, fontWeight: 600 }}>{f.display_name || f.username}</div>
                  <div style={{ fontSize: 11, color: STATUS_COLORS[f.presence] || STATUS_COLORS.offline }}>
                    {f.presence === 'dnd' ? 'Do Not Disturb' : f.presence?.charAt(0).toUpperCase() + f.presence?.slice(1)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function FriendSection({ title, items, onAccept, onRemove, onDM, type }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)', marginBottom: 8 }}>
        {title}
      </div>
      {items.map(f => (
        <FriendRow key={f.friend_id} friend={f} onAccept={onAccept} onRemove={onRemove} onDM={onDM} type={type} />
      ))}
    </div>
  );
}

function FriendRow({ friend, onAccept, onRemove, onDM, type }) {
  const statusColor = STATUS_COLORS[friend.presence] || STATUS_COLORS.offline;
  const statusLabel =
    !friend.presence || friend.presence === 'offline' || friend.presence === 'invisible' ? 'Offline' :
    friend.presence === 'dnd' ? 'Do Not Disturb' :
    friend.presence.charAt(0).toUpperCase() + friend.presence.slice(1);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '8px 12px', borderRadius: 8, cursor: 'default',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'none'}
    >
      <Avatar
        src={friend.avatar_url}
        name={friend.display_name || friend.username}
        size={32}
        status={friend.presence}
        showStatus={type === 'accepted'}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="truncate" style={{ fontSize: 14, fontWeight: 600 }}>
          {friend.display_name || friend.username}
        </div>
        <div style={{ fontSize: 12, color: type === 'accepted' ? statusColor : 'var(--color-text-muted)' }}>
          {type === 'accepted' ? statusLabel :
           type === 'incoming' ? 'Incoming Friend Request' :
           'Outgoing Friend Request'}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        {type === 'incoming' && (
          <ActionBtn color="var(--color-success)" title="Accept" onClick={() => onAccept(friend.friend_id)}>
            <Check size={16} />
          </ActionBtn>
        )}
        {(type === 'accepted') && onDM && (
          <ActionBtn color="var(--color-text-muted)" title="Message" onClick={() => onDM(friend.friend_id)}>
            <MessageCircle size={16} />
          </ActionBtn>
        )}
        <ActionBtn color="var(--color-danger)" title={type === 'accepted' ? 'Remove Friend' : 'Cancel'} onClick={() => onRemove(friend.friend_id)}>
          <X size={16} />
        </ActionBtn>
      </div>
    </div>
  );
}

function ActionBtn({ children, color, title, onClick }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 32, height: 32, borderRadius: '50%',
        background: 'var(--bg-secondary)', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--color-text-muted)',
        transition: 'color 0.1s, background 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = color; e.currentTarget.style.background = 'var(--bg-tertiary)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.background = 'var(--bg-secondary)'; }}
    >
      {children}
    </button>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{text}</div>
    </div>
  );
}
