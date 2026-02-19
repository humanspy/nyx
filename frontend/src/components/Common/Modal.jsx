import { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Modal — overlay modal with optional header.
 *
 * @param {string}    title        Header title (omit for no header)
 * @param {func}      onClose      Called on backdrop click or close button press
 * @param {ReactNode} children
 * @param {string}    maxWidth     CSS max-width of the modal box (default '480px')
 * @param {boolean}   closeButton  Show the × button in the header (default true)
 * @param {ReactNode} footer       Optional footer slot rendered below children
 */
export default function Modal({ title, onClose, children, maxWidth = '480px', closeButton = true, footer }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: '100%', maxWidth,
          background: 'var(--bg-primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {(title || closeButton) && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '20px 24px 0',
          }}>
            {title && <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>}
            {closeButton && (
              <button
                onClick={onClose}
                style={{
                  marginLeft: 'auto', width: 32, height: 32, borderRadius: 'var(--radius-full)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--bg-hover)', color: 'var(--color-text-muted)',
                }}
              >
                <X size={15} />
              </button>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {children}
        </div>

        {footer && (
          <div style={{ padding: '0 24px 20px', borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
