import { useEffect } from 'react';
import { Hash, Rss, MessageSquareDot, Lock, Volume2 } from 'lucide-react';
import MessageList from '../Message/MessageList.jsx';
import MessageInput from '../Message/MessageInput.jsx';
import { useServerStore } from '../../store/serverStore.js';
import { useEncryption } from '../../hooks/useEncryption.js';

const ICONS = { text: Hash, announcement: Rss, forum: MessageSquareDot, voice_text: Volume2 };

export default function TextChannel({ channel, sendTypingStart, sendTypingStop, sendMusicCommand }) {
  const { activeServerId } = useServerStore();
  const { ensureChannelKey } = useEncryption();

  useEffect(() => {
    if (channel?.id) ensureChannelKey(channel.id);
  }, [channel?.id]);

  if (!channel) return null;

  const Icon = ICONS[channel.type] || Hash;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Channel header */}
      <div style={{
        height: 'var(--channel-header-height)', display: 'flex', alignItems: 'center',
        padding: '0 16px', borderBottom: '1px solid var(--border-color)',
        gap: 8, flexShrink: 0, background: 'var(--bg-primary)',
      }}>
        <Icon size={18} style={{ opacity: 0.7 }} />
        <span style={{ fontWeight: 700, fontSize: 15 }}>{channel.name}</span>
        {channel.topic && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border-color)', margin: '0 8px' }} />
            <span className="text-muted text-sm truncate">{channel.topic}</span>
          </>
        )}
        {channel.type === 'voice_text' && (
          <span style={{ marginLeft: 'auto', fontSize: 12, background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: 'var(--radius-full)', color: 'var(--color-text-muted)' }}>
            Voice Text · Music commands available
          </span>
        )}
      </div>

      <MessageList channelId={channel.id} />

      <MessageInput
        channel={channel}
        sendTypingStart={sendTypingStart}
        sendTypingStop={sendTypingStop}
        sendMusicCommand={sendMusicCommand}
        serverId={activeServerId}
      />
    </div>
  );
}
