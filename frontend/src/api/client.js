import axios from 'axios'
import { mockAdapter } from '../mock/adapter.js'

/**
 * The app runs against the in-browser demo backend by default, so it works
 * immediately with no server, no database and no environment variables.
 *
 * To point at a real deployment instead, set VITE_USE_LIVE_API=1 and
 * VITE_API_BASE_URL, and the identical component code will talk to Flask.
 */
const useLiveApi = import.meta.env.VITE_USE_LIVE_API === '1'

const baseURL = useLiveApi
  ? import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
  : '/api'

const client = axios.create({ baseURL })

// A bare axios instance for the refresh call, so it goes through the same
// adapter as everything else in demo mode.
const authClient = axios.create({ baseURL })
if (!useLiveApi) {
  client.defaults.adapter = mockAdapter
  authClient.defaults.adapter = mockAdapter
}

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise = null

// On an expired access token, swap it once for a fresh one and replay the
// original request rather than bouncing the user back to the login screen
// mid-task. A failed refresh clears the session for real.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const isAuthRoute = original?.url?.includes('/auth/')
    if (error.response?.status !== 401 || original?._retry || isAuthRoute) {
      return Promise.reject(error)
    }

    original._retry = true
    const refreshToken = localStorage.getItem('refresh_token')
    if (!refreshToken) {
      return Promise.reject(error)
    }

    try {
      if (!refreshPromise) {
        refreshPromise = authClient.post(
          '/auth/refresh',
          {},
          { headers: { Authorization: `Bearer ${refreshToken}` } }
        )
      }
      const { data } = await refreshPromise
      refreshPromise = null
      localStorage.setItem('access_token', data.access_token)
      original.headers.Authorization = `Bearer ${data.access_token}`
      return client(original)
    } catch (refreshError) {
      refreshPromise = null
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return Promise.reject(refreshError)
    }
  }
)

export default client
