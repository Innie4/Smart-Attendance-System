import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'

const initialForm = {
  full_name: '',
  email: '',
  password: '',
  staff_id: '',
  department_id: '',
}

export default function Lecturers() {
  const [lecturers, setLecturers] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')

  async function load() {
    const [lecturersRes, departmentsRes] = await Promise.all([
      client.get('/admin/lecturers'),
      client.get('/admin/departments'),
    ])
    setLecturers(lecturersRes.data)
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
      await client.post('/admin/lecturers', { ...form, department_id: Number(form.department_id) })
      setForm(initialForm)
      setOpen(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create lecturer account')
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this lecturer account? Lecturers with recorded attendance sessions cannot be removed.')) return
    try {
      await client.delete(`/admin/lecturers/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not remove lecturer account')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Lecturers</h1>
          <p className="text-sm text-ink-500">Staff accounts authorised to run live attendance sessions.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New lecturer
        </button>
      </div>

      {error && !open && <p className="text-sm text-signal-absent">{error}</p>}

      <DataTable
        columns={[
          { key: 'full_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'staff_id', label: 'Staff ID' },
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
        rows={lecturers}
      />

      <Modal
        open={open}
        title="New lecturer"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="lecturer-form" type="submit">
              Create
            </button>
          </>
        }
      >
        <form id="lecturer-form" onSubmit={handleCreate} className="space-y-4">
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
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Temporary password</label>
            <input
              type="password"
              className="input"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Staff ID</label>
            <input
              className="input"
              required
              value={form.staff_id}
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
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
