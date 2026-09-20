import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'

export default function Courses() {
  const [courses, setCourses] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ course_code: '', title: '', unit_load: 3, department_id: '' })
  const [error, setError] = useState('')

  async function load() {
    const [coursesRes, departmentsRes] = await Promise.all([
      client.get('/admin/courses'),
      client.get('/admin/departments'),
    ])
    setCourses(coursesRes.data)
    setDepartments(departmentsRes.data)
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
      setError(err.response?.data?.error || 'Could not create course')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this course? Enrolments and sessions attached to it will also be removed.')) return
    await client.delete(`/admin/courses/${id}`)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Courses</h1>
          <p className="text-sm text-ink-500">Courses offered per department, with unit load.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New course
        </button>
      </div>

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
              <button onClick={() => handleDelete(row.id)} className="text-ink-400 hover:text-signal-absent">
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
        <form id="course-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Course code</label>
            <input
              className="input"
              required
              value={form.course_code}
              onChange={(e) => setForm({ ...form, course_code: e.target.value })}
              placeholder="CSC301"
            />
          </div>
          <div>
            <label className="label">Title</label>
            <input
              className="input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Operating Systems"
            />
          </div>
          <div>
            <label className="label">Unit load</label>
            <input
              type="number"
              min="1"
              className="input"
              required
              value={form.unit_load}
              onChange={(e) => setForm({ ...form, unit_load: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label">Department</label>
            <select
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
          {error && <p className="text-sm text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
