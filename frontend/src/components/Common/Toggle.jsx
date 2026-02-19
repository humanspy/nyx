/**
 * Toggle — accessible on/off switch.
 *
 * @param {boolean}  checked
 * @param {func}     onChange   (newValue: boolean) => void
 * @param {boolean}  disabled
 * @param {string}   label      Inline label to the left of the toggle (optional)
 * @param {string}   description Secondary text below the label (optional)
 * @param {'sm'|'md'} size
 */
export default function Toggle({ checked, onChange, disabled = false, label, description, size = 'md' }) {
  const w = size === 'sm' ? 28 : 36;
  const h = size === 'sm' ? 16 : 20;
  const knobSize = h - 4;
  const knobOn = w - knobSize - 2;

  const toggle = () => { if (!disabled) onChange(!checked); };

  if (label || description) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, opacity: disabled ? 0.5 : 1 }}
        onClick={toggle}
      >
        <div>
          {label && <div style={{ fontSize: 14, color: 'var(--color-text)' }}>{label}</div>}
          {description && <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{description}</div>}
        </div>
        <ToggleKnob checked={checked} w={w} h={h} knobSize={knobSize} knobOn={knobOn} />
      </div>
    );
  }

  return (
    <ToggleKnob
      checked={checked}
      w={w} h={h} knobSize={knobSize} knobOn={knobOn}
      onClick={toggle}
      disabled={disabled}
    />
  );
}

function ToggleKnob({ checked, w, h, knobSize, knobOn, onClick, disabled }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      onClick={onClick}
      style={{
        width: w, height: h, borderRadius: h / 2, padding: 2,
        background: checked ? 'var(--color-accent)' : 'var(--color-muted, #3f4147)',
        position: 'relative', flexShrink: 0,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: knobSize, height: knobSize, borderRadius: '50%',
        background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        position: 'absolute', top: 2,
        left: checked ? knobOn : 2,
        transition: 'left 0.18s',
      }} />
    </div>
  );
}
