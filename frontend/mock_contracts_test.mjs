/**
 * Exercises the in-browser demo backend directly, with a localStorage stub,
 * so the attendance contract can be verified without a browser.
 */
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
globalThis.btoa = (s) => Buffer.from(s, 'binary').toString('base64')
globalThis.atob = (s) => Buffer.from(s, 'base64').toString('binary')

const { dispatch, HttpError } = await import('./src/mock/handlers.js')
const { resetDemoData } = await import('./src/mock/data.js')
const { buildCsv, buildPdf } = await import('./src/mock/exports.js')

const results = []
function check(name, pass, detail = '') {
  results.push({ name, pass })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? ' :: ' + detail : ''}`)
}

function call(method, url, { body, token } = {}) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const result = dispatch({ method, url, body, headers })
    return { status: result.status, data: result.data }
  } catch (err) {
    if (err instanceof HttpError) return { status: err.status, data: err.body }
    throw err
  }
}

const asRole = (email, password) =>
  call('POST', '/auth/login', { body: { email, password } }).data.access_token

resetDemoData()

const admin = asRole('admin@smartattendance.ng', 'Admin@12345')
const lecturer = asRole('lecturer@smartattendance.ng', 'Lecturer@12345')
const student1 = asRole('student1@smartattendance.ng', 'Student@12345')
const student6 = asRole('student6@smartattendance.ng', 'Student@12345')
check('demo logins issue tokens', Boolean(admin && lecturer && student1 && student6))

// ------------------------------------------------------------ authz rules
check('no token -> 401', call('GET', '/admin/students').status === 401)
check('student blocked from cohort', call('GET', '/admin/students', { token: student1 }).status === 403)
check('student blocked from opening sessions',
  call('POST', '/attendance/sessions', { token: student1, body: { course_id: 1 } }).status === 403)
check('lecturer blocked from admin mutations',
  call('POST', '/admin/departments', { token: lecturer, body: { name: 'X', code: 'XXX' } }).status === 403)
check('staff blocked from student portal',
  call('GET', '/student/attendance', { token: lecturer }).status === 403)
check('lecturer can list courses', call('GET', '/admin/courses', { token: lecturer }).status === 200)

// --------------------------------------------------- attendance contract
const session = call('POST', '/attendance/sessions', {
  token: lecturer,
  body: { course_id: 3, lecturer_id: 1 },
})
check('session opens', [200, 201].includes(session.status), String(session.status))
const sid = session.data.id
check('seeded open session has a roster',
  call('GET', `/attendance/sessions/${sid}/roster-cache?session_year=2025/2026`, { token: lecturer }).data.length > 0)

const FRAME = 'data:image/jpeg;base64,AAAA'
const OPEN = { left: 0.3, right: 0.3 }
const SHUT = { left: 0.05, right: 0.05 }
const BLINK = [OPEN, OPEN, OPEN, SHUT, SHUT, SHUT, OPEN, OPEN]
const FLAT = Array.from({ length: 40 }, () => OPEN)

const noBlink = call('POST', `/attendance/sessions/${sid}/recognize`, {
  token: lecturer, body: { frame: FRAME, session_year: '2025/2026', ear_sequence: FLAT, blink_count: 0 },
})
check('no blink -> liveness refused', noBlink.data.status === 'liveness_check_failed', noBlink.data.status)

const marked = call('POST', `/attendance/sessions/${sid}/recognize`, {
  token: lecturer, body: { frame: FRAME, session_year: '2025/2026', ear_sequence: BLINK, blink_count: 0 },
})
check('blink in window -> marked present', marked.data.status === 'marked_present', marked.data.status)
check('mark names the student', Boolean(marked.data.log?.student_name), marked.data.log?.student_name)
check('mark carries a confidence', marked.data.log?.confidence_score > 0, String(marked.data.log?.confidence_score))

// The demo recogniser walks the roster, standing in for a real 1:1 match.
// Once the class is exhausted it reports the duplicate, as the API does.
let scans = 0
let duplicateSeen = null
while (scans < 12) {
  const r = call('POST', `/attendance/sessions/${sid}/recognize`, {
    token: lecturer,
    body: { frame: FRAME, session_year: '2025/2026', ear_sequence: BLINK, blink_count: 1 },
  })
  scans++
  if (r.data.status === 'already_marked') {
    duplicateSeen = r.data.status
    break
  }
}
check('repeat scan -> already_marked', duplicateSeen === 'already_marked', `${duplicateSeen} after ${scans} scans`)

const logs = call('GET', `/attendance/sessions/${sid}/logs`, { token: lecturer }).data
check('each student marked at most once',
  new Set(logs.map((l) => l.student_id)).size === logs.length, `${logs.length} logs`)

const roster = call('GET', `/attendance/sessions/${sid}/roster-cache?session_year=2025/2026`, {
  token: lecturer,
})
check('roster cache returns the cohort', roster.data.length > 0, `${roster.data.length} students`)
check('roster carries 128D offline descriptors',
  roster.data.every((r) => (r.offline_descriptor || []).length === 128))

// Offline sync: a second session whose roster nobody has been scanned from yet,
// standing in for a device that buffered attendance while the network was down.
const offlineSession = call('POST', '/attendance/sessions', {
  token: lecturer, body: { course_id: 1, lecturer_id: 1 },
})
const offlineRoster = call(
  'GET',
  `/attendance/sessions/${offlineSession.data.id}/roster-cache?session_year=2025/2026`,
  { token: lecturer }
)
const sync = call('POST', '/sync/attendance', {
  token: lecturer,
  body: {
    records: [
      { session_id: offlineSession.data.id, student_id: offlineRoster.data[0].student_id, confidence_score: 0.93, captured_at: new Date().toISOString() },
    ],
  },
})
check('offline sync accepts a tick', sync.data.accepted_count === 1, JSON.stringify(sync.data))
const replay = call('POST', '/sync/attendance', {
  token: lecturer,
  body: {
    records: [
      { session_id: offlineSession.data.id, student_id: offlineRoster.data[0].student_id, confidence_score: 0.93, captured_at: new Date().toISOString() },
    ],
  },
})
check('replayed offline tick is skipped, not duplicated', replay.data.skipped_count === 1, JSON.stringify(replay.data))

const emptySync = call('POST', '/sync/attendance', { token: lecturer, body: { records: [] } })
check('empty sync batch rejected', emptySync.status === 400, String(emptySync.status))

const closed = call('POST', `/attendance/sessions/${sid}/close`, { token: lecturer })
check('session locks on close', closed.data.is_locked === true)
const afterClose = call('POST', `/attendance/sessions/${sid}/recognize`, {
  token: lecturer, body: { frame: FRAME, session_year: '2025/2026', ear_sequence: BLINK, blink_count: 1 },
})
check('locked session refuses scans', afterClose.status === 409, String(afterClose.status))

// ------------------------------------------------------------- reporting
const report = call('GET', '/reports/courses/1?session_year=2025/2026', { token: lecturer })
check('report lists enrolled students', report.data.students.length === 6, `${report.data.students.length} rows`)
check('report exposes the 75% threshold', report.data.nuc_threshold === 75, String(report.data.nuc_threshold))
check('report flags at-risk students', report.data.at_risk_count > 0, `${report.data.at_risk_count} at risk`)
check('report rows carry percentages',
  report.data.students.every((r) => typeof r.attendance_percentage === 'number'))

// --------------------------------------------------------------- exports
const csv = buildCsv('CSC301', report.data.students, '2025/2026')
check('CSV has a header row', csv.startsWith('Matric Number'), csv.split('\n')[0])
check('CSV has one line per student', csv.split('\n').length >= 7, `${csv.split('\n').length} lines`)
const pdf = buildPdf('CSC301', 'Operating Systems', report.data.students, 75, '2025/2026')
check('PDF is a valid document', pdf.startsWith('%PDF-1.4'), pdf.slice(0, 8))
check('PDF is properly terminated', pdf.trimEnd().endsWith('%%EOF'))
check('PDF has a cross-reference table', pdf.includes('\nxref\n'))

// --------------------------------------------------------- student portal
const portal = call('GET', '/student/attendance', { token: student1 })
check('student portal returns their courses', portal.data.courses.length === 3, `${portal.data.courses.length} courses`)
check('portal marks an eligible student', portal.data.summary.is_eligible_for_exams === true,
  JSON.stringify(portal.data.summary))
const portal6 = call('GET', '/student/attendance', { token: student6 })
check('a different student sees different numbers',
  portal6.data.summary.average_percentage !== portal.data.summary.average_percentage,
  `${portal.data.summary.average_percentage} vs ${portal6.data.summary.average_percentage}`)
check('at-risk student is flagged',
  portal6.data.summary.is_eligible_for_exams === false || portal6.data.courses.some((c) => !c.is_compliant))
check('portal never exposes raw student ids',
  !JSON.stringify(portal.data).includes('student_id'))

// ----------------------------------------------------------- management
const created = call('POST', '/admin/departments', {
  token: admin, body: { name: 'Marine Sciences', code: 'msc' },
})
check('department created', created.status === 201 && created.data.code === 'MSC', created.data.code)
const dupCode = call('POST', '/admin/departments', {
  token: admin, body: { name: 'Marine Sciences Two', code: 'MSC' },
})
check('duplicate department code conflicts', dupCode.status === 409, String(dupCode.status))

const newStudent = call('POST', '/admin/students', {
  token: admin,
  body: { matric_number: 'csc/20/9001', full_name: 'Test Student', department_id: 1, email: 'new@x.com', password: 'Password@1' },
})
check('student created with portal account', newStudent.data.has_portal_account === true)
const newToken = asRole('new@x.com', 'Password@1')
check('the new portal account can sign in', Boolean(newToken))
const halfAccount = call('POST', '/admin/students', {
  token: admin, body: { matric_number: 'CSC/20/9002', full_name: 'Half', department_id: 1, email: 'h@x.com' },
})
check('half-specified account rejected', halfAccount.status === 400, String(halfAccount.status))

// facial enrolment honours the NDPA consent gate
const noConsent = call('POST', '/facial-enrolment/1', { token: lecturer, body: { frames: ['a', 'b', 'c'] } })
check('enrolment without consent refused', noConsent.status === 400, String(noConsent.status))
const tooFewFrames = call('POST', '/facial-enrolment/1', {
  token: lecturer, body: { consent_given: true, frames: ['a'] },
})
check('enrolment needs 3+ frames', tooFewFrames.status === 400, String(tooFewFrames.status))
const revoked = call('DELETE', '/facial-enrolment/1', { token: lecturer })
check('enrolment can be revoked', revoked.status === 204, String(revoked.status))
const afterRevoke = call('GET', '/facial-enrolment/1', { token: lecturer })
check('revoked enrolment is gone', afterRevoke.data.enrolled === false)

// delete cascade + lecturer audit guard
const studentDelete = call('DELETE', `/admin/students/${newStudent.data.id}`, { token: admin })
check('student deleted', studentDelete.status === 204, String(studentDelete.status))
check('deleted portal account cannot sign in', call('POST', '/auth/login', { body: { email: 'new@x.com', password: 'Password@1' } }).status === 401)

const lecturerWithSessions = call('GET', '/admin/lecturers', { token: admin }).data[0]
const guarded = call('DELETE', `/admin/lecturers/${lecturerWithSessions.id}`, { token: admin })
check('lecturer with sessions cannot be deleted', guarded.status === 409, String(guarded.status))

// -------------------------------------------------------- persistence
const beforeReload = call('GET', '/admin/departments', { token: admin }).data.length
resetDemoData()
const afterReset = call('GET', '/admin/departments', { token: admin }).data.length
check('reset restores the seed', afterReset === 2 && beforeReload === 3, `${beforeReload} -> ${afterReset}`)

const failed = results.filter((r) => !r.pass)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) {
  console.log('FAILED:\n - ' + failed.map((f) => f.name).join('\n - '))
  process.exit(1)
}
