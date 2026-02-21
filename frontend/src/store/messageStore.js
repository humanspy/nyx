import { create } from 'zustand';
import { messagesApi } from '../utils/api.js';
import { getChannelKey } from '../crypto/keyManager.js';
import { encryptMessage, decryptMessage } from '../crypto/messageEncryption.js';
import { createDeletionProof } from '../crypto/groupKeys.js';

export const useMessageStore = create((set, get) => ({
  messages: {},       // { [channelId]: Message[] }
  hasMore: {},        // { [channelId]: boolean }
  typing: {},         // { [channelId]: { [userId]: { username, ts } } }
  presence: {},       // { [userId]: { status, activity } }
  dmChannels: [],

  async fetchMessages(channelId, before = null) {
    const raw = await messagesApi.get(channelId, before);
    const channelKey = await getChannelKey(channelId);

    const decrypted = await Promise.all(raw.map(async m => {
      if (m.deleted) return { ...m, content: '[deleted]' };
      if (!channelKey || !m.encrypted_payload) return { ...m, content: m.encrypted_payload || '' };
      const content = await decryptMessage(channelKey, m.encrypted_payload);
      return { ...m, content: content ?? '[unable to decrypt]' };
    }));

    set(s => {
      const existing = before ? (s.messages[channelId] || []) : [];
      const merged = [...decrypted.reverse(), ...existing];
      return {
        messages: { ...s.messages, [channelId]: merged },
        hasMore: { ...s.hasMore, [channelId]: raw.length === 50 },
      };
    });
  },

  async sendMessage(channelId, content, attachments = []) {
    const channelKey = await getChannelKey(channelId);
    let payload;
    if (channelKey) {
      payload = await encryptMessage(channelKey, content);
    } else {
      payload = { encrypted_payload: content, iv: '' };
    }
    return messagesApi.send(channelId, { ...payload, attachments });
  },

  async editMessage(channelId, messageId, newContent) {
    const channelKey = await getChannelKey(channelId);
    let payload;
    if (channelKey) {
      payload = await encryptMessage(channelKey, newContent);
    } else {
      payload = { encrypted_payload: newContent, iv: '' };
    }
    return messagesApi.edit(channelId, messageId, payload);
  },

  async deleteMessage(channelId, messageId) {
    const proof = await createDeletionProof(messageId, channelId);
    return messagesApi.delete(channelId, messageId, proof);
  },

  // Called when WebSocket delivers a new message event
  async receiveMessage(channelId, message) {
    const channelKey = await getChannelKey(channelId);
    let content = message.encrypted_payload || '';
    if (channelKey && message.encrypted_payload) {
      content = (await decryptMessage(channelKey, message.encrypted_payload)) ?? '[unable to decrypt]';
    }
    const msg = { ...message, content };
    set(s => ({
      messages: {
        ...s.messages,
        [channelId]: [...(s.messages[channelId] || []), msg],
      },
    }));
  },

  receiveEdit(channelId, messageId, updates) {
    set(s => {
      const list = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: list.map(m => m.id === messageId ? { ...m, ...updates } : m),
        },
      };
    });
  },

  receiveDelete(channelId, messageId) {
    set(s => {
      const list = s.messages[channelId] || [];
      return {
        messages: {
          ...s.messages,
          [channelId]: list.map(m => m.id === messageId ? { ...m, content: '[deleted]', deleted: true } : m),
        },
      };
    });
  },

  setTyping(channelId, userId, username) {
    set(s => {
      const ch = { ...(s.typing[channelId] || {}) };
      ch[userId] = { username, ts: Date.now() };
      return { typing: { ...s.typing, [channelId]: ch } };
    });
  },

  clearTyping(channelId, userId) {
    set(s => {
      const ch = { ...(s.typing[channelId] || {}) };
      delete ch[userId];
      return { typing: { ...s.typing, [channelId]: ch } };
    });
  },

  setPresence(userId, data) {
    set(s => ({ presence: { ...s.presence, [userId]: data } }));
  },

  getMessages(channelId) { return get().messages[channelId] || []; },
  getTyping(channelId) { return Object.values(get().typing[channelId] || {}); },
}));
