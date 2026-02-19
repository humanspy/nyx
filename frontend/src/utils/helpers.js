export function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return `Yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (days < 7) return d.toLocaleDateString([], { weekday: 'long' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: days > 365 ? 'numeric' : undefined });
}

export function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function getRoleStyle(role) {
  if (!role) return {};
  if (role.color_gradient) {
    const { type, angle = 135, stops = [] } = role.color_gradient;
    const stopStr = stops.map(s => `${s.color} ${s.position * 100}%`).join(', ');
    const grad = type === 'radial'
      ? `radial-gradient(circle, ${stopStr})`
      : `linear-gradient(${angle}deg, ${stopStr})`;
    return { background: grad, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
  }
  if (role.color) return { color: role.color };
  return {};
}

export function getRoleBadgeStyle(role) {
  if (!role) return {};
  if (role.color_gradient) {
    const { type, angle = 135, stops = [] } = role.color_gradient;
    const stopStr = stops.map(s => `${s.color} ${s.position * 100}%`).join(', ');
    return { background: type === 'radial' ? `radial-gradient(circle, ${stopStr})` : `linear-gradient(${angle}deg, ${stopStr})` };
  }
  if (role.color) return { backgroundColor: role.color };
  return { backgroundColor: 'var(--color-muted)' };
}

export function groupMembersByRole(members, roles, ownerId) {
  const hoistedRoles = roles.filter(r => r.hoist).sort((a, b) => a.position - b.position);
  const groups = [];
  const assigned = new Set();

  for (const role of hoistedRoles) {
    const roleMembers = members.filter(m => m.role_ids?.includes(role.id) && !assigned.has(m.user_id));
    if (roleMembers.length === 0) continue;
    roleMembers.forEach(m => assigned.add(m.user_id));
    groups.push({ role, members: roleMembers });
  }

  const online = members.filter(m => !assigned.has(m.user_id) && m.status !== 'offline');
  const offline = members.filter(m => !assigned.has(m.user_id) && m.status === 'offline');

  if (online.length) groups.push({ role: null, label: `Online — ${online.length}`, members: online });
  if (offline.length) groups.push({ role: null, label: `Offline — ${offline.length}`, members: offline });

  return groups;
}

export function shouldShowCrown(members, roles, ownerId) {
  if (!ownerId || !members?.length || !roles?.length) return false;
  const owner = members.find(m => m.user_id === ownerId);
  if (!owner || !owner.role_ids?.length) return false;
  const ownerRoles = roles.filter(r => owner.role_ids.includes(r.id)).sort((a, b) => a.position - b.position);
  if (!ownerRoles.length) return false;
  const highestRole = ownerRoles[0];
  const shareCount = members.filter(m => m.user_id !== ownerId && m.role_ids?.includes(highestRole.id)).length;
  return shareCount >= 5;
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
}

export function generateId() {
  return crypto.randomUUID();
}
