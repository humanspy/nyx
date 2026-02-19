import { create } from 'zustand';
import { serversApi, channelsApi } from '../utils/api.js';

export const useServerStore = create((set, get) => ({
  servers: [],
  activeServerId: null,
  activeChannelId: null,
  channels: {}, // { [serverId]: Channel[] }
  members: {},  // { [serverId]: Member[] }
  roles: {},    // { [serverId]: Role[] }
  categories: {}, // { [serverId]: Category[] }

  async fetchServers() {
    const servers = await serversApi.getAll();
    set({ servers });
    return servers;
  },

  async fetchChannels(serverId) {
    const channels = await channelsApi.getAll(serverId);
    set(s => ({ channels: { ...s.channels, [serverId]: channels } }));
    return channels;
  },

  async fetchMembers(serverId) {
    const members = await serversApi.getMembers(serverId);
    set(s => ({ members: { ...s.members, [serverId]: members } }));
    return members;
  },

  async fetchRoles(serverId) {
    const roles = await serversApi.getRoles(serverId);
    set(s => ({ roles: { ...s.roles, [serverId]: roles } }));
    return roles;
  },

  async fetchCategories(serverId) {
    const categories = await serversApi.getCategories(serverId);
    set(s => ({ categories: { ...s.categories, [serverId]: categories } }));
    return categories;
  },

  setActiveServer(serverId) {
    set({ activeServerId: serverId, activeChannelId: null });
    if (serverId) {
      get().fetchChannels(serverId);
      get().fetchMembers(serverId);
      get().fetchRoles(serverId);
      get().fetchCategories(serverId);
    }
  },

  setActiveChannel(channelId) {
    set({ activeChannelId: channelId });
  },

  // Real-time updates from WebSocket
  upsertChannel(serverId, channel) {
    set(s => {
      const list = s.channels[serverId] || [];
      const idx = list.findIndex(c => c.id === channel.id);
      if (idx >= 0) {
        const updated = [...list];
        updated[idx] = channel;
        return { channels: { ...s.channels, [serverId]: updated } };
      }
      return { channels: { ...s.channels, [serverId]: [...list, channel] } };
    });
  },

  removeChannel(serverId, channelId) {
    set(s => ({
      channels: { ...s.channels, [serverId]: (s.channels[serverId] || []).filter(c => c.id !== channelId) },
    }));
  },

  upsertMember(serverId, member) {
    set(s => {
      const list = s.members[serverId] || [];
      const idx = list.findIndex(m => m.user_id === member.user_id);
      if (idx >= 0) {
        const updated = [...list]; updated[idx] = member;
        return { members: { ...s.members, [serverId]: updated } };
      }
      return { members: { ...s.members, [serverId]: [...list, member] } };
    });
  },

  removeMember(serverId, userId) {
    set(s => ({
      members: { ...s.members, [serverId]: (s.members[serverId] || []).filter(m => m.user_id !== userId) },
    }));
  },

  upsertServer(server) {
    set(s => {
      const idx = s.servers.findIndex(sv => sv.id === server.id);
      if (idx >= 0) { const updated = [...s.servers]; updated[idx] = server; return { servers: updated }; }
      return { servers: [...s.servers, server] };
    });
  },

  removeServer(serverId) {
    set(s => ({ servers: s.servers.filter(sv => sv.id !== serverId) }));
  },

  getChannelsForServer(serverId) {
    return get().channels[serverId] || [];
  },

  getActiveServer() {
    return get().servers.find(s => s.id === get().activeServerId) || null;
  },

  getActiveChannel() {
    const { activeServerId, activeChannelId } = get();
    if (!activeServerId || !activeChannelId) return null;
    const channels = get().channels[activeServerId] || [];
    return channels.find(c => c.id === activeChannelId) || null;
  },

  // Returns the voice-text channel paired with a given voice channel id
  getPairedVoiceTextChannel(serverId, voiceChannelId) {
    const channels = get().channels[serverId] || [];
    return channels.find(c => c.paired_voice_channel_id === voiceChannelId) || null;
  },
}));
