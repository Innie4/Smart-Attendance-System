import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import { describeError } from '../../lib/errors.js'

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
    try {
      const [lecturersRes, departmentsRes] = await Promise.all([
        client.get('/admin/lecturers'),
        client.get('/admin/departments'),
      ])
      setLecturers(lecturersRes.data)
      setDepartments(departmentsRes.data)
      setError('')
    } catch (err) {
      setError(describeError(err, 'Could not load lecturers'))
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
      await client.post('/admin/lecturers', { ...form, department_id: Number(form.department_id) })
      setForm(initialForm)
      setOpen(false)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not create lecturer account'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Remove this lecturer account? Lecturers with recorded attendance sessions cannot be removed.')) return
    try {
      await client.delete(`/admin/lecturers/${id}`)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not remove lecturer account'))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Lecturers"
        subtitle="Staff accounts authorised to run live attendance sessions."
        actions={
          <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus size={16} /> New lecturer
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
          { key: 'full_name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'staff_id', label: 'Staff ID' },
          { key: 'department', label: 'Department', render: (row) => departmentName(row.department_id) },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button
                onClick={() => handleDelete(row.id)}
                aria-label={`Remove ${row.full_name}`}
                className="rounded-xl p-1.5 text-ink-400 transition-colors duration-300 hover:bg-signal-absent/10 hover:text-signal-absent"
              >
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
        <form id="lecturer-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="label" htmlFor="lecturer-name">
              Full name
            </label>
            <input
              id="lecturer-name"
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="lecturer-email">
              Email
            </label>
            <input
              id="lecturer-email"
              type="email"
              className="input"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="lecturer-password">
              Temporary password
            </label>
            <input
              id="lecturer-password"
              type="password"
              className="input"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="lecturer-staff-id">
              Staff ID
            </label>
            <input
              id="lecturer-staff-id"
              className="input"
              required
              value={form.staff_id}
              onChange={(e) => setForm({ ...form, staff_id: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="lecturer-department">
              Department
            </label>
            <select
              id="lecturer-department"
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
