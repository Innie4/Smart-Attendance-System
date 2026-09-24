import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout.jsx'

import AdminDashboard from './pages/admin/Dashboard.jsx'
import Departments from './pages/admin/Departments.jsx'
import Courses from './pages/admin/Courses.jsx'
import Lecturers from './pages/admin/Lecturers.jsx'
import Students from './pages/admin/Students.jsx'
import Enrolments from './pages/admin/Enrolments.jsx'
import LecturerDashboard from './pages/lecturer/Dashboard.jsx'

// Camera/ML and charting pages pull in face-api.js and recharts, both sizable
// dependencies, so they are split into their own chunks and only fetched
// when one of these tools is opened.
const FacialEnrolment = lazy(() => import('./pages/lecturer/FacialEnrolment.jsx'))
const LiveAttendance = lazy(() => import('./pages/lecturer/LiveAttendance.jsx'))
const Reports = lazy(() => import('./pages/lecturer/Reports.jsx'))

function PageFallback() {
  return <div className="p-6 text-sm text-ink-400">Loading...</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin" replace />} />

      <Route element={<Layout />}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/departments" element={<Departments />} />
        <Route path="/admin/courses" element={<Courses />} />
        <Route path="/admin/lecturers" element={<Lecturers />} />
        <Route path="/admin/students" element={<Students />} />
        <Route path="/admin/enrolments" element={<Enrolments />} />

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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
