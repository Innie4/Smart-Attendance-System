import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import PageHeader from '../../components/PageHeader.jsx'
import StatusBadge from '../../components/StatusBadge.jsx'
import { describeError } from '../../lib/errors.js'

export default function Students() {
  const [students, setStudents] = useState([])
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    matric_number: '',
    full_name: '',
    department_id: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')

  async function load() {
    try {
      const [studentsRes, departmentsRes] = await Promise.all([
        client.get('/admin/students'),
        client.get('/admin/departments'),
      ])
      setStudents(studentsRes.data)
      setDepartments(departmentsRes.data)
      setError('')
    } catch (err) {
      setError(describeError(err, 'Could not load students'))
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
      await client.post('/admin/students', {
        ...form,
        department_id: Number(form.department_id),
        // Send empty strings as absent so the API treats them as "no account".
        email: form.email.trim() || undefined,
        password: form.password || undefined,
      })
      setForm({ matric_number: '', full_name: '', department_id: '', email: '', password: '' })
      setOpen(false)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not create student'))
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this student record? Their enrolments and facial data will also be removed.')) return
    try {
      await client.delete(`/admin/students/${id}`)
      load()
    } catch (err) {
      setError(describeError(err, 'Could not delete student'))
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Students"
        subtitle="Matriculation records used across enrolment and attendance."
        actions={
          <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus size={16} /> New student
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
            key: 'portal',
            label: 'Portal access',
            render: (row) => (
              <StatusBadge variant={row.has_portal_account ? 'present' : 'pending'}>
                {row.has_portal_account ? row.email || 'Active' : 'No login'}
              </StatusBadge>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (row) => (
              <button
                onClick={() => handleDelete(row.id)}
                aria-label={`Delete ${row.full_name}`}
                className="rounded-xl p-1.5 text-ink-400 transition-colors duration-300 hover:bg-signal-absent/10 hover:text-signal-absent"
              >
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
        <form id="student-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="label" htmlFor="student-matric">
              Matric number
            </label>
            <input
              id="student-matric"
              className="input"
              required
              value={form.matric_number}
              onChange={(e) => setForm({ ...form, matric_number: e.target.value })}
              placeholder="CSC/20/1001"
            />
          </div>
          <div>
            <label className="label" htmlFor="student-name">
              Full name
            </label>
            <input
              id="student-name"
              className="input"
              required
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="student-department">
              Department
            </label>
            <select
              id="student-department"
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

          <div className="border-t border-ink-100/70 pt-5">
            <label className="label" htmlFor="student-email">
              Portal email (optional)
            </label>
            <input
              id="student-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="student@smartattendance.ng"
            />
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Lets the student sign in and view their own attendance. Leave blank to register the record
              only.
            </p>
          </div>

          {form.email.trim() && (
            <div>
              <label className="label" htmlFor="student-password">
                Portal password
              </label>
              <input
                id="student-password"
                className="input"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="At least 8 characters"
              />
            </div>
          )}

          {error && open && <p className="text-sm font-medium text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
