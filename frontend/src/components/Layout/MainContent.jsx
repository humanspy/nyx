import { useParams } from 'react-router-dom';
import { useEffect } from 'react';
import TextChannel from '../Channel/TextChannel.jsx';
import VoiceChannel from '../Channel/VoiceChannel.jsx';
import ForumChannel from '../Channel/ForumChannel.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';
import { useServerStore } from '../../store/serverStore.js';

export default function MainContent({ sendTypingStart, sendTypingStop, sendMusicCommand }) {
  const { channelId, serverId } = useParams();
  const { setActiveChannel, setActiveServer, channels } = useServerStore();

  useEffect(() => {
    if (serverId) setActiveServer(serverId);
    if (channelId) setActiveChannel(channelId);
  }, [serverId, channelId]);

  const channel = channelId && serverId
    ? (channels[serverId] || []).find(c => c.id === channelId)
    : null;

  if (!channelId) return <WelcomeScreen />;
  if (!channel) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>Loading…</div>;

  if (channel.type === 'voice') {
    return <VoiceChannel channel={channel} sendTypingStart={sendTypingStart} sendTypingStop={sendTypingStop} sendMusicCommand={sendMusicCommand} />;
  }
  if (channel.type === 'forum') {
    return <ForumChannel channel={channel} />;
  }

  // text, announcement, voice_text, dm
  return (
    <TextChannel
      channel={channel}
      sendTypingStart={sendTypingStart}
      sendTypingStop={sendTypingStop}
      sendMusicCommand={sendMusicCommand}
    />
  );
}
