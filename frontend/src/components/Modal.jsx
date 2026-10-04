import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/30 p-0 backdrop-blur-md sm:items-center sm:p-6">
      {/*
        Stops a click inside the panel from closing it, while clicks on the
        dimmed backdrop still dismiss the dialog.
      */}
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="page-enter card relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-b-none rounded-t-4xl shadow-lift sm:rounded-4xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ink-100/70 px-7 py-5">
          <h2 className="font-display text-xl font-medium tracking-tight text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-ink-400 transition-colors duration-300 hover:bg-ink-50 hover:text-ink-700"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-7 py-6">{children}</div>
        {footer && (
          <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-ink-100/70 px-7 py-5 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}