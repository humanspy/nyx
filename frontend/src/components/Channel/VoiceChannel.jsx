import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, Headphones, HeadphoneOff, PhoneOff, Volume2, Monitor, MonitorOff, Users, MessageSquare, Settings } from 'lucide-react';
import { useVoice } from '../../hooks/useVoice.js';
import { useServerStore } from '../../store/serverStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { voiceApi } from '../../utils/api.js';
import TextChannel from './TextChannel.jsx';
import MusicPlayer from '../Voice/MusicPlayer.jsx';
import { getInitials } from '../../utils/helpers.js';
import ChannelSettings from './ChannelSettings.jsx';
import { playJoin, playLeave } from '../../utils/sounds.js';

export default function VoiceChannel({ channel, sendTypingStart, sendTypingStop, sendMusicCommand }) {
  const { activeServerId, getPairedVoiceTextChannel, members } = useServerStore();
  const { user } = useAuthStore();
  const [serverParticipants, setServerParticipants] = useState([]);
  const [showVoiceText, setShowVoiceText] = useState(false);
  const [showChannelSettings, setShowChannelSettings] = useState(false);

  const { joined, muted, deafened, videoEnabled, screensharing, participants,
    join, leave, toggleMute, toggleDeafen, toggleVideo, toggleScreenshare } = useVoice(
    (chId, targetUserId, signal) => {
      window.dispatchEvent(new CustomEvent('nexus:voice:signal_out', { detail: { channelId: chId, targetUserId, signal } }));
    }
  );

  const pairedTextChannel = getPairedVoiceTextChannel(activeServerId, channel.id);
  const userLimit = channel.user_limit || 0;
  const atLimit = userLimit > 0 && serverParticipants.length >= userLimit && !joined;

  useEffect(() => {
    voiceApi.getParticipants(channel.id).then(setServerParticipants).catch(() => {});
  }, [channel.id]);

  // Play ringtone when someone joins while we're not in the channel
  useEffect(() => {
    const handler = (e) => {
      if (e.detail.channelId !== channel.id || joined) return;
      const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
      if (settings.ringtone_url) {
        const audio = new Audio(settings.ringtone_url);
        audio.volume = 0.6;
        audio.play().catch(() => {});
      }
    };
    window.addEventListener('nexus:voice:voice_join', handler);
    return () => window.removeEventListener('nexus:voice:voice_join', handler);
  }, [channel.id, joined]);

  async function handleJoin() {
    if (atLimit) return;
    const existing = serverParticipants.filter(p => p.userId !== user?.id);
    await join(channel.id, existing, false);
    playJoin();
    window.dispatchEvent(new CustomEvent('nexus:voice:join_out', { detail: { channelId: channel.id, serverId: activeServerId } }));
  }

  async function handleLeave() {
    leave();
    playLeave();
    window.dispatchEvent(new CustomEvent('nexus:voice:leave_out', { detail: { channelId: channel.id } }));
  }

  const serverMembers = members[activeServerId] || [];

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Voice area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#080810', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ height: 'var(--channel-header-height)', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 8, borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)', flexShrink: 0 }}>
          <Volume2 size={18} style={{ opacity: 0.7 }} />
          <span style={{ fontWeight: 700, fontSize: 15 }}>{channel.name}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, fontSize: 13, color: 'var(--color-text-muted)' }}>
            <Users size={13} />
            <span>{serverParticipants.length}{userLimit > 0 ? `/${userLimit}` : ''}</span>
          </div>
          {atLimit && (
            <span style={{ marginLeft: 8, fontSize: 12, background: 'rgba(239,68,68,0.12)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              Channel full
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--color-text-faint)' }}>🔒 E2E Encrypted</span>
            {pairedTextChannel && (
              <button
                onClick={() => setShowVoiceText(v => !v)}
                title={showVoiceText ? 'Hide text chat' : 'Open text chat'}
                style={{
                  width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 6, cursor: 'pointer',
                  background: showVoiceText ? 'var(--bg-active)' : 'var(--bg-hover)',
                  color: showVoiceText ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                <MessageSquare size={15} />
              </button>
            )}
            <button
              onClick={() => setShowChannelSettings(true)}
              title="Channel Settings"
              style={{
                width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 6, cursor: 'pointer',
                background: 'var(--bg-hover)', color: 'var(--color-text-muted)',
              }}
            >
              <Settings size={15} />
            </button>
          </div>
        </div>

        {/* Participant grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, padding: 16, alignContent: 'start', overflowY: 'auto' }}>
          {participants.map(p => (
            <ParticipantTile
              key={p.userId}
              participant={p}
              member={serverMembers.find(m => m.user_id === p.userId)}
              isOwn={p.userId === user?.id}
            />
          ))}
          {participants.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--color-text-muted)', padding: 48 }}>
              {atLimit ? 'This channel is full.' : 'No one is here yet. Join the voice channel!'}
            </div>
          )}
        </div>

        {/* Music player */}
        <MusicPlayer channelId={channel.id} serverId={activeServerId} sendMusicCommand={sendMusicCommand} />

        {/* Controls */}
        <div style={{ height: 68, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderTop: '1px solid var(--border-color)', background: 'var(--bg-primary)', padding: '0 16px', flexShrink: 0 }}>
          {joined ? (
            <>
              <ControlBtn active={muted} danger title={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
                {muted ? <MicOff size={17} /> : <Mic size={17} />}
              </ControlBtn>
              <ControlBtn active={deafened} danger title={deafened ? 'Undeafen' : 'Deafen'} onClick={toggleDeafen}>
                {deafened ? <HeadphoneOff size={17} /> : <Headphones size={17} />}
              </ControlBtn>
              <ControlBtn active={videoEnabled} title="Toggle camera" onClick={toggleVideo}>
                {videoEnabled ? <Video size={17} /> : <VideoOff size={17} />}
              </ControlBtn>
              <ControlBtn active={screensharing} title={screensharing ? 'Stop sharing' : 'Share screen'} onClick={toggleScreenshare}>
                {screensharing ? <MonitorOff size={17} /> : <Monitor size={17} />}
              </ControlBtn>
              <button onClick={handleLeave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', borderRadius: 'var(--radius-md)', background: 'var(--color-danger)', color: '#fff', fontWeight: 600, fontSize: 14 }}>
                <PhoneOff size={15} /> Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={handleJoin}
              disabled={atLimit}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 28px', borderRadius: 'var(--radius-md)', background: atLimit ? 'var(--color-muted)' : 'var(--color-accent)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: atLimit ? 'not-allowed' : 'pointer' }}
            >
              <Volume2 size={16} /> {atLimit ? 'Channel Full' : 'Join Voice'}
            </button>
          )}
        </div>
      </div>

      {/* Paired voice-text channel (toggled) */}
      {pairedTextChannel && showVoiceText && (
        <div style={{ width: 360, minWidth: 360, borderLeft: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TextChannel
            channel={pairedTextChannel}
            sendTypingStart={sendTypingStart}
            sendTypingStop={sendTypingStop}
            sendMusicCommand={sendMusicCommand}
          />
        </div>
      )}

      {showChannelSettings && (
        <ChannelSettings
          channel={channel}
          serverId={activeServerId}
          onClose={() => setShowChannelSettings(false)}
        />
      )}
    </div>
  );
}

function ParticipantTile({ participant, member, isOwn }) {
  const videoRef = useRef(null);
  const displayName = member?.nickname || member?.display_name || member?.username || participant.userId?.slice(0, 8);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]);

  return (
    <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
      {(participant.videoEnabled || participant.screensharing) && participant.stream ? (
        <video ref={videoRef} autoPlay playsInline muted={isOwn}
          style={{ width: '100%', height: '100%', objectFit: participant.screensharing ? 'contain' : 'cover' }}
        />
      ) : (
        <div className="avatar" style={{ width: 56, height: 56, fontSize: 22, background: 'var(--color-accent)' }}>
          {getInitials(displayName)}
        </div>
      )}
      <div style={{ position: 'absolute', bottom: 6, left: 6, right: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 600, background: 'rgba(0,0,0,0.72)', padding: '2px 8px', borderRadius: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
          {displayName}{isOwn ? ' (you)' : ''}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {participant.muted && <MicOff size={12} color="#ef4444" />}
          {participant.screensharing && <Monitor size={12} color="#3b82f6" />}
        </div>
      </div>
    </div>
  );
}

function ControlBtn({ children, active, danger, title, onClick }) {
  return (
    <button onClick={onClick} title={title} style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: active && danger ? 'var(--color-danger)' : active ? 'var(--color-accent)' : 'var(--bg-hover)', color: active ? '#fff' : 'var(--color-text-muted)', transition: 'all 0.15s' }}>
      {children}
    </button>
  );
}
