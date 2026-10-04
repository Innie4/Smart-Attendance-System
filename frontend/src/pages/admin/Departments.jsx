import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import client from '../../api/client.js'
import DataTable from '../../components/DataTable.jsx'
import Modal from '../../components/Modal.jsx'
import PageHeader from '../../components/PageHeader.jsx'

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
    <div className="space-y-8">
      <PageHeader
        title="Departments"
        subtitle="Academic departments used to group courses and students."
        actions={
          <button className="btn-primary w-full sm:w-auto" onClick={() => setOpen(true)}>
            <Plus size={16} /> New department
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
              <button
                onClick={() => handleDelete(row.id)}
                aria-label={`Delete ${row.name}`}
                className="rounded-xl p-1.5 text-ink-400 transition-colors duration-300 hover:bg-signal-absent/10 hover:text-signal-absent"
              >
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
        <form id="department-form" onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="label" htmlFor="department-name">
              Department name
            </label>
            <input
              id="department-name"
              className="input"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Computer Science"
            />
          </div>
          <div>
            <label className="label" htmlFor="department-code">
              Code
            </label>
            <input
              id="department-code"
              className="input"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="CSC"
            />
          </div>
          {error && open && <p className="text-sm font-medium text-signal-absent">{error}</p>}
        </form>
      </Modal>
    </div>
  )
}
