import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import { homeRouteFor } from './lib/roles.js'

import Login from './pages/Login.jsx'
import AdminDashboard from './pages/admin/Dashboard.jsx'
import Departments from './pages/admin/Departments.jsx'
import Courses from './pages/admin/Courses.jsx'
import Lecturers from './pages/admin/Lecturers.jsx'
import Students from './pages/admin/Students.jsx'
import Enrolments from './pages/admin/Enrolments.jsx'
import LecturerDashboard from './pages/lecturer/Dashboard.jsx'
import StudentPortal from './pages/student/Portal.jsx'

// Camera/ML and charting pages pull in face-api.js and recharts, both sizable
// dependencies, so they are split into their own chunks and only fetched
// when a lecturer actually opens one of these tools.
const FacialEnrolment = lazy(() => import('./pages/lecturer/FacialEnrolment.jsx'))
const LiveAttendance = lazy(() => import('./pages/lecturer/LiveAttendance.jsx'))
const Reports = lazy(() => import('./pages/lecturer/Reports.jsx'))

function PageFallback() {
  return (
    <div className="flex items-center gap-3 py-10 text-sm font-medium text-ink-400">
      <span className="h-2 w-2 animate-breathe rounded-full bg-accent-400" />
      Loading
    </div>
  )
}

// Sends each role to the area it is allowed to use.
function RoleRedirect() {
  const { user, checking } = useAuth()
  if (checking) return <PageFallback />
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={homeRouteFor(user.role)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleRedirect />} />

      {/* Students: read-only access to their own attendance only. */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<Layout />}>
          <Route path="/portal" element={<StudentPortal />} />
        </Route>
      </Route>

      {/* Admin-only record management. */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/departments" element={<Departments />} />
          <Route path="/admin/courses" element={<Courses />} />
          <Route path="/admin/lecturers" element={<Lecturers />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/enrolments" element={<Enrolments />} />
        </Route>
      </Route>

      {/* Lecturer tools, also open to admins. */}
      <Route element={<ProtectedRoute allowedRoles={['lecturer', 'admin']} />}>
        <Route element={<Layout />}>
          <Route path="/lecturer" element={<LecturerDashboard />} />
          <Route
            path="/lecturer/enrolment"
            element={
              <Suspense fallback={<PageFallback />}>
                <FacialEnrolment />
              </Suspense>
            }
          />
          <Route
            path="/lecturer/attendance"
            element={
              <Suspense fallback={<PageFallback />}>
                <LiveAttendance />
              </Suspense>
            }
          />
          <Route
            path="/lecturer/reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <Reports />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
