import { X } from 'lucide-react'

export default function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 px-4">
      <div className="w-full max-w-lg rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-ink-900">{title}</h2>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-4">{footer}</div>}
      </div>
    </div>
  )
}
