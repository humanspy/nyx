import { getInitials } from '../../utils/helpers.js';

const STATUS_COLORS = {
  online: 'var(--color-success, #22c55e)',
  idle: '#f59e0b',
  dnd: 'var(--color-danger, #ef4444)',
  offline: 'var(--color-muted, #52555a)',
};

/**
 * Avatar — user avatar with optional status indicator dot.
 *
 * @param {string}  src        Image URL (optional; falls back to initials)
 * @param {string}  name       Display name (used for initials + alt text)
 * @param {number}  size       Pixel size (default 32)
 * @param {string}  status     'online' | 'idle' | 'dnd' | 'offline' | null
 * @param {boolean} showStatus Whether to render the status dot (default false)
 * @param {object}  style      Extra inline styles on the wrapper
 * @param {func}    onClick
 */
export default function Avatar({ src, name = '', size = 32, status, showStatus = false, style, onClick }) {
  const fontSize = Math.round(size * 0.4);
  const dotSize = Math.round(size * 0.34);

  return (
    <div
      onClick={onClick}
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={name}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          className="avatar"
          style={{ width: size, height: size, fontSize, userSelect: 'none' }}
          aria-label={name}
        >
          {getInitials(name)}
        </div>
      )}

      {showStatus && status && (
        <div
          style={{
            position: 'absolute',
            bottom: -1,
            right: -1,
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: STATUS_COLORS[status] || STATUS_COLORS.offline,
            border: '2px solid var(--bg-secondary)',
            boxSizing: 'border-box',
          }}
          title={status}
        />
      )}
    </div>
  );
}
