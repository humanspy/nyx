import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, X, ShieldAlert } from 'lucide-react';
import { useMessageStore } from '../../store/messageStore.js';
import { mediaApi, automodApi } from '../../utils/api.js';
import { encryptFile, generateFileKey } from '../../crypto/fileEncryption.js';
import { encodeBase64 } from 'tweetnacl-util';

// Music slash commands — only available in voice_text channels
const MUSIC_COMMANDS = [
  { name: '/play', desc: 'Play a track or URL', usage: '/play <url or search query>', args: true },
  { name: '/pause', desc: 'Pause / resume playback', usage: '/pause', args: false },
  { name: '/stop', desc: 'Stop playback and clear queue', usage: '/stop', args: false },
  { name: '/skip', desc: 'Skip to next track', usage: '/skip', args: false },
  { name: '/previous', desc: 'Go back to previous track', usage: '/previous', args: false },
  { name: '/shuffle', desc: 'Shuffle the queue', usage: '/shuffle', args: false },
  { name: '/loop', desc: 'Toggle loop mode (off → track → queue)', usage: '/loop', args: false },
  { name: '/autoplay', desc: 'Toggle autoplay', usage: '/autoplay', args: false },
  { name: '/queue', desc: 'Show the current queue', usage: '/queue', args: false },
  { name: '/clearqueue', desc: 'Clear the queue', usage: '/clearqueue', args: false },
  { name: '/nowplaying', desc: 'Show currently playing track', usage: '/nowplaying', args: false },
];

// General slash commands (available in all channels)
const GENERAL_COMMANDS = [
  { name: '/shrug', desc: 'Append ¯\\_(ツ)_/¯', usage: '/shrug', args: false },
  { name: '/me', desc: 'Send an action message', usage: '/me <action>', args: true },
];

function getCommandMap(isVoiceTextChannel) {
  return isVoiceTextChannel ? [...GENERAL_COMMANDS, ...MUSIC_COMMANDS] : GENERAL_COMMANDS;
}

const MUSIC_CMD_MAP = {
  '/play': 'PLAY', '/pause': 'PAUSE', '/stop': 'STOP', '/skip': 'SKIP',
  '/previous': 'PREVIOUS', '/shuffle': 'SHUFFLE', '/loop': 'LOOP',
  '/autoplay': 'AUTOPLAY', '/queue': 'QUEUE_LIST', '/clearqueue': 'QUEUE_CLEAR',
  '/nowplaying': 'NOW_PLAYING',
};

