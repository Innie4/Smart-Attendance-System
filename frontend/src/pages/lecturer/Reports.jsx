import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import StatCard from '../../components/StatCard.jsx'
import { describeError } from '../../lib/errors.js'

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

  function download(format) {
    const url = `${client.defaults.baseURL}/reports/courses/${courseId}/export.${format}?session_year=${encodeURIComponent(
      sessionYear
    )}`
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = `${report.course.course_code}_${sessionYear}_attendance.${format}`
        link.click()
      })
  }

  const chartData = report?.students.map((s) => ({ name: s.matric_number, percentage: s.attendance_percentage })) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-900">Compliance reports</h1>
        <p className="text-sm text-ink-500">Attendance percentage against the 75% NUC minimum.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="w-full sm:w-56">
          <label className="label">Course</label>
          <select className="input" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
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
          <label className="label">Session year</label>
          <input className="input" value={sessionYear} onChange={(e) => setSessionYear(e.target.value)} />
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
        <p className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      {report && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Enrolled students" value={report.students.length} />
            <StatCard label="At-risk students" value={report.at_risk_count} hint="Below 75% attendance" />
            <StatCard label="NUC threshold" value={`${report.nuc_threshold}%`} />
          </div>

          <div className="card p-5">
            <h3 className="mb-4 text-sm font-semibold text-ink-900">Attendance distribution</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eceef1" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-30} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <ReferenceLine y={report.nuc_threshold} stroke="#c23b3b" strokeDasharray="4 4" />
                <Bar dataKey="percentage" fill="#3563e0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

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
