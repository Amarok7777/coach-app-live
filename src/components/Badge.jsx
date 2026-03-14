const VARIANTS = {
  primary:   'bg-md-primary-container text-md-primary',
  secondary: 'bg-md-secondary-container text-md-on-primary-container',
  success:   'bg-green-100 text-green-800',
  warning:   'bg-amber-100 text-amber-800',
  error:     'bg-red-100 text-red-800',
  orange:    'bg-orange-100 text-orange-800',
  neutral:   'bg-gray-100 text-gray-600',
}

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${VARIANTS[variant] ?? VARIANTS.neutral} ${className}`}>
      {children}
    </span>
  )
}
