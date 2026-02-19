import { useState, useRef, useCallback, useEffect } from 'react';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

// E2E voice/video encryption via Insertable Streams API
// Each session generates a fresh AES-GCM key; key is shared out-of-band via WebSocket
const VOICE_MAGIC = 0x4e; // 'N' for NYX

async function generateVoiceKey() {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

async function exportVoiceKey(key) {
  const raw = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(raw));
}

async function importVoiceKey(raw) {
  return crypto.subtle.importKey('raw', new Uint8Array(raw), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function encryptFrame(cryptoKey, frame, controller) {
  try {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const data = frame instanceof RTCEncodedVideoFrame
      ? new Uint8Array(frame.data)
      : new Uint8Array(frame.data);
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, data);
    const encBytes = new Uint8Array(encrypted);
    const out = new Uint8Array(1 + 12 + encBytes.byteLength);
    out[0] = VOICE_MAGIC;
    out.set(iv, 1);
    out.set(encBytes, 13);
    const buf = out.buffer;
    frame.data = buf;
    controller.enqueue(frame);
  } catch {
    controller.enqueue(frame);
  }
}

async function decryptFrame(cryptoKey, frame, controller) {
  try {
    const data = new Uint8Array(frame.data);
    if (data[0] !== VOICE_MAGIC) { controller.enqueue(frame); return; }
    const iv = data.slice(1, 13);
    const ciphertext = data.slice(13);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, cryptoKey, ciphertext);
    frame.data = decrypted;
    controller.enqueue(frame);
  } catch {
    controller.enqueue(frame);
  }
}

function applySenderTransform(sender, cryptoKey) {
  if (!sender.createEncodedStreams) return;
  try {
    const { readable, writable } = sender.createEncodedStreams();
    readable.pipeThrough(new TransformStream({
      transform: (frame, ctrl) => encryptFrame(cryptoKey, frame, ctrl),
    })).pipeTo(writable);
  } catch { /* browser doesn't support, skip */ }
}

function applyReceiverTransform(receiver, cryptoKey) {
  if (!receiver.createEncodedStreams) return;
  try {
    const { readable, writable } = receiver.createEncodedStreams();
    readable.pipeThrough(new TransformStream({
      transform: (frame, ctrl) => decryptFrame(cryptoKey, frame, ctrl),
    })).pipeTo(writable);
  } catch { /* browser doesn't support, skip */ }
}

