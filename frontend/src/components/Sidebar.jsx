import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutGrid,
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  ClipboardList,
  ScanFace,
  Video,
  FileBarChart,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true, roles: ['admin'] },
  { to: '/admin/departments', label: 'Departments', icon: Building2, roles: ['admin'] },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen, roles: ['admin'] },
  { to: '/admin/lecturers', label: 'Lecturers', icon: GraduationCap, roles: ['admin'] },
  { to: '/admin/students', label: 'Students', icon: Users, roles: ['admin'] },
  { to: '/admin/enrolments', label: 'Enrolments', icon: ClipboardList, roles: ['admin'] },
]

const LECTURER_LINKS = [
  { to: '/lecturer', label: 'Sessions', icon: LayoutGrid, end: true, roles: ['admin', 'lecturer'] },
  { to: '/lecturer/enrolment', label: 'Facial Enrolment', icon: ScanFace, roles: ['admin', 'lecturer'] },
  { to: '/lecturer/attendance', label: 'Live Attendance', icon: Video, roles: ['admin', 'lecturer'] },
  { to: '/lecturer/reports', label: 'Reports', icon: FileBarChart, roles: ['admin', 'lecturer'] },
]

const STUDENT_LINKS = [
  { to: '/portal', label: 'My attendance', icon: LayoutGrid, end: true, roles: ['student'] },
]

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  // The desktop sidebar is always on screen, so it must not be hidden from
  // assistive tech just because the mobile drawer happens to be closed.
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  )

  const links = [...ADMIN_LINKS, ...LECTURER_LINKS, ...STUDENT_LINKS].filter((link) =>
    link.roles.includes(user?.role)
  )

  // Navigating away should always dismiss the drawer, otherwise it stays
  // covering the page a student just opened on a phone.
  useEffect(() => {
    onClose()
  }, [pathname])

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)')
    const handleChange = (event) => setIsDesktop(event.matches)
    query.addEventListener('change', handleChange)
    setIsDesktop(query.matches)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  // Escape closes the drawer for keyboard users.
  useEffect(() => {
    if (!open) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  // Stop the page behind the drawer from scrolling on touch devices.
  useEffect(() => {
    if (!open) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <>
      {/* Backdrop: clicking anywhere outside the drawer dismisses it. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-ink-950/50 transition-opacity duration-200 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        aria-label="Main navigation"
        aria-hidden={!isDesktop && !open}
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 max-w-[85vw] flex-col border-r border-ink-200 bg-white transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-60 lg:max-w-none lg:translate-x-0 ${
          open ? 'translate-x-0 shadow-xl' : '-translate-x-full'
        }`}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-ink-100 px-5">
          <span className="text-sm font-semibold tracking-tight text-ink-900">Smart Attendance</span>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 flex h-8 w-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-50 hover:text-ink-700 lg:hidden"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {links.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-ink-900 text-white' : 'text-ink-600 hover:bg-ink-50 hover:text-ink-900'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  )
}
