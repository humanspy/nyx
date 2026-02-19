/**
 * Spinner — loading indicator.
 *
 * @param {'sm'|'md'|'lg'} size
 * @param {string}          color  CSS color (default: accent)
 * @param {string}          text   Optional label below the spinner
 * @param {boolean}         center Wrap in a centered flex container
 */
export default function Spinner({ size = 'md', color = 'var(--color-accent)', text, center = false }) {
  const px = size === 'sm' ? 16 : size === 'lg' ? 40 : 24;
  const border = size === 'sm' ? 2 : size === 'lg' ? 4 : 3;

  const spinner = (
    <div style={{
      width: px, height: px, borderRadius: '50%',
      border: `${border}px solid ${color}22`,
      borderTopColor: color,
      animation: 'spin 0.75s linear infinite',
    }} />
  );

  if (!center && !text) return spinner;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 10,
      ...(center ? { width: '100%', height: '100%', flex: 1, padding: 32 } : {}),
    }}>
      {spinner}
      {text && <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{text}</span>}
    </div>
  );
}
