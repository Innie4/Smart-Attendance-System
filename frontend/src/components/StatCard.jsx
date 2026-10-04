import GlassCard from './GlassCard.jsx'

export default function StatCard({ label, value, hint, icon: Icon }) {
  return (
    <GlassCard hover className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Reserved for two lines so values sit on a common baseline across a
              row even when one label wraps and the next does not. */}
          <p className="min-h-[2.3em] text-[0.68rem] font-bold uppercase leading-snug tracking-[0.16em] text-ink-500">
            {label}
          </p>
          {/* Playfair defaults to oldstyle figures, which read ambiguously for data
              ("0/6" looks like "o/6"), so lining figures are forced here. */}
          <p className="mt-2 font-display text-4xl font-medium leading-none tabular-nums lining-nums text-ink-900">
            {value}
          </p>
          {hint && <p className="mt-2 text-xs leading-relaxed text-ink-400">{hint}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-2xl bg-accent-50/80 p-2.5 text-accent-600">
            <Icon size={18} />
          </div>
        )}
      </div>
    </GlassCard>
  )
}