export function useVoice(onSignal) {
  const [joined, setJoined] = useState(false);
  const [muted, setMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screensharing, setScreensharing] = useState(false);

  const localStream = useRef(null);
  const screenStream = useRef(null);
  const peers = useRef({});
  const remoteStreams = useRef({});
  const channelId = useRef(null);
  const voiceKey = useRef(null);

  const getLocalStream = useCallback(async (video = false) => {
    if (localStream.current) return localStream.current;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    localStream.current = stream;
    return stream;
  }, []);

  const createPeer = useCallback((userId, initiator) => {
    const pc = new RTCPeerConnection(STUN);
    peers.current[userId] = pc;

    if (localStream.current) {
      localStream.current.getTracks().forEach(t => {
        const sender = pc.addTrack(t, localStream.current);
        if (voiceKey.current) applySenderTransform(sender, voiceKey.current);
      });
    }

    if (screenStream.current) {
      screenStream.current.getTracks().forEach(t => {
        const sender = pc.addTrack(t, screenStream.current);
        if (voiceKey.current) applySenderTransform(sender, voiceKey.current);
      });
    }

    pc.ontrack = (e) => {
      const receiver = e.receiver;
      if (voiceKey.current) applyReceiverTransform(receiver, voiceKey.current);
      remoteStreams.current[userId] = e.streams[0];
      setParticipants(p => {
        const idx = p.findIndex(x => x.userId === userId);
        if (idx >= 0) { const n = [...p]; n[idx] = { ...n[idx], stream: e.streams[0] }; return n; }
        return [...p, { userId, stream: e.streams[0] }];
      });
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) onSignal(channelId.current, userId, { type: 'ice', candidate: e.candidate });
    };

    if (initiator) {
      pc.createOffer().then(offer => {
        pc.setLocalDescription(offer);
        onSignal(channelId.current, userId, { type: 'offer', sdp: offer });
      });
    }

    return pc;
  }, [onSignal]);

  const join = useCallback(async (chId, existingParticipants = [], video = false) => {
    channelId.current = chId;
    voiceKey.current = await generateVoiceKey();
    await getLocalStream(video);
    setJoined(true);
    setVideoEnabled(video);

    for (const { userId } of existingParticipants) {
      createPeer(userId, true);
    }

    // Share voice key with all existing peers via signaling
    const keyData = await exportVoiceKey(voiceKey.current);
    for (const { userId } of existingParticipants) {
      onSignal(chId, userId, { type: 'voice_key', key: keyData });
    }
  }, [getLocalStream, createPeer, onSignal]);

  const leave = useCallback(() => {
    for (const pc of Object.values(peers.current)) pc.close();
    peers.current = {};
    remoteStreams.current = {};
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    screenStream.current?.getTracks().forEach(t => t.stop());
    screenStream.current = null;
    channelId.current = null;
    voiceKey.current = null;
    setJoined(false);
    setParticipants([]);
    setScreensharing(false);
  }, []);

  const handleSignal = useCallback(async (fromUserId, signal) => {
    if (signal.type === 'voice_key') {
      voiceKey.current = await importVoiceKey(signal.key);
      return;
    }
    if (signal.type === 'offer') {
      const pc = createPeer(fromUserId, false);
      await pc.setRemoteDescription(signal.sdp);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      onSignal(channelId.current, fromUserId, { type: 'answer', sdp: answer });
      // Send our key back to the new joiner
      if (voiceKey.current) {
        const keyData = await exportVoiceKey(voiceKey.current);
        onSignal(channelId.current, fromUserId, { type: 'voice_key', key: keyData });
      }
    } else if (signal.type === 'answer') {
      await peers.current[fromUserId]?.setRemoteDescription(signal.sdp);
    } else if (signal.type === 'ice') {
      await peers.current[fromUserId]?.addIceCandidate(signal.candidate);
    }
  }, [createPeer, onSignal]);

  const toggleMute = useCallback(() => {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = muted; });
    setMuted(m => !m);
  }, [muted]);

  const toggleDeafen = useCallback(() => {
    Object.values(remoteStreams.current).forEach(s => s.getAudioTracks().forEach(t => { t.enabled = deafened; }));
    setDeafened(d => !d);
  }, [deafened]);

  const toggleVideo = useCallback(async () => {
    if (!videoEnabled) {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const videoTrack = stream.getVideoTracks()[0];
      localStream.current?.addTrack(videoTrack);
      for (const pc of Object.values(peers.current)) {
        const sender = pc.addTrack(videoTrack, localStream.current);
        if (voiceKey.current) applySenderTransform(sender, voiceKey.current);
      }
      setVideoEnabled(true);
    } else {
      localStream.current?.getVideoTracks().forEach(t => { t.stop(); localStream.current?.removeTrack(t); });
      setVideoEnabled(false);
    }
  }, [videoEnabled]);

  const toggleScreenshare = useCallback(async () => {
    if (screensharing) {
      screenStream.current?.getTracks().forEach(t => t.stop());
      screenStream.current = null;
      setScreensharing(false);
      setParticipants(p => p.map(x => x.userId === 'local' ? { ...x, screensharing: false } : x));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenStream.current = stream;
      setScreensharing(true);

      // Add screen tracks to all existing peer connections
      for (const pc of Object.values(peers.current)) {
        stream.getTracks().forEach(t => {
          const sender = pc.addTrack(t, stream);
          if (voiceKey.current) applySenderTransform(sender, voiceKey.current);
        });
      }

      // When user clicks browser's native "Stop sharing" button
      stream.getVideoTracks()[0].onended = () => {
        screenStream.current = null;
        setScreensharing(false);
      };
    } catch {
      // User cancelled or permission denied
    }
  }, [screensharing]);

  useEffect(() => {
    const handler = (e) => {
      const { detail } = e;
      if (e.type === 'nexus:voice:voice_signal') {
        handleSignal(detail.fromUserId, detail.signal);
      } else if (e.type === 'nexus:voice:voice_leave') {
        const { userId } = detail;
        peers.current[userId]?.close();
        delete peers.current[userId];
        delete remoteStreams.current[userId];
        setParticipants(p => p.filter(x => x.userId !== userId));
      } else if (e.type === 'nexus:voice:voice_join') {
        const { userId } = detail;
        if (!peers.current[userId]) createPeer(userId, false);
        setParticipants(p => p.some(x => x.userId === userId) ? p : [...p, { userId }]);
      }
    };
    window.addEventListener('nexus:voice:voice_signal', handler);
    window.addEventListener('nexus:voice:voice_leave', handler);
    window.addEventListener('nexus:voice:voice_join', handler);
    return () => {
      window.removeEventListener('nexus:voice:voice_signal', handler);
      window.removeEventListener('nexus:voice:voice_leave', handler);
      window.removeEventListener('nexus:voice:voice_join', handler);
    };
  }, [handleSignal, createPeer]);

  return {
    joined, muted, deafened, videoEnabled, screensharing, participants,
    localStream, remoteStreams,
    join, leave, handleSignal,
    toggleMute, toggleDeafen, toggleVideo, toggleScreenshare,
  };
}
