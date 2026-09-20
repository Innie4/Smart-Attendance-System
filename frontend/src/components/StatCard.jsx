export default function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-ink-900">{value}</p>
          {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-md bg-ink-50 p-2 text-ink-500">
            <Icon size={18} />
          </div>
        )}
      </div>
    </div>
  )
}
