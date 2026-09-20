const VARIANTS = {
  present: 'bg-signal-present/10 text-signal-present',
  absent: 'bg-signal-absent/10 text-signal-absent',
  warning: 'bg-signal-warning/10 text-signal-warning',
  pending: 'bg-signal-pending/10 text-signal-pending',
}

export default function StatusBadge({ variant = 'pending', children }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${VARIANTS[variant]}`}
    >
      {children}
    </span>
  )
}
