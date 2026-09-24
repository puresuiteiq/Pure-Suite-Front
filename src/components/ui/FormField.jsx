import Icon from './Icon'

/**
 * Label + control + error message for one form field.
 *
 * Was three byte-identical local `Field` helpers (MerchantEditModal,
 * MerchantFormModal, ItemFormModal). Style the control itself with the
 * `form-input` class (index.css) via the `controlClass` helper.
 *
 * `icon` renders an <Icon /> name inside the control, the way the login screen
 * marks its fields — it makes a form scannable before a word is read. The
 * wrapper's `form-field-has-icon` class is what reserves the padding for it, so
 * callers don't pass anything extra to the input.
 */
export default function FormField({
  label,
  error,
  required,
  hint,
  icon,
  iconPlacement = 'center',
  children,
}) {
  return (
    <label className="block">
      <span className="form-label">
        {label}
        {required && (
          <span className="ms-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </span>

      <div className={`relative${icon ? ' form-field-has-icon' : ''}`}>
        {icon && (
          <Icon
            name={icon}
            className={`pointer-events-none absolute start-4 h-4 w-4 -translate-y-1/2 text-slate-400 ${
              iconPlacement === 'first-control' ? 'top-7' : 'top-1/2'
            }`}
          />
        )}
        {children}
      </div>

      {hint && !error && (
        <span className="mt-1.5 block text-xs text-slate-500">{hint}</span>
      )}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs text-red-600">
          {error}
        </span>
      )}
    </label>
  )
}
