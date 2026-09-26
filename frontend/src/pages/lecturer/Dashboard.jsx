import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanFace, Video, FileBarChart } from 'lucide-react'
import client from '../../api/client.js'
import StatCard from '../../components/StatCard.jsx'
import { describeError } from '../../lib/errors.js'

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
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">Overview</h1>
        <p className="text-sm text-ink-500">Run enrolment, take attendance, and review compliance reports.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Available courses" value={courses.length} />
        <StatCard label="Students facially enrolled" value={`${enrolledCount}/${students.length}`} />
        <StatCard label="NUC threshold" value="75%" hint="Minimum attendance for exam eligibility" />
      </div>

      {error && (
        <p className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link to="/lecturer/enrolment" className="card p-5 transition-colors hover:border-ink-300">
          <ScanFace className="text-accent-500" size={20} />
          <h3 className="mt-3 text-sm font-semibold text-ink-900">Facial enrolment</h3>
          <p className="mt-1 text-xs text-ink-500">Capture and register a student's face vector.</p>
        </Link>
        <Link to="/lecturer/attendance" className="card p-5 transition-colors hover:border-ink-300">
          <Video className="text-accent-500" size={20} />
          <h3 className="mt-3 text-sm font-semibold text-ink-900">Live attendance</h3>
          <p className="mt-1 text-xs text-ink-500">Open a session and mark attendance from the camera feed.</p>
        </Link>
        <Link to="/lecturer/reports" className="card p-5 transition-colors hover:border-ink-300">
          <FileBarChart className="text-accent-500" size={20} />
          <h3 className="mt-3 text-sm font-semibold text-ink-900">Reports</h3>
          <p className="mt-1 text-xs text-ink-500">Review NUC compliance and export CSV/PDF records.</p>
        </Link>
      </div>
    </div>
  )
}
