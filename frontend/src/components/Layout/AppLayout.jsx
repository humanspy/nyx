import { Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import ServerSidebar from './ServerSidebar.jsx';
import ChannelSidebar from './ChannelSidebar.jsx';
import MainContent from './MainContent.jsx';
import UserListPanel from './UserListPanel.jsx';
import UserIndicator from './UserIndicator.jsx';
import EmailVerificationBanner from '../Common/EmailVerificationBanner.jsx';
import AccountStandingBanner from '../Common/AccountStandingBanner.jsx';
import { useWebSocket } from '../../hooks/useWebSocket.js';
import { useAuthStore } from '../../store/authStore.js';
import { useServerStore } from '../../store/serverStore.js';

export default function AppLayout() {
  const { subscribe, unsubscribe, sendTypingStart, sendTypingStop, sendVoiceJoin, sendVoiceLeave, sendVoiceSignal, sendMusicCommand } = useWebSocket();
  const { user } = useAuthStore();
  const { activeChannelId, fetchServers } = useServerStore();

  useEffect(() => { fetchServers(); }, []);

  useEffect(() => {
    if (!activeChannelId) return;
    subscribe(activeChannelId);
    return () => unsubscribe(activeChannelId);
  }, [activeChannelId, subscribe, unsubscribe]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <EmailVerificationBanner />
      <AccountStandingBanner />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <ServerSidebar />
      <ChannelSidebar />
      <Routes>
        <Route path="/" element={<MainContent sendTypingStart={sendTypingStart} sendTypingStop={sendTypingStop} sendMusicCommand={sendMusicCommand} />} />
        <Route path="/channels/:serverId/:channelId" element={<MainContent sendTypingStart={sendTypingStart} sendTypingStop={sendTypingStop} sendMusicCommand={sendMusicCommand} />} />
        <Route path="/dm/:channelId" element={<MainContent sendTypingStart={sendTypingStart} sendTypingStop={sendTypingStop} sendMusicCommand={sendMusicCommand} />} />
      </Routes>
      <UserListPanel />
      <UserIndicator user={user} />
      </div>
    </div>
  );
}
