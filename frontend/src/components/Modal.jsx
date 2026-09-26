import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-950/50 p-0 sm:items-center sm:px-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-lg bg-white shadow-xl sm:rounded-lg">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-100 px-5 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
