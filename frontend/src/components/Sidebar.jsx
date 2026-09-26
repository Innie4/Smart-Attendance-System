import { useEffect } from 'react'
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

const ADMIN_LINKS = [
  { to: '/admin', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/admin/departments', label: 'Departments', icon: Building2 },
  { to: '/admin/courses', label: 'Courses', icon: BookOpen },
  { to: '/admin/lecturers', label: 'Lecturers', icon: GraduationCap },
  { to: '/admin/students', label: 'Students', icon: Users },
  { to: '/admin/enrolments', label: 'Enrolments', icon: ClipboardList },
]

const LECTURER_LINKS = [
  { to: '/lecturer', label: 'Sessions', icon: LayoutGrid, end: true },
  { to: '/lecturer/enrolment', label: 'Facial Enrolment', icon: ScanFace },
  { to: '/lecturer/attendance', label: 'Live Attendance', icon: Video },
  { to: '/lecturer/reports', label: 'Reports', icon: FileBarChart },
]

export default function Sidebar({ open, onClose }) {
  const links = [...ADMIN_LINKS, ...LECTURER_LINKS]
  const { pathname } = useLocation()

  // Navigating away should always dismiss the drawer, otherwise it stays
  // covering the page a student just opened on a phone.
  useEffect(() => {
    onClose()
  }, [pathname])

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
        aria-hidden={!open}
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
