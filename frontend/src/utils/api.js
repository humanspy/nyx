const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/$/, '') + '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...opts.headers };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: opts.signal,
  });

  if (res.status === 401) {
    const { useAuthStore } = await import('../store/authStore.js');
    useAuthStore.getState().logout();
    return;
  }

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json()
    : await res.text();

  if (!res.ok) throw Object.assign(new Error(data?.error || 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  get: (path, opts) => request('GET', path, null, opts),
  post: (path, body, opts) => request('POST', path, body, opts),
  patch: (path, body, opts) => request('PATCH', path, body, opts),
  put: (path, body, opts) => request('PUT', path, body, opts),
  delete: (path, opts) => request('DELETE', path, null, opts),
};

// Auth
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  registerKeys: (keys) => api.post('/auth/keys', keys),
  verifyEmail: (token) => api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`),
  resendVerification: () => api.post('/auth/resend-verification'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Users
export const usersApi = {
  getMe: () => api.get('/users/me'),
  updateMe: (data) => api.patch('/users/me', data),
  getSettings: () => api.get('/users/me/settings'),
  updateSettings: (data) => api.patch('/users/me/settings', data),
  getUser: (id) => api.get(`/users/${id}`),
  getUserKeys: (id) => api.get(`/users/${id}/keys`),
  getDMs: () => api.get('/users/me/dms'),
  scheduleAccountDeletion: () => api.delete('/users/me'),
  reactivateAccount: () => api.post('/users/me/reactivate'),
};

// Servers
export const serversApi = {
  getAll: () => api.get('/servers'),
  get: (id) => api.get(`/servers/${id}`),
  create: (data) => api.post('/servers', data),
  update: (id, data) => api.patch(`/servers/${id}`, data),
  delete: (id) => api.delete(`/servers/${id}`),
  join: (id) => api.post(`/servers/${id}/join`),
  joinByInvite: (code) => api.post(`/servers/join/${code}`),
  leave: (id) => api.post(`/servers/${id}/leave`),
  getMembers: (id) => api.get(`/servers/${id}/members`),
  getMember: (id, userId) => api.get(`/servers/${id}/members/${userId}`),
  updateMember: (id, userId, data) => api.patch(`/servers/${id}/members/${userId}`, data),
  kickMember: (id, userId) => api.delete(`/servers/${id}/members/${userId}`),
  getRoles: (id) => api.get(`/servers/${id}/roles`),
  createRole: (id, data) => api.post(`/servers/${id}/roles`, data),
  updateRole: (id, roleId, data) => api.patch(`/servers/${id}/roles/${roleId}`, data),
  deleteRole: (id, roleId) => api.delete(`/servers/${id}/roles/${roleId}`),
  assignRole: (id, userId, roleId) => api.post(`/servers/${id}/members/${userId}/roles/${roleId}`),
  removeRole: (id, userId, roleId) => api.delete(`/servers/${id}/members/${userId}/roles/${roleId}`),
  createInvite: (id) => api.post(`/servers/${id}/invites`),
  setShowTag: (id, show) => api.patch(`/servers/${id}/members/@me/show-tag`, { show }),
  getCategories: (id) => api.get(`/servers/${id}/categories`),
  createCategory: (id, data) => api.post(`/servers/${id}/categories`, data),
  updateCategory: (id, catId, data) => api.patch(`/servers/${id}/categories/${catId}`, data),
  deleteCategory: (id, catId) => api.delete(`/servers/${id}/categories/${catId}`),
};

// Channels
export const channelsApi = {
  getAll: (serverId) => api.get(`/channels?serverId=${serverId}`),
  get: (id) => api.get(`/channels/${id}`),
  create: (data) => api.post('/channels', data),
  update: (id, data) => api.patch(`/channels/${id}`, data),
  delete: (id) => api.delete(`/channels/${id}`),
  createDM: (data) => api.post('/channels/dm', data),
  getForumThreads: (id) => api.get(`/channels/${id}/threads`),
  createForumThread: (id, data) => api.post(`/channels/${id}/threads`, data),
  closeForumThread: (id, threadId) => api.patch(`/channels/${id}/threads/${threadId}`, { closed: true }),
  deleteForumThread: (id, threadId) => api.delete(`/channels/${id}/threads/${threadId}`),
};

// Messages
export const messagesApi = {
  get: (channelId, before) => api.get(`/messages/${channelId}${before ? `?before=${before}` : ''}`),
  send: (channelId, data) => api.post(`/messages/${channelId}`, data),
  edit: (channelId, msgId, data) => api.patch(`/messages/${channelId}/${msgId}`, data),
  delete: (channelId, msgId, proof) => api.delete(`/messages/${channelId}/${msgId}`, { headers: { 'x-deletion-proof': proof } }),
  getHistory: (channelId, msgId) => api.get(`/messages/${channelId}/${msgId}/history`),
};

// Media
export const mediaApi = {
  getUploadUrl: (data) => api.post('/media/upload-url', data),
  completeUpload: (data) => api.post('/media/complete', data),
  getDownloadUrl: (fileId) => api.get(`/media/download/${fileId}`),
  async uploadRingtone(file) {
    const { uploadUrl, fileId } = await api.post('/media/upload-url', {
      filename: file.name,
      contentType: file.type,
      size: file.size,
      purpose: 'ringtone',
    });
    await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
    const { url } = await api.post('/media/complete', { fileId });
    return { url, fileId };
  },
};

// Voice
export const voiceApi = {
  getParticipants: (channelId) => api.get(`/voice/${channelId}/participants`),
};

// Vanity
export const vanityApi = {
  resolve: (slug) => api.get(`/vanity/${slug}`),
  check: (slug) => api.post('/vanity/check', { slug }),
};

// Music
export const musicApi = {
  getPlatforms: () => api.get('/music/platforms'),
  getConfig: (serverId) => api.get(`/music/${serverId}/config`),
  updateConfig: (serverId, data) => api.patch(`/music/${serverId}/config`, data),
  getQueue: (channelId) => api.get(`/music/${channelId}/queue`),
  command: (channelId, command, payload, serverId) =>
    api.post(`/music/${channelId}/command`, { command, payload, serverId }),
};

// Moderation
export const modApi = {
  warn: (serverId, data) => api.post(`/moderation/${serverId}/warn`, data),
  timeout: (serverId, data) => api.post(`/moderation/${serverId}/timeout`, data),
  untimeout: (serverId, data) => api.post(`/moderation/${serverId}/untimeout`, data),
  kick: (serverId, data) => api.post(`/moderation/${serverId}/kick`, data),
  ban: (serverId, data) => api.post(`/moderation/${serverId}/ban`, data),
  hackban: (serverId, data) => api.post(`/moderation/${serverId}/hackban`, data),
  unban: (serverId, data) => api.post(`/moderation/${serverId}/unban`, data),
  getCases: (serverId, params) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/moderation/${serverId}/cases${q ? `?${q}` : ''}`);
  },
  getCase: (serverId, num) => api.get(`/moderation/${serverId}/cases/${num}`),
  deleteCase: (serverId, num) => api.delete(`/moderation/${serverId}/cases/${num}`),
  getAuditLog: (serverId, params) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/moderation/${serverId}/audit${q ? `?${q}` : ''}`);
  },
  getLeaderboard: (serverId) => api.get(`/moderation/${serverId}/xp/leaderboard`),
  setXP: (serverId, data) => api.post(`/moderation/${serverId}/xp/set`, data),
  getStaffConfig: (serverId) => api.get(`/moderation/${serverId}/staff-config`),
  updateStaffConfig: (serverId, data) => api.patch(`/moderation/${serverId}/staff-config`, data),
  getLevelConfig: (serverId) => api.get(`/moderation/${serverId}/level-config`),
  updateLevelConfig: (serverId, data) => api.patch(`/moderation/${serverId}/level-config`, data),
  getStaffWarns: (serverId, userId) => api.get(`/moderation/${serverId}/staff-warns/${userId}`),
  addStaffWarn: (serverId, data) => api.post(`/moderation/${serverId}/staff-warns`, data),
  removeStaffWarn: (serverId, warnId) => api.delete(`/moderation/${serverId}/staff-warns/${warnId}`),
  generateOverrideCode: (serverId) => api.post(`/moderation/${serverId}/override-code`),
};

// Reports & standing
export const reportsApi = {
  submit: (data) => api.post('/reports', data),
  getCategories: () => api.get('/reports/categories'),
  getStanding: () => api.get('/reports/standing'),
};

// Mutes
export const mutesApi = {
  getAll: () => api.get('/mutes'),
  add: (data) => api.post('/mutes', data),
  remove: (targetId, type) => api.delete(`/mutes/${targetId}?type=${type}`),
};

// AutoMod
export const automodApi = {
  get: (serverId) => api.get(`/automod/${serverId}`),
  update: (serverId, data) => api.put(`/automod/${serverId}`, data),
};
