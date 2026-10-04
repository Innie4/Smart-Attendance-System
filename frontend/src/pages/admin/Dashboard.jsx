import { useEffect, useState } from 'react'
import { Building2, BookOpen, GraduationCap, Users } from 'lucide-react'
import client from '../../api/client.js'
import GlassCard from '../../components/GlassCard.jsx'
import PageHeader from '../../components/PageHeader.jsx'
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
    <div className="space-y-8">
      <PageHeader title="Overview" subtitle="Institution-wide summary of registered records." />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Departments" value={counts.departments} icon={Building2} />
        <StatCard label="Courses" value={counts.courses} icon={BookOpen} />
        <StatCard label="Lecturers" value={counts.lecturers} icon={GraduationCap} />
        <StatCard label="Students" value={counts.students} icon={Users} />
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
          {error}
        </p>
      )}

      <GlassCard className="p-7">
        <h2 className="font-display text-xl font-medium tracking-tight text-ink-900">Getting started</h2>
        <ol className="mt-5 space-y-3.5 text-sm leading-relaxed text-ink-600">
          {[
            'Create departments, then courses attached to each department.',
            'Register lecturer accounts and assign them to a department.',
            'Add students and enrol them into courses for the current session.',
            'Lecturers complete facial enrolment before live attendance can recognise a student.',
          ].map((step, index) => (
            <li key={step} className="flex gap-3.5">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-[0.7rem] font-bold text-accent-700">
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </GlassCard>
    </div>
  )
}
