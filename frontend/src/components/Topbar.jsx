import { useEffect, useState } from 'react'
import { LogOut, Menu, WifiOff, Wifi } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getQueuedCount, flushQueue } from '../lib/offlineQueue.js'

const ROLE_LABEL = {
  admin: 'Administrator',
  lecturer: 'Lecturer',
  student: 'Student',
}

export default function Topbar({ onMenuClick, navOpen = false }) {
  const { user, logout } = useAuth()
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queuedCount, setQueuedCount] = useState(0)

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine)
    window.addEventListener('online', updateStatus)
    window.addEventListener('offline', updateStatus)
    return () => {
      window.removeEventListener('online', updateStatus)
      window.removeEventListener('offline', updateStatus)
    }
  }, [])

  useEffect(() => {
    const refresh = () => getQueuedCount().then(setQueuedCount).catch(() => {})
    refresh()
    const interval = setInterval(refresh, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (isOnline && queuedCount > 0) {
      flushQueue()
        .then(() => getQueuedCount())
        .then(setQueuedCount)
        .catch(() => {})
    }
  }, [isOnline, queuedCount])

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2 text-xs font-medium">
        <button
          type="button"
          onClick={onMenuClick}
          className="-ml-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-600 hover:bg-ink-50 hover:text-ink-900 lg:hidden"
          aria-label="Open navigation"
          aria-controls="app-navigation"
          aria-expanded={navOpen}
        >
          <Menu size={20} />
        </button>
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-signal-present">
            <Wifi size={14} />
            <span className="hidden sm:inline">Online</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-signal-warning">
            <WifiOff size={14} />
            <span className="hidden sm:inline">Offline</span>
          </span>
        )}
        {queuedCount > 0 && (
          <span className="truncate rounded-full bg-signal-warning/10 px-2 py-0.5 text-signal-warning">
            {queuedCount} pending sync
          </span>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {user && (
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-ink-900">{user.full_name}</p>
            <p className="truncate text-xs capitalize text-ink-400">
              {ROLE_LABEL[user.role] || user.role}
            </p>
          </div>
        )}
        {user && (
          <button
            type="button"
            onClick={logout}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </header>
  )
}
