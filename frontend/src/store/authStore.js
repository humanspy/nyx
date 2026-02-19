import { create } from 'zustand';
import { authApi, usersApi } from '../utils/api.js';
import { clearKeyCache, cacheKeys, loadKeys, saveKeys, generateKeyPair, hasKeys } from '../crypto/keyManager.js';
import { useTheme } from '../utils/theme.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  refreshToken: localStorage.getItem('refreshToken'),
  settings: {},
  promptEmailVerification: false,

  async restoreSession() {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const user = await authApi.me();
      const settings = await usersApi.getSettings();
      set({ user, token, settings });
      localStorage.setItem('userSettings', JSON.stringify(settings));
      const { applyTheme } = useTheme();
      applyTheme(settings.theme);
    } catch {
      get().logout();
    }
  },

  async login(username, password) {
    const res = await authApi.login({ username, password });
    const { token, refreshToken, user, promptEmailVerification } = res;
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    const settings = await usersApi.getSettings();
    localStorage.setItem('userSettings', JSON.stringify(settings));
    set({ user, token, refreshToken, settings, promptEmailVerification: !!promptEmailVerification });

    // Try to load E2E keys from IndexedDB
    if (await hasKeys(user.id)) {
      try {
        const keys = await loadKeys(user.id, password);
        if (keys) cacheKeys(keys);
      } catch { /* wrong password or missing keys */ }
    }

    const { applyTheme } = useTheme();
    applyTheme(settings.theme);
  },

  async register(username, email, password, tosAccepted = false) {
    const { token, refreshToken, user } = await authApi.register({ username, email, password, tosAccepted });
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    set({ user, token, refreshToken, settings: {} });

    // Generate E2E keypairs and register with server
    const keys = await generateKeyPair();
    await saveKeys(user.id, keys, password);
    cacheKeys(keys);
    await authApi.registerKeys({ enc_public_key: keys.encPublicKey, sign_public_key: keys.signPublicKey });
  },

  dismissEmailPrompt() {
    set({ promptEmailVerification: false });
  },

  async updateSettings(updates) {
    const settings = await usersApi.updateSettings(updates);
    localStorage.setItem('userSettings', JSON.stringify(settings));
    set({ settings });
    if (updates.theme) {
      const { applyTheme } = useTheme();
      applyTheme(updates.theme);
    }
    return settings;
  },

  logout() {
    authApi.logout().catch(() => {});
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userSettings');
    clearKeyCache();
    set({ user: null, token: null, refreshToken: null, settings: {} });
  },
}));
