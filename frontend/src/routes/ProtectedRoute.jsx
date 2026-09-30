import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { canAccess, homeRouteFor } from '../lib/roles.js'

// Guards against a misconfigured guard bouncing between two routes forever
// and leaving the user staring at a blank page.
const MAX_REDIRECTS = 5

export default function ProtectedRoute({ allowedRoles }) {
  const { user, checking } = useAuth()
  const location = useLocation()
  const redirects = useRef(0)
  const lastPath = useRef(location.pathname)

  useEffect(() => {
    if (lastPath.current === location.pathname) return
    lastPath.current = location.pathname
    redirects.current = 0
  }, [location.pathname])

  // Wait for the stored-token check before deciding anything, otherwise a
  // valid session gets bounced to /login on a hard refresh.
  if (checking) {
    return <div className="p-6 text-sm text-ink-400">Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // A role that cannot use this area is sent to its own home screen, never
  // back to the page it just refused (that would loop).
  if (!canAccess(user.role, allowedRoles)) {
    if (redirects.current >= MAX_REDIRECTS) {
      return (
        <div className="space-y-2 p-6">
          <p className="text-sm text-ink-700">This area is not available for your account.</p>
          <p className="text-xs text-ink-400">
            You are signed in as {user.full_name} ({user.role}).
          </p>
        </div>
      )
    }
    redirects.current += 1
    return <Navigate to={homeRouteFor(user.role)} replace />
  }

  return <Outlet />
}
