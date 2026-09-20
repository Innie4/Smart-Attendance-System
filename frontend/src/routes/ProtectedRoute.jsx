import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = user.role === 'admin' ? '/admin' : '/lecturer'
    return <Navigate to={fallback} replace />
  }

  return <Outlet />
}
