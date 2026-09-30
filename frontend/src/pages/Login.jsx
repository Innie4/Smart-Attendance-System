import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, ShieldCheck, GraduationCap, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { resetDemoData } from '../mock/data.js'

const DEMO_ACCOUNTS = [
  { role: 'Administrator', email: 'admin@smartattendance.ng', password: 'Admin@12345', icon: ShieldCheck },
  { role: 'Lecturer', email: 'lecturer@smartattendance.ng', password: 'Lecturer@12345', icon: GraduationCap },
  { role: 'Student', email: 'student1@smartattendance.ng', password: 'Student@12345', icon: UserRound },
]

export default function Login() {
  const { user, login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  if (user) {
    return <Navigate to={location.state?.from || (user.role === 'student' ? '/portal' : '/admin')} replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      const signedIn = await login(email, password)
      // Students land in their own portal; staff go to the admin console.
      const fallback = signedIn.role === 'student' ? '/portal' : '/admin'
      navigate(location.state?.from && !isForbiddenFallback(location.state.from) ? location.state.from : fallback, {
        replace: true,
      })
    } catch {
      // message is surfaced from context
    }
  }

  function useDemo(account) {
    setEmail(account.email)
    setPassword(account.password)
  }

  function handleReset() {
    resetDemoData()
    setEmail('')
    setPassword('')
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight text-ink-900">Smart Attendance</h1>
          <p className="mt-1 text-sm text-ink-500">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@smartattendance.ng"
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">
              {error}
            </p>
          )}

          <button className="btn-primary w-full" type="submit" disabled={loading}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="card p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-500">
            Demo accounts
          </p>
          <div className="space-y-2">
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => useDemo(account)}
                className="flex w-full items-center gap-3 rounded-md border border-ink-200 px-3 py-2 text-left text-sm transition-colors hover:bg-ink-50"
              >
                <account.icon size={16} className="shrink-0 text-ink-400" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-ink-900">{account.role}</span>
                  <span className="block truncate text-xs text-ink-500">{account.email}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-400">
            Running on built-in sample data, so records you create are kept in this browser only.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs font-medium text-ink-500 underline underline-offset-2 hover:text-ink-800"
          >
            Reset sample data
          </button>
        </div>
      </div>
    </div>
  )
}

// A redirect target that belongs to a different role's area is not a
// legitimate post-login destination.
function isForbiddenFallback(path) {
  if (typeof path !== 'string') return true
  if (path.startsWith('/portal')) return true
  if (path.startsWith('/admin') || path.startsWith('/lecturer')) return false
  return true
}
