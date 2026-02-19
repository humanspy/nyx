export default function TypingIndicator({ users }) {
  if (!users?.length) return null;
  const names = users.map(u => u.username).slice(0, 3).join(', ');
  const suffix = users.length > 3 ? ` and ${users.length - 3} more` : '';
  const verb = users.length === 1 ? 'is' : 'are';

  return (
    <div style={{ padding: '4px 16px 8px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-text-muted)' }}>
      <span className="typing-dots" style={{ display: 'inline-flex', gap: 3 }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 5, height: 5, borderRadius: '50%',
            background: 'var(--color-text-muted)',
            animation: `typing-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </span>
      <style>{`@keyframes typing-dot { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
      <span><strong>{names}{suffix}</strong> {verb} typing…</span>
    </div>
  );
}
