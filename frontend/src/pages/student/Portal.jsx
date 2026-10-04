import { useEffect, useState } from 'react'
import { BookOpen, CalendarCheck, CheckCircle2, TriangleAlert } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import GlassCard from '../../components/GlassCard.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import StatCard from '../../components/StatCard.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { describeError } from '../../lib/errors.js'

export default function StudentPortal() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data: payload } = await client.get('/student/attendance')
        if (!cancelled) {
          setData(payload)
          setError('')
        }
      } catch (err) {
        if (!cancelled) setError(describeError(err, 'Could not load your attendance'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <p className="py-10 text-sm font-medium text-ink-400">Loading your attendance...</p>
  }

  const summary = data?.summary
  const eligible = summary?.is_eligible_for_exams

  return (
    <div className="space-y-8">
      <PageHeader
        title="My attendance"
        subtitle={`Session ${data?.session_year} - NUC requires at least ${data?.nuc_threshold}% to sit exams.`}
      />

      {error && (
        <p role="alert" className="rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
          {error}
        </p>
      )}

      {summary && (
        <>
          <GlassCard
            tone={eligible ? 'good' : 'alert'}
            className="flex flex-col gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-4">
              {eligible ? (
                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-signal-present" />
              ) : (
                <TriangleAlert size={22} className="mt-0.5 shrink-0 text-signal-absent" />
              )}
              <div>
                <p className="font-display text-xl font-medium tracking-tight text-ink-900">
                  {eligible ? 'Eligible to sit examinations' : 'Not yet eligible to sit examinations'}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                  {summary.courses_graded === 0
                    ? 'No completed sessions have been recorded yet.'
                    : eligible
                      ? 'Your attendance clears the NUC minimum in every graded course.'
                      : `${summary.at_risk_count} of your ${summary.courses_graded} graded ${
                          summary.courses_graded === 1 ? 'course is' : 'courses are'
                        } below ${data.nuc_threshold}%.`}
                </p>
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Courses enrolled" value={summary.courses_enrolled} icon={BookOpen} />
            <StatCard label="Average attendance" value={`${summary.average_percentage}%`} icon={CalendarCheck} />
            <StatCard
              label="Courses at risk"
              value={summary.at_risk_count}
              hint={`Below ${data.nuc_threshold}%`}
            />
            <StatCard label="NUC threshold" value={`${data.nuc_threshold}%`} />
          </div>
        </>
      )}

      {data && (
        <DataTable
          columns={[
            { key: 'course_code', label: 'Code' },
            { key: 'title', label: 'Course' },
            { key: 'unit_load', label: 'Units' },
            { key: 'sessions_attended', label: 'Attended' },
            { key: 'sessions_held', label: 'Held' },
            { key: 'attendance_percentage', label: 'Attendance', render: (row) => `${row.attendance_percentage}%` },
            {
              key: 'is_compliant',
              label: 'NUC status',
              render: (row) =>
                row.sessions_held === 0 ? (
                  <StatusBadge variant="pending">No sessions yet</StatusBadge>
                ) : row.is_compliant ? (
                  <StatusBadge variant="present">Eligible</StatusBadge>
                ) : (
                  <StatusBadge variant="absent">Below minimum</StatusBadge>
                ),
            },
          ]}
          rows={data.courses}
          emptyLabel="You are not enrolled in any courses for this session"
        />
      )}

      <p className="text-xs leading-relaxed text-ink-400">
        Signed in as {user?.full_name}. This view is read-only and shows only your own record.
      </p>
    </div>
  )
}
