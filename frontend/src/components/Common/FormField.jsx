/**
 * FormField — labeled wrapper for inputs, selects, and textareas.
 *
 * @param {string}   label
 * @param {string}   hint     Small secondary text appended to the label
 * @param {string}   error    Red error message below the input
 * @param {string}   helper   Gray helper text below the input (ignored if error is set)
 * @param {boolean}  required Appends a red * to the label
 * @param {ReactNode} children The input element(s)
 */
export default function FormField({ label, hint, error, helper, required = false, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{
        fontSize: 12, fontWeight: 700,
        color: error ? 'var(--color-danger, #ef4444)' : 'var(--color-text-faint)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
        display: 'flex', alignItems: 'baseline', gap: 4,
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-danger, #ef4444)' }}>*</span>}
        {hint && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11, color: 'var(--color-text-faint)' }}>— {hint}</span>}
      </label>

      {children}

      {(error || helper) && (
        <div style={{ fontSize: 12, color: error ? 'var(--color-danger, #ef4444)' : 'var(--color-text-faint)' }}>
          {error || helper}
        </div>
      )}
    </div>
  );
}
