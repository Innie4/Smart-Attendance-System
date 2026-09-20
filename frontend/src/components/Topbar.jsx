import { useEffect, useState } from 'react'
import { LogOut, WifiOff, Wifi } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { getQueuedCount, flushQueue } from '../lib/offlineQueue.js'

export default function Topbar() {
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
    <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white px-6">
      <div className="flex items-center gap-2 text-xs font-medium">
        {isOnline ? (
          <span className="flex items-center gap-1.5 text-signal-present">
            <Wifi size={14} /> Online
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-signal-warning">
            <WifiOff size={14} /> Offline
          </span>
        )}
        {queuedCount > 0 && (
          <span className="rounded-full bg-signal-warning/10 px-2 py-0.5 text-signal-warning">
            {queuedCount} pending sync
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium text-ink-900">{user?.full_name}</p>
          <p className="text-xs capitalize text-ink-400">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700"
          title="Sign out"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  )
}
