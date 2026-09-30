import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, checking } = useAuth()
  const location = useLocation()

  // Wait for the stored-token check before deciding anything, otherwise a
  // valid session gets bounced to /login on a hard refresh.
  if (checking) {
    return <div className="p-6 text-sm text-ink-400">Checking your session...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'student' ? '/portal' : '/admin'} replace />
  }

  return <Outlet />
}
