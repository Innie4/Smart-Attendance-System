import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ScanFace, Video, FileBarChart } from 'lucide-react'
import client from '../../api/client.js'
import StatCard from '../../components/StatCard.jsx'

export default function Dashboard() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])

  useEffect(() => {
    client.get('/admin/courses').then((res) => setCourses(res.data))
    client.get('/admin/students').then((res) => setStudents(res.data))
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
