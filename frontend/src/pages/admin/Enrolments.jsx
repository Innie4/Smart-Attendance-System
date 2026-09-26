import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import { describeError } from '../../lib/errors.js'

export default function Enrolments() {
  const [enrolments, setEnrolments] = useState([])
  const [students, setStudents] = useState([])
  const [courses, setCourses] = useState([])
  const [courseFilter, setCourseFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ student_id: '', course_id: '', session_year: '2025/2026' })
  const [error, setError] = useState('')

  async function load(filterCourseId) {
    try {
      const [enrolmentsRes, studentsRes, coursesRes] = await Promise.all([
        client.get('/admin/enrolments', { params: filterCourseId ? { course_id: filterCourseId } : {} }),
        client.get('/admin/students'),
        client.get('/admin/courses'),
      ])
      setEnrolments(enrolmentsRes.data)
      setStudents(studentsRes.data)
      setCourses(coursesRes.data)
      setError('')
    } catch (err) {
      setError(describeError(err, 'Could not load enrolments'))
    }
  }

  useEffect(() => {
    load()
  }, [])

  function studentLabel(id) {
    const student = students.find((s) => s.id === id)
    return student ? `${student.matric_number} - ${student.full_name}` : '-'
  }

  function courseLabel(id) {
    return courses.find((c) => c.id === id)?.course_code || '-'
  }

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    try {
      await client.post('/admin/enrolments', {
        ...form,
        student_id: Number(form.student_id),
        course_id: Number(form.course_id),
      })
      setOpen(false)
      load(courseFilter)
    } catch (err) {
      setError(describeError(err, 'Could not create enrolment'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this course enrolment?')) return
    try {
      await client.delete(`/admin/enrolments/${id}`)
      load(courseFilter)
    } catch (err) {
      setError(describeError(err, 'Could not delete enrolment'))
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Course enrolments</h1>
          <p className="text-sm text-ink-500">Maps students to the courses they sit attendance for.</p>
        </div>
        <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
          <Plus size={16} /> New enrolment
        </button>
      </div>

      <div className="w-full sm:max-w-xs">
        <label className="label">Filter by course</label>
        <select
          className="input"
          value={courseFilter}
          onChange={(e) => {
            setCourseFilter(e.target.value)
            load(e.target.value)
          }}
        >
          <option value="">All courses</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.course_code}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={[
          { key: 'student', label: 'Student', render: (row) => studentLabel(row.student_id) },
          { key: 'course', label: 'Course', render: (row) => courseLabel(row.course_id) },
          { key: 'session_year', label: 'Session' },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button onClick={() => handleDelete(row.id)} className="text-ink-400 hover:text-signal-absent">
                <Trash2 size={16} />
              </button>
            ),
          },
        ]}
        rows={enrolments}
      />

      <Modal
        open={open}
        title="New enrolment"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="enrolment-form" type="submit">
              Create
            </button>
          </>
        }
      >
        <form id="enrolment-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Student</label>
            <select
              className="input"
              required
              value={form.student_id}
              onChange={(e) => setForm({ ...form, student_id: e.target.value })}
            >
              <option value="" disabled>
                Select student
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.matric_number} - {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Course</label>
            <select
              className="input"
              required
              value={form.course_id}
              onChange={(e) => setForm({ ...form, course_id: e.target.value })}
            >
              <option value="" disabled>
                Select course
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.course_code} - {c.title}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Session year</label>
            <input
              className="input"
              required
              value={form.session_year}
              onChange={(e) => setForm({ ...form, session_year: e.target.value })}
              placeholder="2025/2026"
            />
          </div>
          {error && <p className="text-sm text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
