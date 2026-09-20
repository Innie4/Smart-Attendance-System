import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'

export default function Students() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ matric_number: '', full_name: '', department_id: '' })
  const [error, setError] = useState('')

  async function load() {
    const [studentsRes, departmentsRes] = await Promise.all([
      client.get('/admin/students'),
      client.get('/admin/departments'),
    ])
    setStudents(studentsRes.data)
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
      await client.post('/admin/students', { ...form, department_id: Number(form.department_id) })
      setForm({ matric_number: '', full_name: '', department_id: '' })
      setOpen(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create student')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student record? Their enrolments and facial data will also be removed.')) return
    await client.delete(`/admin/students/${id}`)
    load()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Students</h1>
          <p className="text-sm text-ink-500">Matriculation records used across enrolment and attendance.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New student
        </button>
      </div>

      <DataTable
        columns={[
          { key: 'matric_number', label: 'Matric No.' },
          { key: 'full_name', label: 'Name' },
          { key: 'department', label: 'Department', render: (row) => departmentName(row.department_id) },
          {
            key: 'consent',
            label: 'NDPA consent',
            render: (row) => (
              <StatusBadge variant={row.consent_given ? 'present' : 'pending'}>
                {row.consent_given ? 'Recorded' : 'Not given'}
              </StatusBadge>
            ),
          },
          {
            key: 'face',
            label: 'Facial enrolment',
            render: (row) => (
              <StatusBadge variant={row.has_facial_enrolment ? 'present' : 'warning'}>
                {row.has_facial_enrolment ? 'Enrolled' : 'Pending'}
              </StatusBadge>
            ),
          },
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
        rows={students}
      />

      <Modal
        open={open}
        title="New student"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="student-form" type="submit">
              Create
            </button>
          </>
        }
      >
        <form id="student-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Matric number</label>
            <input
              className="input"
              required
              value={form.matric_number}
              onChange={(e) => setForm({ ...form, matric_number: e.target.value })}
              placeholder="CSC/20/1001"
            />
          </div>
          <div>
            <label className="label">Full name</label>
            <input
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
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
