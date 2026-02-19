/**
 * EmptyState — placeholder shown when a list or section has no content.
 *
 * @param {ReactNode} icon        Icon element (e.g. <Inbox size={32} />)
 * @param {string}    title       Short heading
 * @param {string}    description Supporting text
 * @param {object}    action      { label: string, onClick: () => void } — optional CTA button
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '48px 24px', gap: 10,
      color: 'var(--color-text-muted)',
    }}>
      {icon && (
        <div style={{ opacity: 0.35, marginBottom: 6, color: 'var(--color-text-faint)' }}>
          {icon}
        </div>
      )}
      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
      {description && <div style={{ fontSize: 13, maxWidth: 280, lineHeight: 1.5 }}>{description}</div>}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: 8, padding: '8px 20px', borderRadius: 'var(--radius-md)',
            background: 'var(--color-accent)', color: '#fff',
            fontWeight: 600, fontSize: 14,
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
