import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import GlassCard from '../../components/GlassCard.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import StatCard from '../../components/StatCard.jsx'
import { describeError } from '../../lib/errors.js'
import { triggerDownload } from '../../mock/exports.js'

// Recharts and the canvas overlay cannot read CSS classes, so the palette is
// mirrored here. Keep in step with the tokens in tailwind.config.js.
const CHART = {
  grid: '#e6dcd4',
  bar: '#b56f6a',
  threshold: '#9c5653',
  text: '#6f6154',
  tooltipBg: '#fdf9f6',
}

export default function Reports() {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [sessionYear, setSessionYear] = useState('2025/2026')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    client
      .get('/admin/courses')
      .then((res) => setCourses(res.data))
      .catch((err) => setError(describeError(err, 'Could not load courses')))
  }, [])

  async function loadReport() {
    if (!courseId) return
    setLoading(true)
    setError('')
    try {
      const { data } = await client.get(`/reports/courses/${courseId}`, {
        params: { session_year: sessionYear },
      })
      setReport(data)
    } catch (err) {
      setError(describeError(err, 'Could not generate the report'))
    } finally {
      setLoading(false)
    }
  }

  async function download(format) {
    // Requested through the api client so the response goes through the same
    // transport as everything else (a blob, so the browser saves the file).
    setError('')
    try {
      const res = await client.get(
        `/reports/courses/${courseId}/export.${format}`,
        { params: { session_year: sessionYear }, responseType: 'text' }
      )
      const mime = format === 'csv' ? 'text/csv' : 'application/pdf'
      const blob = new Blob([res.data], { type: mime })
      triggerDownload(blob, `${report.course.course_code}_${sessionYear}_attendance.${format}`)
    } catch (err) {
      setError(describeError(err, `Could not download the ${format.toUpperCase()} export`))
    }
  }

  const chartData = report?.students.map((s) => ({ name: s.matric_number, percentage: s.attendance_percentage })) || []

  return (
    <div className="space-y-8">
      <PageHeader title="Compliance reports" subtitle="Attendance percentage against the 75% NUC minimum." />

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-56">
          <label className="label" htmlFor="report-course">
            Course
          </label>
          <select id="report-course" className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="" disabled>
              Select a course
            </option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.course_code}
              </option>
            ))}
          </select>
        </div>
        <div className="w-full sm:w-40">
          <label className="label" htmlFor="report-session-year">
            Session year
          </label>
          <input
            id="report-session-year"
            className="input"
            value={sessionYear}
            onChange={(e) => setSessionYear(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button className="btn-primary" onClick={loadReport} disabled={!courseId || loading}>
            {loading ? 'Loading...' : 'Generate report'}
          </button>
          {report && (
            <>
              <button className="btn-secondary" onClick={() => download('csv')}>
                <Download size={14} /> CSV
              </button>
              <button className="btn-secondary" onClick={() => download('pdf')}>
                <FileText size={14} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
          {error}
        </p>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatCard label="Enrolled students" value={report.students.length} />
            <StatCard label="At-risk students" value={report.at_risk_count} hint="Below 75% attendance" />
            <StatCard label="NUC threshold" value={`${report.nuc_threshold}%`} />
          </div>

          <GlassCard className="p-7">
            <h3 className="font-display text-xl font-medium tracking-tight text-ink-900">
              Attendance distribution
            </h3>
            <div className="mt-6">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: CHART.text }}
                    interval={0}
                    angle={-30}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.text }} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '1rem',
                      border: `1px solid ${CHART.grid}`,
                      background: CHART.tooltipBg,
                      fontSize: '0.8rem',
                    }}
                  />
                  <ReferenceLine y={report.nuc_threshold} stroke={CHART.threshold} strokeDasharray="4 4" />
                  <Bar dataKey="percentage" fill={CHART.bar} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <DataTable
            columns={[
              { key: 'matric_number', label: 'Matric No.' },
              { key: 'full_name', label: 'Name' },
              { key: 'sessions_attended', label: 'Attended' },
              { key: 'sessions_held', label: 'Held' },
              { key: 'attendance_percentage', label: '%', render: (r) => `${r.attendance_percentage.toFixed(2)}%` },
              {
                key: 'is_compliant',
                label: 'NUC status',
                render: (r) => (
                  <StatusBadge variant={r.is_compliant ? 'present' : 'absent'}>
                    {r.is_compliant ? 'Eligible' : 'At risk'}
                  </StatusBadge>
                ),
              },
            ]}
            rows={report.students}
          />
        </>
      )}
    </div>
  )
}
