import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanFace, Video, FileBarChart } from 'lucide-react'
import client from '../../api/client.js'
import GlassCard from '../../components/GlassCard.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import { describeError } from '../../lib/errors.js'

const SHORTCUTS = [
  {
    to: '/lecturer/enrolment',
    icon: ScanFace,
    title: 'Facial enrolment',
    body: 'Capture and register a student’s face vector.',
  },
  {
    to: '/lecturer/attendance',
    icon: Video,
    title: 'Live attendance',
    body: 'Open a session and mark attendance from the camera feed.',
  },
  {
    to: '/lecturer/reports',
    icon: FileBarChart,
    title: 'Reports',
    body: 'Review NUC compliance and export CSV/PDF records.',
  },
]

export default function Dashboard() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [coursesRes, studentsRes] = await Promise.all([
          client.get('/admin/courses'),
          client.get('/admin/students'),
        ])
        setCourses(coursesRes.data)
        setStudents(studentsRes.data)
        setError('')
      } catch (err) {
        setError(describeError(err, 'Could not load the overview'))
      }
    }
    load()
  }, [])

  const enrolledCount = students.filter((s) => s.has_facial_enrolment).length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Sessions"
        subtitle="Run enrolment, take attendance, and review compliance reports."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Available courses" value={courses.length} />
        <StatCard label="Students facially enrolled" value={`${enrolledCount}/${students.length}`} />
        <StatCard label="NUC threshold" value="75%" hint="Minimum attendance for exam eligibility" />
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {SHORTCUTS.map(({ to, icon: Icon, title, body }) => (
          <GlassCard
            key={to}
            as={Link}
            to={to}
            hover
            className="group p-6"
          >
            <span className="inline-flex rounded-2xl bg-accent-50/80 p-2.5 text-accent-600 transition-transform duration-500 ease-spring group-hover:scale-110">
              <Icon size={20} />
            </span>
            <h3 className="mt-4 font-display text-xl font-medium tracking-tight text-ink-900">{title}</h3>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{body}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  )
}