export default function MessageInput({ channel, sendTypingStart, sendTypingStop, sendMusicCommand, serverId }) {
  const { sendMessage } = useMessageStore();
  const [content, setContent] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [automodError, setAutomodError] = useState('');
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);
  const isTyping = useRef(false);
  const fileInput = useRef(null);
  const automodConfig = useRef(null);

  const isVoiceText = channel?.type === 'voice_text';
  const allCommands = getCommandMap(isVoiceText);

  // Fetch AutoMod config for this server (client-side enforcement preserves E2E)
  useEffect(() => {
    if (!serverId) { automodConfig.current = null; return; }
    automodApi.get(serverId)
      .then(cfg => { automodConfig.current = cfg; })
      .catch(() => { automodConfig.current = null; });
  }, [serverId]);

  // Adjust textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
  }, [content]);

  // Slash command suggestions
  useEffect(() => {
    if (!content.startsWith('/')) { setSuggestions([]); return; }
    const query = content.toLowerCase();
    const matched = allCommands.filter(c => c.name.startsWith(query) || c.usage.toLowerCase().startsWith(query));
    setSuggestions(matched.slice(0, 8));
    setSelectedSuggestion(0);
  }, [content, isVoiceText]);

  function handleTyping() {
    if (!isTyping.current) {
      sendTypingStart(channel.id);
      isTyping.current = true;
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      sendTypingStop(channel.id);
      isTyping.current = false;
    }, 4000);
  }

  function handleChange(e) {
    setContent(e.target.value);
    if (e.target.value.trim()) handleTyping();
  }

  async function handleMusicCommand(cmdName, args) {
    const musicKey = MUSIC_CMD_MAP[cmdName];
    if (!musicKey || !serverId) return;
    const payload = {};
    if (cmdName === '/play' && args) {
      // Try URL first, fallback to search query
      payload.url = args.trim().startsWith('http') ? args.trim() : undefined;
      payload.query = !payload.url ? args.trim() : undefined;
    }
    sendMusicCommand(channel.id, musicKey, payload, serverId);
  }

  async function submit() {
    const trimmed = content.trim();
    if (!trimmed && !files.length) return;

    // AutoMod: client-side check before encryption (preserves E2E)
    if (trimmed && automodConfig.current) {
      const cfg = automodConfig.current;
      const lower = trimmed.toLowerCase();
      if (cfg.blocked_words?.length) {
        const hit = cfg.blocked_words.find(w => lower.includes(w.toLowerCase()));
        if (hit) { setAutomodError(`Your message was blocked by AutoMod.`); return; }
      }
      if (cfg.block_invites && /(?:discord\.gg|nyx\.gg|join\?invite=)[^\s]*/i.test(trimmed)) {
        setAutomodError('Invite links are not allowed in this server.'); return;
      }
      if (cfg.block_links && /https?:\/\/[^\s]+/i.test(trimmed)) {
        setAutomodError('External links are not allowed in this server.'); return;
      }
    }
    setAutomodError('');

    // Handle slash commands
    if (trimmed.startsWith('/')) {
      const spaceIdx = trimmed.indexOf(' ');
      const cmdName = spaceIdx >= 0 ? trimmed.slice(0, spaceIdx) : trimmed;
      const args = spaceIdx >= 0 ? trimmed.slice(spaceIdx + 1) : '';

      if (cmdName === '/shrug') {
        setContent(prev => prev.replace('/shrug', '') + ' ¯\\_(ツ)_/¯');
        return;
      }
      if (cmdName === '/me') {
        setContent('');
        await sendMessage(channel.id, `_${args}_`);
        return;
      }

      if (MUSIC_CMD_MAP[cmdName]) {
        await handleMusicCommand(cmdName, args);
        setContent('');
        return;
      }
    }

    setContent('');
    clearTimeout(typingTimer.current);
    sendTypingStop(channel.id);
    isTyping.current = false;
    setSuggestions([]);

    // Upload files first
    let attachments = [];
    if (files.length) {
      setUploading(true);
      attachments = await uploadFiles(files);
      setFiles([]);
      setUploading(false);
    }

    await sendMessage(channel.id, trimmed, attachments);
  }

  async function uploadFiles(fileList) {
    const results = [];
    for (const file of fileList) {
      const fileKey = await generateFileKey();
      const encrypted = await encryptFile(fileKey, file);
      const { uploadUrl, fileId } = await mediaApi.getUploadUrl({
        filename: file.name,
        mimeType: 'application/octet-stream',
        size: encrypted.size,
        channelId: channel.id,
      });
      await fetch(uploadUrl, { method: 'PUT', body: encrypted, headers: { 'Content-Type': 'application/octet-stream' } });
      await mediaApi.completeUpload({ fileId, encryptedKey: encodeBase64(fileKey), originalMimeType: file.type, originalName: file.name, originalSize: file.size });
      results.push({ fileId, filename: file.name, mimeType: file.type });
    }
    return results;
  }

  function onKeyDown(e) {
    if (suggestions.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedSuggestion(i => Math.min(i + 1, suggestions.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedSuggestion(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Tab' || e.key === 'Enter' && suggestions.length) {
        e.preventDefault();
        const s = suggestions[selectedSuggestion];
        if (s) {
          if (s.args) {
            setContent(s.name + ' ');
          } else {
            setContent(s.name);
          }
          setSuggestions([]);
        }
        return;
      }
      if (e.key === 'Escape') { setSuggestions([]); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function addFiles(e) {
    const selected = Array.from(e.target.files || []);
    const MAX = 1024 * 1024 * 1024;
    const valid = selected.filter(f => f.size <= MAX);
    setFiles(prev => [...prev, ...valid]);
    e.target.value = '';
  }

  function removeFile(idx) {
    setFiles(f => f.filter((_, i) => i !== idx));
  }

  const placeholder = isVoiceText
    ? `Message #${channel.name} — Type / for music commands`
    : `Message #${channel?.name || '…'}`;

  return (
    <div style={{ padding: '0 16px 16px', position: 'relative' }}>
      {/* Slash command suggestions */}
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 16, right: 16, marginBottom: 4,
          background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow)',
          zIndex: 100,
        }}>
          <div style={{ padding: '6px 12px', fontSize: 11, color: 'var(--color-text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border-color)' }}>
            {isVoiceText ? 'Commands (including music)' : 'Commands'}
          </div>
          {suggestions.map((s, i) => (
            <div
              key={s.name}
              onClick={() => { setContent(s.args ? s.name + ' ' : s.name); setSuggestions([]); textareaRef.current?.focus(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 12px', cursor: 'pointer',
                background: i === selectedSuggestion ? 'var(--bg-active)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelectedSuggestion(i)}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--color-accent)', minWidth: 120 }}>{s.name}</span>
              <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{s.desc}</span>
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--color-text-faint)', fontFamily: 'var(--font-mono)' }}>{s.usage}</span>
            </div>
          ))}
        </div>
      )}

      {/* AutoMod block notice */}
      {automodError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', marginBottom: 6, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: 'var(--color-danger,#ef4444)' }}>
          <ShieldAlert size={14} style={{ flexShrink: 0 }} />
          {automodError}
          <button onClick={() => setAutomodError('')} style={{ marginLeft: 'auto', background: 'none', color: 'inherit', cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
      )}

      {/* File previews */}
      {files.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {files.map((f, i) => (
            <div key={i} style={{ position: 'relative', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              📎 {f.name}
              <button onClick={() => removeFile(i)} style={{ color: 'var(--color-danger)' }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}

      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--bg-input)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)', padding: '8px 12px',
      }}>
        <input type="file" ref={fileInput} onChange={addFiles} style={{ display: 'none' }} multiple />
        <button
          className="btn btn-icon btn-ghost"
          style={{ flexShrink: 0, marginBottom: 2 }}
          onClick={() => fileInput.current?.click()}
          title="Attach file"
        >
          <Paperclip size={18} />
        </button>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          rows={1}
          style={{
            flex: 1, resize: 'none', background: 'none', border: 'none',
            outline: 'none', maxHeight: 200, overflowY: 'auto',
            lineHeight: 1.5, padding: 0, color: 'var(--color-text)',
          }}
        />
        <button
          className="btn btn-icon btn-primary"
          style={{ flexShrink: 0, marginBottom: 2, opacity: (content.trim() || files.length) && !uploading ? 1 : 0.5 }}
          onClick={submit}
          disabled={!content.trim() && !files.length || uploading}
          title="Send"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
