import { useEffect, useState } from 'react'
import { WifiOff, Wifi } from 'lucide-react'
import { getQueuedCount, flushQueue } from '../lib/offlineQueue.js'

export default function Topbar() {
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
        <span className="text-sm font-medium text-ink-900">Smart Attendance</span>
      </div>
    </header>
  )
}
