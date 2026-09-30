/**
 * Axios adapter that answers requests from the in-browser demo backend.
 *
 * Dropping this in as the instance adapter means every `client.get/post/...`
 * call in the app keeps working unchanged: the components have no idea whether
 * they are talking to Flask or to the local mock.
 */

import { dispatch, HttpError, buildCourseReport } from './handlers.js'
import { buildCsv, buildPdf } from './exports.js'

// Small artificial delay so loading states are actually exercised instead of
// flashing past. Kept short to stay responsive.
const DEFAULT_LATENCY = 140

function parseBody(data) {
  if (!data) return null
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return null
    }
  }
  return data
}

function toAxiosResponse(config, status, data) {
  return {
    data,
    status,
    statusText: status === 204 ? 'No Content' : 'OK',
    headers: { 'content-type': 'application/json' },
    config,
    request: { __demo: true },
  }
}

function toAxiosError(config, httpError) {
  const error = new Error(httpError.body.error || 'Request failed')
  error.config = config
  error.isAxiosError = true
  error.response = toAxiosResponse(config, httpError.status, httpError.body)
  return error
}

const EXPORT_PATTERN = /\/reports\/courses\/(\d+)\/export\.(csv|pdf)$/

function isExportRequest(url) {
  // Match on the pathname only: params are appended as a query string, so
  // anchoring the pattern on the raw URL would never match.
  try {
    return EXPORT_PATTERN.test(new URL(url, 'http://demo.local').pathname)
  } catch {
    return false
  }
}

function buildExportResponse(config, url) {
  const parsed = new URL(url, 'http://demo.local')
  const match = parsed.pathname.match(EXPORT_PATTERN)
  const [, courseId, format] = match
  const sessionYear = parsed.searchParams.get('session_year') || '2025/2026'
  const report = buildCourseReport(Number(courseId), sessionYear)

  const filename = `${report.course.course_code}_${sessionYear}_attendance.${format}`
  const text =
    format === 'csv'
      ? buildCsv(report.course.course_code, report.students, sessionYear)
      : buildPdf(
          report.course.course_code,
          report.course.title,
          report.students,
          report.nuc_threshold,
          sessionYear
        )

  return {
    data: text,
    status: 200,
    statusText: 'OK',
    headers: {
      'content-type': format === 'csv' ? 'text/csv' : 'application/pdf',
      'content-disposition': `attachment; filename="${filename}"`,
    },
    config,
    request: { __demo: true },
  }
}

/**
 * Rebuilds the request URL including `config.params`.
 *
 * Axios only serialises `params` inside its own default adapter, so a custom
 * adapter has to do it itself. Without this every query-string route
 * (?session_year=...) would arrive with its parameters missing.
 */
function withParams(url, params) {
  if (!params || typeof params !== 'object') return url
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    search.append(key, String(value))
  })
  const query = search.toString()
  if (!query) return url
  return url.includes('?') ? `${url}&${query}` : `${url}?${query}`
}

export function mockAdapter(config) {
  const latency = config.__demoLatency ?? DEFAULT_LATENCY

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        const method = config.method || 'get'
        const url = withParams(config.url || '', config.params)

        // Exports are file payloads rather than JSON, so they bypass the JSON
        // route table and are rendered in the browser instead.
        if (isExportRequest(url)) {
          resolve(buildExportResponse(config, url))
          return
        }

        const { status, data } = dispatch({
          method,
          url,
          body: parseBody(config.data),
          headers: config.headers,
        })
        resolve(toAxiosResponse(config, status, data))
      } catch (err) {
        if (err instanceof HttpError) {
          reject(toAxiosError(config, err))
          return
        }
        const wrapped = new Error(err.message || 'Unexpected demo backend error')
        wrapped.config = config
        wrapped.isAxiosError = true
        reject(wrapped)
      }
    }, latency)
  })
}
