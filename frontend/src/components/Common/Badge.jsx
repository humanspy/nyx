const VARIANT_STYLES = {
  accent:  { background: 'var(--color-accent)',          color: '#fff' },
  success: { background: 'var(--color-success, #22c55e)', color: '#fff' },
  warning: { background: '#f59e0b',                      color: '#fff' },
  danger:  { background: 'var(--color-danger, #ef4444)', color: '#fff' },
  muted:   { background: 'var(--bg-hover)',               color: 'var(--color-text-muted)' },
  outline: { background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--border-color)' },
};

const SIZE_STYLES = {
  xs: { fontSize: 9,  padding: '1px 4px',  borderRadius: 3, letterSpacing: '0.04em' },
  sm: { fontSize: 10, padding: '1px 5px',  borderRadius: 4, letterSpacing: '0.04em' },
  md: { fontSize: 12, padding: '2px 8px',  borderRadius: 5, letterSpacing: '0.02em' },
  lg: { fontSize: 13, padding: '3px 10px', borderRadius: 6, letterSpacing: 0 },
};

/**
 * Badge — small inline label chip.
 *
 * @param {'accent'|'success'|'warning'|'danger'|'muted'|'outline'} variant
 * @param {'xs'|'sm'|'md'|'lg'} size
 * @param {ReactNode} children
 * @param {object}   style  Extra styles
 */
export default function Badge({ children, variant = 'accent', size = 'sm', style }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      fontWeight: 700,
      lineHeight: 1.5,
      whiteSpace: 'nowrap',
      flexShrink: 0,
      ...VARIANT_STYLES[variant],
      ...SIZE_STYLES[size],
      ...style,
    }}>
      {children}
    </span>
  );
}

/** Convenience export — server tag badge */
export function ServerTagBadge({ tag }) {
  if (!tag) return null;
  return <Badge variant="accent" size="xs">{tag}</Badge>;
}
