import { useEffect, useState } from 'react'
import { BookOpen, CalendarCheck, CheckCircle2, TriangleAlert } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
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
    return <p className="text-sm text-ink-400">Loading your attendance...</p>
  }

  const summary = data?.summary
  const eligible = summary?.is_eligible_for_exams

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">My attendance</h1>
        <p className="text-sm text-ink-500">
          Session {data?.session_year} - NUC requires at least {data?.nuc_threshold}% to sit exams.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      {summary && (
        <>
          <div
            className={`card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${
              eligible ? 'border-signal-present/40 bg-signal-present/5' : 'border-signal-absent/40 bg-signal-absent/5'
            }`}
          >
            <div className="flex items-start gap-3">
              {eligible ? (
                <CheckCircle2 size={22} className="mt-0.5 shrink-0 text-signal-present" />
              ) : (
                <TriangleAlert size={22} className="mt-0.5 shrink-0 text-signal-absent" />
              )}
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {eligible ? 'Eligible to sit examinations' : 'Not yet eligible to sit examinations'}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <p className="text-xs text-ink-400">
        Signed in as {user?.full_name}. This view is read-only and shows only your own record.
      </p>
    </div>
  )
}
