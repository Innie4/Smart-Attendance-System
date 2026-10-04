import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { describeError } from '../../lib/errors.js'

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ course_code: '', title: '', unit_load: 3, department_id: '' })
  const [error, setError] = useState('')

  async function load() {
    try {
      const [coursesRes, departmentsRes] = await Promise.all([
        client.get('/admin/courses'),
        client.get('/admin/departments'),
      ])
      setCourses(coursesRes.data)
      setDepartments(departmentsRes.data)
      setError('')
    } catch (err) {
      setError(describeError(err, 'Could not load courses'))
    }
  }

  useEffect(() => {
    load()
  }, [])

  function departmentName(id) {
    return departments.find((d) => d.id === id)?.name || '-'
  }

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    try {
      await client.post('/admin/courses', { ...form, department_id: Number(form.department_id) })
      setForm({ course_code: '', title: '', unit_load: 3, department_id: '' })
      setOpen(false)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not create course'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this course? Enrolments and sessions attached to it will also be removed.')) return
    try {
      await client.delete(`/admin/courses/${id}`)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not delete course'))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Courses"
        subtitle="Courses offered per department, with unit load."
        actions={
          <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus size={16} /> New course
          </button>
        }
      />

      {error && !open && (
        <p role="alert" className="rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
          {error}
        </p>
      )}

      <DataTable
        columns={[
          { key: 'course_code', label: 'Code' },
          { key: 'title', label: 'Title' },
          { key: 'unit_load', label: 'Units' },
          { key: 'department', label: 'Department', render: (row) => departmentName(row.department_id) },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button
                onClick={() => handleDelete(row.id)}
                aria-label={`Delete ${row.course_code}`}
                className="rounded-xl p-1.5 text-ink-400 transition-colors duration-300 hover:bg-signal-absent/10 hover:text-signal-absent"
              >
                <Trash2 size={16} />
              </button>
            ),
          },
        ]}
        rows={courses}
      />

      <Modal
        open={open}
        title="New course"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="course-form" type="submit">
              Create
            </button>
          </>
        }
      >
        <form id="course-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="label" htmlFor="course-code">
              Course code
            </label>
            <input
              id="course-code"
              className="input"
              required
              value={form.course_code}
              onChange={(e) => setForm({ ...form, course_code: e.target.value })}
              placeholder="CSC301"
            />
          </div>
          <div>
            <label className="label" htmlFor="course-title">
              Title
            </label>
            <input
              id="course-title"
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Operating Systems"
            />
          </div>
          <div>
            <label className="label" htmlFor="course-units">
              Unit load
            </label>
            <input
              id="course-units"
              type="number"
              min="1"
              className="input"
              required
              value={form.unit_load}
              onChange={(e) => setForm({ ...form, unit_load: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="course-department">
              Department
            </label>
            <select
              id="course-department"
              className="input"
              required
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            >
              <option value="" disabled>
                Select department
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          {error && open && <p className="text-sm font-medium text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
