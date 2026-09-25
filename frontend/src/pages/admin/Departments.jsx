import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'

export default function Departments() {
  const [departments, setDepartments] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', code: '' })
  const [error, setError] = useState('')

  async function load() {
    try {
      const { data } = await client.get('/admin/departments')
      setDepartments(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.error || 'Could not load departments. Is the API running?')
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleCreate(event) {
    event.preventDefault()
    setError('')
    try {
      await client.post('/admin/departments', {
        name: form.name.trim(),
        code: form.code.trim(),
      })
      setForm({ name: '', code: '' })
      setOpen(false)
      load()
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.error || 'Could not create department')
      } else {
        setError('Could not reach the API. Check that the backend is running.')
      }
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this department? Courses and students attached to it must be moved first.')) return
    try {
      await client.delete(`/admin/departments/${id}`)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Could not delete department')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink-900">Departments</h1>
          <p className="text-sm text-ink-500">Academic departments used to group courses and students.</p>
        </div>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus size={16} /> New department
        </button>
      </div>

      {error && !open && (
        <p className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">{error}</p>
      )}

      <DataTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'code', label: 'Code' },
          {
            key: 'created_at',
            label: 'Created',
            render: (row) => new Date(row.created_at).toLocaleDateString(),
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
        rows={departments}
      />

      <Modal
        open={open}
        title="New department"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button className="btn-primary" form="department-form" type="submit">
              Create
            </button>
          </>
        }
      >
        <form id="department-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="label">Department name</label>
            <input
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Computer Science"
            />
          </div>
          <div>
            <label className="label">Code</label>
            <input
              className="input"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CSC"
            />
          </div>
          {error && open && <p className="text-sm text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
