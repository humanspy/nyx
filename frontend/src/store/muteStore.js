import { create } from 'zustand';
import { mutesApi } from '../utils/api.js';

export const useMuteStore = create((set, get) => ({
  // { [type_targetId]: true }
  mutes: {},

  async fetchMutes() {
    try {
      const rows = await mutesApi.getAll();
      const map = {};
      for (const row of rows) {
        map[`${row.mute_type}_${row.target_id}`] = true;
      }
      set({ mutes: map });
    } catch { /* ignore */ }
  },

  isMuted(type, targetId) {
    return !!get().mutes[`${type}_${targetId}`];
  },

  async mute(type, targetId) {
    await mutesApi.add({ muteType: type, targetId });
    set(s => ({ mutes: { ...s.mutes, [`${type}_${targetId}`]: true } }));
  },

  async unmute(type, targetId) {
    await mutesApi.remove(targetId, type);
    set(s => {
      const next = { ...s.mutes };
      delete next[`${type}_${targetId}`];
      return { mutes: next };
    });
  },

  toggle(type, targetId) {
    if (get().isMuted(type, targetId)) {
      return get().unmute(type, targetId);
    }
    return get().mute(type, targetId);
  },
}));
