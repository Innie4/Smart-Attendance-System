import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GraduationCap, Loader2, LogIn, UserRound } from 'lucide-react'
import Aurora from '../components/Aurora.jsx'
import GlassCard from '../components/GlassCard.jsx'
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

// Nudges the second card down on wide screens so the row reads as a loose pair
// rather than a rigid grid. Applied to the grid cell rather than the card, so
// both cards keep the same height (a margin would shorten the stretched one).
// Written out in full because Tailwind can only see class names that appear
// literally in the source.
const STAGGER = ['sm:translate-y-0', 'sm:translate-y-2']

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
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-14">
      <Aurora />

      <div className="page-enter w-full max-w-xl">
        <header className="text-center">
          <h1 className="font-display text-5xl font-medium leading-tight tracking-tight text-ink-900 sm:text-6xl">
            Smart Attendance
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-500">
            Face recognition for university roll call, with consent-first enrolment and
            NUC-compliant reporting.
          </p>
        </header>

        {error && (
          <p role="alert" className="mt-8 rounded-2xl border border-signal-absent/25 bg-signal-absent/10 px-4 py-3 text-sm font-medium text-signal-absent">
            {error}
          </p>
        )}

        {/* The second card is nudged down on wide screens so the row reads as a
            loose pair rather than a rigid grid. */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {DEMO_ACCOUNTS.map((account, index) => {
            const isEntering = entering === account.key
            return (
              <div key={account.key} className={STAGGER[index] || ''}>
                <button
                  type="button"
                  onClick={() => enterAs(account)}
                  disabled={busy}
                  className="card flex h-full w-full items-center gap-4 p-5 text-left transition-all duration-500 ease-spring hover:-translate-y-1 hover:shadow-lift disabled:opacity-60"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[58%_42%_52%_48%/48%_58%_42%_52%] bg-accent-100 text-accent-700">
                    {isEntering ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <account.icon size={18} />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg font-medium leading-tight text-ink-900">
                      {isEntering
                        ? `Opening ${account.role.toLowerCase()} account...`
                        : `Continue as ${account.role}`}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-ink-500">
                      {account.description}
                    </span>
                  </span>
                </button>
              </div>
            )
          })}
        </div>

        <div className="my-9 flex items-center gap-4">
          <span className="h-px flex-1 bg-ink-200" />
          <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-ink-400">or</span>
          <span className="h-px flex-1 bg-ink-200" />
        </div>

        <GlassCard className="space-y-5 p-7">
          <form id="login-form" onSubmit={handleSubmit} className="space-y-5">
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
        </GlassCard>

        <div className="mt-9 text-center">
          <p className="text-xs leading-relaxed text-ink-400">
            Runs on built-in sample data, so changes stay in this browser only.
          </p>
          <button
            type="button"
            onClick={handleReset}
            className="mt-2 text-xs font-semibold text-ink-500 underline underline-offset-4 transition-colors duration-300 hover:text-ink-800"
          >
            Reset sample data
          </button>
        </div>
      </div>
    </div>
  )
}