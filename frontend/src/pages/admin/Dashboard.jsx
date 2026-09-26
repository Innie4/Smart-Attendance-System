import { useEffect, useState } from 'react'
import { Building2, BookOpen, GraduationCap, Users } from 'lucide-react'
import client from '../../api/client.js'
import StatCard from '../../components/StatCard.jsx'
import { describeError } from '../../lib/errors.js'

export default function Dashboard() {
  const [counts, setCounts] = useState({ departments: 0, courses: 0, lecturers: 0, students: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [departments, courses, lecturers, students] = await Promise.all([
          client.get('/admin/departments'),
          client.get('/admin/courses'),
          client.get('/admin/lecturers'),
          client.get('/admin/students'),
        ])
        setCounts({
          departments: departments.data.length,
          courses: courses.data.length,
          lecturers: lecturers.data.length,
          students: students.data.length,
        })
        setError('')
      } catch (err) {
        setError(describeError(err, 'Could not load the overview'))
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">Overview</h1>
        <p className="text-sm text-ink-500">Institution-wide summary of registered records.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Departments" value={counts.departments} icon={Building2} />
        <StatCard label="Courses" value={counts.courses} icon={BookOpen} />
        <StatCard label="Lecturers" value={counts.lecturers} icon={GraduationCap} />
        <StatCard label="Students" value={counts.students} icon={Users} />
      </div>

      {error && (
        <p className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-ink-900">Getting started</h2>
        <ol className="mt-3 space-y-2 text-sm text-ink-600">
          <li>1. Create departments, then courses attached to each department.</li>
          <li>2. Register lecturer accounts and assign them to a department.</li>
          <li>3. Add students and enrol them into courses for the current session.</li>
          <li>4. Lecturers complete facial enrolment before live attendance can recognise a student.</li>
        </ol>
      </div>
    </div>
  )
}
