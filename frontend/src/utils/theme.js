const THEMES = {
  dark: {
    '--bg-primary': '#1a1a2e',
    '--bg-secondary': '#16213e',
    '--bg-tertiary': '#0f3460',
    '--bg-input': '#1e1e3a',
    '--bg-hover': '#252545',
    '--bg-active': '#2d2d5e',
    '--color-text': '#e2e8f0',
    '--color-text-muted': '#94a3b8',
    '--color-text-faint': '#64748b',
    '--color-accent': '#7c3aed',
    '--color-accent-hover': '#6d28d9',
    '--color-danger': '#ef4444',
    '--color-success': '#22c55e',
    '--color-warning': '#f59e0b',
    '--color-muted': '#334155',
    '--border-color': '#2d2d5e',
    '--scrollbar-thumb': '#334155',
    '--shadow': '0 4px 24px rgba(0,0,0,0.4)',
  },
  darker: {
    '--bg-primary': '#0d0d1a',
    '--bg-secondary': '#111122',
    '--bg-tertiary': '#1a1a33',
    '--bg-input': '#141428',
    '--bg-hover': '#1e1e3a',
    '--bg-active': '#252545',
    '--color-text': '#e2e8f0',
    '--color-text-muted': '#94a3b8',
    '--color-text-faint': '#64748b',
    '--color-accent': '#7c3aed',
    '--color-accent-hover': '#6d28d9',
    '--color-danger': '#ef4444',
    '--color-success': '#22c55e',
    '--color-warning': '#f59e0b',
    '--color-muted': '#1e1e3a',
    '--border-color': '#1e1e3a',
    '--scrollbar-thumb': '#1e1e3a',
    '--shadow': '0 4px 24px rgba(0,0,0,0.6)',
  },
  midnight: {
    '--bg-primary': '#0a0a0f',
    '--bg-secondary': '#0f0f1a',
    '--bg-tertiary': '#141420',
    '--bg-input': '#0f0f1a',
    '--bg-hover': '#1a1a2e',
    '--bg-active': '#1e1e38',
    '--color-text': '#c9d1d9',
    '--color-text-muted': '#8b949e',
    '--color-text-faint': '#6e7681',
    '--color-accent': '#58a6ff',
    '--color-accent-hover': '#388bfd',
    '--color-danger': '#f85149',
    '--color-success': '#3fb950',
    '--color-warning': '#d29922',
    '--color-muted': '#21262d',
    '--border-color': '#21262d',
    '--scrollbar-thumb': '#30363d',
    '--shadow': '0 4px 24px rgba(0,0,0,0.8)',
  },
};

export function useTheme() {
  function applyTheme(themeName) {
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');
    const name = themeName || settings.theme || 'dark';
    const theme = THEMES[name] || THEMES.dark;
    const root = document.documentElement;
    for (const [k, v] of Object.entries(theme)) {
      root.style.setProperty(k, v);
    }
    root.setAttribute('data-theme', name);
  }

  return { applyTheme, themes: Object.keys(THEMES) };
}
