import Icon from './Icon'

const VARIANTS = {
  primary:
    'btn-glow btn-glow-custom merchant-primary text-white focus-visible:ring-amber-400',
  secondary:
    'btn-glow btn-glow-neutral luxury-glass text-slate-700 hover:bg-white/80 focus-visible:ring-amber-400 dark:text-slate-100',
  danger:
    'btn-glow btn-glow-danger bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:ring-brand-500',
}

const SIZES = {
  sm: 'px-2.5 py-1.5 text-xs gap-1',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3.5 text-base gap-2.5',
}

/**
 * Shared button. `icon` is an <Icon /> name rendered before the label.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  type = 'button',
  children,
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-2xl font-semibold transition-all duration-300 ease-out hover:-translate-y-0.5 active:translate-y-0 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {icon && <Icon name={icon} className={size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />}
      {children}
    </button>
  )
}
