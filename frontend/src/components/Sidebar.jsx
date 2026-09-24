import { NavLink } from 'react-router-dom'
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

export default function Sidebar() {
  const links = [...ADMIN_LINKS, ...LECTURER_LINKS]

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
      <div className="flex h-14 items-center border-b border-ink-100 px-5">
        <span className="text-sm font-semibold tracking-tight text-ink-900">Smart Attendance</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
  )
}
