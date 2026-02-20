import { useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../store/authStore.js';
import { useServerStore } from '../store/serverStore.js';
import { useMessageStore } from '../store/messageStore.js';

const HEARTBEAT_INTERVAL = 25000;
const RECONNECT_DELAY = 3000;

export function useWebSocket() {
  const ws = useRef(null);
  const heartbeat = useRef(null);
  const reconnectTimer = useRef(null);
  const subscribedChannels = useRef(new Set());

  const token = useAuthStore(s => s.token);
  const { upsertChannel, removeChannel, upsertMember, removeMember, upsertServer, removeServer } = useServerStore();
  const { receiveMessage, receiveEdit, receiveDelete, setTyping, clearTyping, setPresence } = useMessageStore();

  const send = useCallback((data) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    }
  }, []);

  const subscribe = useCallback((channelId) => {
    if (subscribedChannels.current.has(channelId)) return;
    subscribedChannels.current.add(channelId);
    send({ type: 'SUBSCRIBE', channelId });
  }, [send]);

  const unsubscribe = useCallback((channelId) => {
    subscribedChannels.current.delete(channelId);
    send({ type: 'UNSUBSCRIBE', channelId });
  }, [send]);

  const sendTypingStart = useCallback((channelId) => {
    send({ type: 'TYPING_START', channelId });
  }, [send]);

  const sendTypingStop = useCallback((channelId) => {
    send({ type: 'TYPING_STOP', channelId });
  }, [send]);

  const sendVoiceJoin = useCallback((channelId, serverId) => {
    send({ type: 'VOICE_JOIN', channelId, serverId });
  }, [send]);

  const sendVoiceLeave = useCallback((channelId) => {
    send({ type: 'VOICE_LEAVE', channelId });
  }, [send]);

  const sendVoiceSignal = useCallback((channelId, targetUserId, signal) => {
    send({ type: 'VOICE_SIGNAL', channelId, targetUserId, signal });
  }, [send]);

  const sendMusicCommand = useCallback((channelId, command, payload, serverId) => {
    send({ type: 'MUSIC_COMMAND', channelId, command, payload, serverId });
  }, [send]);

  const connect = useCallback(() => {
    if (!token) return;
    if (ws.current) { ws.current.close(); ws.current = null; }

    let wsUrl;
    const apiBase = import.meta.env.VITE_API_BASE;
    if (apiBase) {
      const u = new URL(apiBase);
      u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
      u.pathname = '/ws';
      wsUrl = u.toString();
    } else {
      const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
      wsUrl = `${protocol}://${location.host}/ws`;
    }
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      send({ type: 'IDENTIFY', token });
      heartbeat.current = setInterval(() => send({ type: 'PING' }), HEARTBEAT_INTERVAL);
      // Re-subscribe all channels after reconnect
      for (const ch of subscribedChannels.current) send({ type: 'SUBSCRIBE', channelId: ch });
    };

    socket.onclose = () => {
      clearInterval(heartbeat.current);
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
    };

    socket.onerror = () => socket.close();

    socket.onmessage = (e) => {
      let msg;
      try { msg = JSON.parse(e.data); } catch { return; }

      switch (msg.type) {
        case 'PONG': break;
        case 'MESSAGE_CREATE':
          receiveMessage(msg.channelId, msg.data);
          break;
        case 'MESSAGE_UPDATE':
          receiveEdit(msg.channelId, msg.messageId, msg.data);
          break;
        case 'MESSAGE_DELETE':
          receiveDelete(msg.channelId, msg.messageId);
          break;
        case 'TYPING_START':
          setTyping(msg.channelId, msg.userId, msg.username);
          break;
        case 'TYPING_STOP':
          clearTyping(msg.channelId, msg.userId);
          break;
        case 'PRESENCE_UPDATE':
          setPresence(msg.userId, msg.data);
          break;
        case 'CHANNEL_CREATE':
        case 'CHANNEL_UPDATE':
          upsertChannel(msg.serverId, msg.data);
          break;
        case 'CHANNEL_DELETE':
          removeChannel(msg.serverId, msg.channelId);
          break;
        case 'MEMBER_UPDATE':
          upsertMember(msg.serverId, msg.data);
          break;
        case 'MEMBER_REMOVE':
          removeMember(msg.serverId, msg.userId);
          break;
        case 'SERVER_UPDATE':
          upsertServer(msg.data);
          break;
        case 'SERVER_DELETE':
          removeServer(msg.serverId);
          break;
        case 'LEVEL_UP':
          // Handled by components subscribing to events
          window.dispatchEvent(new CustomEvent('nexus:levelup', { detail: msg.data }));
          break;
        case 'MUSIC_UPDATE':
          window.dispatchEvent(new CustomEvent('nexus:music', { detail: msg }));
          break;
        case 'VOICE_JOIN':
        case 'VOICE_LEAVE':
        case 'VOICE_SIGNAL':
          window.dispatchEvent(new CustomEvent(`nexus:voice:${msg.type.toLowerCase()}`, { detail: msg }));
          break;
        default: break;
      }
    };
  }, [token, send, receiveMessage, receiveEdit, receiveDelete, setTyping, clearTyping, setPresence,
      upsertChannel, removeChannel, upsertMember, removeMember, upsertServer, removeServer]);

  useEffect(() => {
    connect();
    return () => {
      clearInterval(heartbeat.current);
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { send, subscribe, unsubscribe, sendTypingStart, sendTypingStop, sendVoiceJoin, sendVoiceLeave, sendVoiceSignal, sendMusicCommand };
}
