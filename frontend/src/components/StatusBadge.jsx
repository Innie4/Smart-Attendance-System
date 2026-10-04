const VARIANTS = {
  present: 'border-signal-present/25 bg-signal-present/10 text-signal-present',
  absent: 'border-signal-absent/25 bg-signal-absent/10 text-signal-absent',
  warning: 'border-signal-warning/25 bg-signal-warning/10 text-signal-warning',
  pending: 'border-ink-300/70 bg-ink-100/70 text-ink-500',
}

export default function StatusBadge({ variant = 'pending', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        VARIANTS[variant] || VARIANTS.pending
      }`}
    >
      {children}
    </span>
  )
}