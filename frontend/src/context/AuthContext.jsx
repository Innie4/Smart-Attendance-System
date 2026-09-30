import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import client from '../api/client.js'

const AuthContext = createContext(null)

function readStoredUser() {
  try {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  // `checking` stays true until we know whether a stored token is still
  // valid, so a refresh never flashes the login screen at a signed-in user.
  const [checking, setChecking] = useState(() => Boolean(localStorage.getItem('access_token')))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function verify() {
      if (!localStorage.getItem('access_token')) {
        setChecking(false)
        return
      }
      try {
        const { data } = await client.get('/auth/me')
        if (cancelled) return
        localStorage.setItem('user', JSON.stringify(data))
        setUser(data)
      } catch {
        if (cancelled) return
        // Token is no longer usable: drop the session so guards can redirect.
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        setUser(null)
      } finally {
        if (!cancelled) setChecking(false)
      }
    }
    verify()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await client.post('/auth/login', { email, password })
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      return data.user
    } catch (err) {
      const message = err.response?.data?.error || 'Unable to sign in. Please try again.'
      setError(message)
      throw new Error(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, logout, loading, error, checking }),
    [user, login, logout, loading, error, checking]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
