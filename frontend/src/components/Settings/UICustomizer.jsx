import { useState } from 'react';
import { Check } from 'lucide-react';

const THEMES = [
  { id: 'dark', label: 'Dark', preview: '#080810' },
  { id: 'light', label: 'Light', preview: '#f8fafc' },
  { id: 'midnight', label: 'Midnight', preview: '#0a0a1a' },
  { id: 'slate', label: 'Slate', preview: '#1a1f2e' },
];

const ACCENT_COLORS = [
  { id: '#6366f1', label: 'Indigo' },
  { id: '#8b5cf6', label: 'Violet' },
  { id: '#06b6d4', label: 'Cyan' },
  { id: '#10b981', label: 'Emerald' },
  { id: '#f59e0b', label: 'Amber' },
  { id: '#ef4444', label: 'Red' },
  { id: '#ec4899', label: 'Pink' },
  { id: '#f97316', label: 'Orange' },
];

const FONT_SIZES = [
  { id: 'sm', label: 'Small', css: '13px' },
  { id: 'md', label: 'Medium', css: '15px' },
  { id: 'lg', label: 'Large', css: '17px' },
];

const MESSAGE_DENSITY = [
  { id: 'cozy', label: 'Cozy' },
  { id: 'compact', label: 'Compact' },
];

export default function UICustomizer({ settings, updateSettings }) {
  const [saved, setSaved] = useState(false);

  const current = {
    theme: settings?.theme || 'dark',
    accent: settings?.accent_color || '#6366f1',
    fontSize: settings?.font_size || 'md',
    density: settings?.message_density || 'cozy',
  };

  async function set(key, value) {
    await updateSettings({ [key]: value });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {saved && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(16,185,129,0.12)', color: '#10b981', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
          <Check size={14} /> Applied
        </div>
      )}

      <Section title="Theme">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {THEMES.map(t => (
            <button key={t.id} onClick={() => set('theme', t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `2px solid ${current.theme === t.id ? 'var(--color-accent)' : 'var(--border-color)'}`, background: 'var(--bg-secondary)', cursor: 'pointer', transition: 'border-color 0.15s', minWidth: 80 }}>
              <div style={{ width: 40, height: 26, borderRadius: 6, background: t.preview, border: '1px solid rgba(255,255,255,0.1)' }} />
              <span style={{ fontSize: 12, color: current.theme === t.id ? 'var(--color-accent)' : 'var(--color-text-muted)', fontWeight: current.theme === t.id ? 600 : 400 }}>{t.label}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Accent Color">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ACCENT_COLORS.map(c => (
            <button key={c.id} onClick={() => set('accent_color', c.id)} title={c.label} style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: c.id, border: `3px solid ${current.accent === c.id ? '#fff' : 'transparent'}`, boxShadow: current.accent === c.id ? `0 0 0 2px ${c.id}` : 'none', cursor: 'pointer', transition: 'all 0.15s' }} />
          ))}
        </div>
      </Section>

      <Section title="Font Size">
        <div style={{ display: 'flex', gap: 8 }}>
          {FONT_SIZES.map(f => (
            <button key={f.id} onClick={() => set('font_size', f.id)} style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', background: current.fontSize === f.id ? 'var(--color-accent)' : 'var(--bg-secondary)', color: current.fontSize === f.id ? '#fff' : 'var(--color-text-muted)', fontWeight: current.fontSize === f.id ? 600 : 400, fontSize: f.css, border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {f.label}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Message Density">
        <div style={{ display: 'flex', gap: 8 }}>
          {MESSAGE_DENSITY.map(d => (
            <button key={d.id} onClick={() => set('message_density', d.id)} style={{ padding: '7px 18px', borderRadius: 'var(--radius-md)', background: current.density === d.id ? 'var(--color-accent)' : 'var(--bg-secondary)', color: current.density === d.id ? '#fff' : 'var(--color-text-muted)', fontWeight: current.density === d.id ? 600 : 400, border: '1px solid var(--border-color)', cursor: 'pointer', transition: 'all 0.15s' }}>
              {d.label}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--color-text-faint)', marginTop: 4 }}>
          Compact reduces spacing between messages for more content on screen.
        </p>
      </Section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}
