/**
 * On/off switch with its label — the same control the merchant profile uses
 * for Open/Closed and Reviews, as a component. `onChange(checked)` gets the
 * new boolean.
 */
export default function Switch({ checked, onChange, disabled = false, label, className = '' }) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-700 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 dark:text-slate-200 ${className}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="relative h-7 w-12 shrink-0 rounded-full bg-slate-300 shadow-inner transition-all duration-300 after:absolute after:start-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow-md after:transition-transform after:duration-300 peer-checked:bg-emerald-500 peer-checked:shadow-[0_0_22px_rgba(16,185,129,.45)] peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-400 rtl:peer-checked:after:-translate-x-5 dark:bg-slate-800"
      />
      {label}
    </label>
  )
}
