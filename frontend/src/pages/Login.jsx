import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Loader2, LogIn, UserRound } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { resetDemoData } from '../mock/data.js'
import { homeRouteFor, isAllowedDestination } from '../lib/roles.js'

// One-click entry points: pressing a card signs straight in, so a reviewer can
// jump straight into either area without typing anything.
const DEMO_ACCOUNTS = [
  {
    key: 'lecturer',
    role: 'Lecturer',
    email: 'lecturer@smartattendance.ng',
    password: 'Lecturer@12345',
    icon: GraduationCap,
    description: 'Run enrolment, take live attendance, review compliance',
  },
  {
    key: 'student',
    role: 'Student',
    email: 'student1@smartattendance.ng',
    password: 'Student@12345',
    icon: UserRound,
    description: 'View your own attendance and exam eligibility',
  },
]

export default function Login() {
  const { user, login, loading, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [entering, setEntering] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()

  if (user) {
    return <Navigate to={location.state?.from || homeRouteFor(user.role)} replace />
  }

  const busy = loading || entering !== null

  async function finishSignIn(signedIn) {
    const from = location.state?.from
    navigate(
      from && isAllowedDestination(from, signedIn.role) ? from : homeRouteFor(signedIn.role),
      { replace: true }
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()
    try {
      await finishSignIn(await login(email, password))
    } catch {
      // message is surfaced from context
    }
  }

  // Single click: authenticate and land in the right area. No form filling.
  async function enterAs(account) {
    if (busy) return
    setEntering(account.key)
    try {
      await finishSignIn(await login(account.email, account.password))
    } catch {
      // message is surfaced from context
    } finally {
      setEntering(null)
    }
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
          <p className="mt-1 text-sm text-ink-500">Choose an account to continue</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-signal-absent/10 px-3 py-2 text-sm text-signal-absent">
            {error}
          </p>
        )}

        <div className="space-y-3">
          {DEMO_ACCOUNTS.map((account) => {
            const isEntering = entering === account.key
            return (
              <button
                key={account.key}
                type="button"
                onClick={() => enterAs(account)}
                disabled={busy}
                className="card flex w-full items-center gap-3 p-4 text-left transition-colors hover:border-accent-400 hover:bg-accent-50/40 disabled:opacity-60 disabled:hover:border-ink-200 disabled:hover:bg-white"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600">
                  {isEntering ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <account.icon size={18} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink-900">
                    {isEntering ? `Opening ${account.role.toLowerCase()} account...` : `Continue as ${account.role}`}
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-500">{account.description}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-ink-400">or</span>
          <span className="h-px flex-1 bg-ink-200" />
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

          <button className="btn-primary w-full" type="submit" disabled={busy}>
            <LogIn size={16} />
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="text-center">
          <p className="text-xs text-ink-400">
            Runs on built-in sample data, so changes stay in this browser only.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-1 text-xs font-medium text-ink-500 underline underline-offset-2 hover:text-ink-800"
          >
            Reset sample data
          </button>
        </div>
      </div>
    </div>
  )
}
