/**
 * In-browser stand-in for the Flask API.
 *
 * Every route the frontend can reach is implemented here against the demo
 * dataset, including authentication and the role rules, so the UI behaves
 * exactly as it does against the real server: students are refused staff
 * endpoints, a blink is required before attendance is marked, and duplicate
 * scans are rejected.
 *
 * Responses are shaped identically to the backend's `to_dict()` output.
 */

import { getDb, commit, nextId, SESSION_YEAR, NUC_THRESHOLD } from './data.js'

// ---------------------------------------------------------------- utilities

class HttpError extends Error {
  constructor(status, error, extra = {}) {
    super(error)
    this.status = status
    this.body = { error, ...extra }
  }
}

const bad = (error, extra) => new HttpError(400, error, extra)

function requireFields(payload, fields) {
  const missing = fields.filter((f) => payload[f] === undefined || payload[f] === null || payload[f] === '')
  if (missing.length) throw bad('Missing fields', { fields: missing })
}

function serialiseUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    is_active: user.is_active,
    created_at: user.created_at || new Date().toISOString(),
  }
}

function serialiseStudent(db, student) {
  const account = db.users.find((u) => u.id === student.user_id)
  return {
    id: student.id,
    matric_number: student.matric_number,
    full_name: student.full_name,
    department_id: student.department_id,
    email: account ? account.email : null,
    has_portal_account: Boolean(account),
    consent_given: student.consent_given,
    has_facial_enrolment: student.facial_enrolment,
    created_at: student.created_at,
  }
}

function serialiseSession(session) {
  return {
    id: session.id,
    course_id: session.course_id,
    lecturer_id: session.lecturer_id,
    start_time: session.start_time,
    end_time: session.end_time,
    is_locked: session.is_locked,
    present_count: session.present_count ?? 0,
  }
}

function serialiseEnrolment(db, enrolment) {
  const student = db.students.find((s) => s.id === enrolment.student_id)
  return {
    id: enrolment.id,
    student_id: enrolment.student_id,
    course_id: enrolment.course_id,
    session_year: enrolment.session_year,
    matric_number: student?.matric_number,
    full_name: student?.full_name,
  }
}

function calculatePercentage(attended, held) {
  if (held <= 0) return 0
  return Number(((attended / held) * 100).toFixed(2))
}

/**
 * Compliance report for one course. Shared by the JSON route and the file
 * export path so both always agree.
 */
export function buildCourseReport(courseId, sessionYear) {
  const db = getDb()
  const course = db.courses.find((c) => c.id === courseId)
  if (!course) throw new HttpError(404, 'Resource not found')

  const lockedIds = db.attendanceSessions
    .filter((s) => s.course_id === courseId && s.is_locked)
    .map((s) => s.id)
  const sessionsHeld = lockedIds.length

  const students = db.enrolments
    .filter((e) => e.course_id === courseId && e.session_year === sessionYear)
    .map((e) => db.students.find((s) => s.id === e.student_id))
    .filter(Boolean)

  const rows = students
    .map((student) => {
      const attended = db.attendanceLogs.filter(
        (l) => l.student_id === student.id && lockedIds.includes(l.session_id)
      ).length
      const percentage = calculatePercentage(attended, sessionsHeld)
      return {
        student_id: student.id,
        matric_number: student.matric_number,
        full_name: student.full_name,
        sessions_attended: attended,
        sessions_held: sessionsHeld,
        attendance_percentage: percentage,
        is_compliant: percentage >= NUC_THRESHOLD,
      }
    })
    .sort((a, b) => a.attendance_percentage - b.attendance_percentage)

  return {
    course: {
      id: course.id,
      course_code: course.course_code,
      title: course.title,
      unit_load: course.unit_load,
      department_id: course.department_id,
    },
    session_year: sessionYear,
    nuc_threshold: NUC_THRESHOLD,
    at_risk_count: rows.filter((r) => !r.is_compliant).length,
    students: rows,
  }
}

// ---------------------------------------------------------------- auth state

// Tokens are opaque placeholders, not real JWTs: the app only needs something
// to carry a user id and role between reloads.
function issueToken(user) {
  const payload = btoa(JSON.stringify({ sub: user.id, role: user.role }))
  return `demo.${payload}.${Math.random().toString(36).slice(2)}`
}

function readToken(token) {
  if (!token || !token.startsWith('demo.')) return null
  try {
    const [, payload] = token.split('.')
    return JSON.parse(atob(payload))
  } catch {
    return null
  }
}

function authenticate(headers) {
  const raw = headers?.Authorization || headers?.authorization || ''
  if (!raw) throw new HttpError(401, 'Authorization token required')
  const token = raw.replace(/^Bearer\s+/i, '')
  const claims = readToken(token)
  // Mirrors Flask-JWT-Extended: absent credentials are 401, present-but-bad
  // credentials are 422.
  if (!claims) throw new HttpError(422, 'Invalid or expired token')
  const db = getDb()
  const user = db.users.find((u) => u.id === claims.sub && u.is_active)
  if (!user) throw new HttpError(422, 'Invalid or expired token')
  return user
}

function requireRole(user, ...roles) {
  if (!roles.includes(user.role)) throw new HttpError(403, 'Insufficient permissions')
}

// ------------------------------------------------------------------- routes

const routes = [
  // ------------------------------------------------------------------ auth
  {
    method: 'POST',
    pattern: /^\/auth\/login$/,
    handler: (_m, body) => {
      requireFields(body, ['email', 'password'])
      const db = getDb()
      const user = db.users.find((u) => u.email === String(body.email).toLowerCase().trim())
      if (!user || user.password !== body.password) {
        throw new HttpError(401, 'Invalid email or password')
      }
      if (!user.is_active) throw new HttpError(403, 'Account is deactivated')
      return {
        access_token: issueToken(user),
        refresh_token: issueToken(user),
        user: serialiseUser(user),
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/auth\/me$/,
    auth: true,
    handler: (_m, _b, user) => serialiseUser(user),
  },
  {
    method: 'POST',
    pattern: /^\/auth\/refresh$/,
    auth: true,
    handler: (_m, _b, user) => ({ access_token: issueToken(user) }),
  },

  // ------------------------------------------------------------- departments
  {
    method: 'GET',
    pattern: /^\/admin\/departments$/,
    roles: ['admin', 'lecturer'],
    handler: () => [...getDb().departments].sort((a, b) => a.name.localeCompare(b.name)),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/departments$/,
    roles: ['admin'],
    handler: (_m, body) => {
      requireFields(body, ['name', 'code'])
      const db = getDb()
      const code = String(body.code).trim().toUpperCase()
      if (db.departments.some((d) => d.code === code)) {
        throw new HttpError(409, 'Department code already exists')
      }
      const department = {
        id: nextId('department'),
        name: String(body.name).trim(),
        code,
        created_at: new Date().toISOString(),
      }
      db.departments.push(department)
      commit()
      return department
    },
    status: 201,
  },
  {
    method: 'PUT',
    pattern: /^\/admin\/departments\/(\d+)$/,
    roles: ['admin'],
    handler: (m, body) => {
      const db = getDb()
      const department = db.departments.find((d) => d.id === Number(m[1]))
      if (!department) throw new HttpError(404, 'Resource not found')
      if (body.name !== undefined) department.name = String(body.name).trim()
      if (body.code !== undefined) department.code = String(body.code).trim().toUpperCase()
      commit()
      return department
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/admin\/departments\/(\d+)$/,
    roles: ['admin'],
    handler: (m) => {
      const db = getDb()
      const index = db.departments.findIndex((d) => d.id === Number(m[1]))
      if (index === -1) throw new HttpError(404, 'Resource not found')
      db.departments.splice(index, 1)
      commit()
      return null
    },
    status: 204,
  },

  // ----------------------------------------------------------------- courses
  {
    method: 'GET',
    pattern: /^\/admin\/courses$/,
    roles: ['admin', 'lecturer'],
    handler: () => [...getDb().courses].sort((a, b) => a.course_code.localeCompare(b.course_code)),
  },
  {
    method: 'POST',
    pattern: /^\/admin\/courses$/,
    roles: ['admin'],
    handler: (_m, body) => {
      requireFields(body, ['course_code', 'title', 'department_id'])
      const db = getDb()
      const code = String(body.course_code).trim().toUpperCase()
      if (!db.departments.some((d) => d.id === Number(body.department_id))) {
        throw new HttpError(404, 'Department not found')
      }
      if (db.courses.some((c) => c.course_code === code)) {
        throw new HttpError(409, 'Course code already exists')
      }
      const course = {
        id: nextId('course'),
        course_code: code,
        title: String(body.title).trim(),
        unit_load: Number(body.unit_load) || 0,
        department_id: Number(body.department_id),
      }
      db.courses.push(course)
      commit()
      return course
    },
    status: 201,
  },
  {
    method: 'PUT',
    pattern: /^\/admin\/courses\/(\d+)$/,
    roles: ['admin'],
    handler: (m, body) => {
      const db = getDb()
      const course = db.courses.find((c) => c.id === Number(m[1]))
      if (!course) throw new HttpError(404, 'Resource not found')
      if (body.title !== undefined) course.title = String(body.title).trim()
      if (body.unit_load !== undefined) course.unit_load = Number(body.unit_load)
      if (body.department_id !== undefined) course.department_id = Number(body.department_id)
      commit()
      return course
    },
  },
  {
    method: 'DELETE',
    pattern: /^\/admin\/courses\/(\d+)$/,
    roles: ['admin'],
    handler: (m) => {
      const db = getDb()
      const courseId = Number(m[1])
      const index = db.courses.findIndex((c) => c.id === courseId)
      if (index === -1) throw new HttpError(404, 'Resource not found')
      db.courses.splice(index, 1)
      // Enrolments and sessions attached to the course go with it.
      db.enrolments = db.enrolments.filter((e) => e.course_id !== courseId)
      const orphanSessions = db.attendanceSessions.filter((s) => s.course_id === courseId).map((s) => s.id)
      db.attendanceSessions = db.attendanceSessions.filter((s) => s.course_id !== courseId)
      db.attendanceLogs = db.attendanceLogs.filter((l) => !orphanSessions.includes(l.session_id))
      commit()
      return null
    },
    status: 204,
  },

  // --------------------------------------------------------------- lecturers
  {
    method: 'GET',
    pattern: /^\/admin\/lecturers$/,
    roles: ['admin'],
    handler: () => {
      const db = getDb()
      return db.lecturers.map((l) => {
        const user = db.users.find((u) => u.id === l.user_id)
        return {
          id: l.id,
          staff_id: l.staff_id,
          department_id: l.department_id,
          full_name: user ? user.full_name : null,
          email: user ? user.email : null,
        }
      })
    },
  },
  {
    method: 'POST',
    pattern: /^\/admin\/lecturers$/,
    roles: ['admin'],
    handler: (_m, body) => {
      requireFields(body, ['email', 'password', 'full_name', 'staff_id', 'department_id'])
      const db = getDb()
      const email = String(body.email).toLowerCase().trim()
      if (db.users.some((u) => u.email === email)) throw new HttpError(409, 'Email already registered')
      if (String(body.password).length < 8) {
        throw bad('Password must be at least 8 characters')
      }
      if (!db.departments.some((d) => d.id === Number(body.department_id))) {
        throw new HttpError(404, 'Department not found')
      }
      if (db.lecturers.some((l) => l.staff_id === String(body.staff_id).trim())) {
        throw new HttpError(409, 'Staff ID already exists')
      }
      const user = {
        id: nextId('user'),
        email,
        password: body.password,
        full_name: String(body.full_name).trim(),
        role: 'lecturer',
        is_active: true,
      }
      const lecturer = {
        id: nextId('lecturer'),
        user_id: user.id,
        staff_id: String(body.staff_id).trim(),
        department_id: Number(body.department_id),
      }
      db.users.push(user)
      db.lecturers.push(lecturer)
      commit()
      return {
        id: lecturer.id,
        staff_id: lecturer.staff_id,
        department_id: lecturer.department_id,
        full_name: user.full_name,
        email: user.email,
      }
    },
    status: 201,
  },
  {
    method: 'DELETE',
    pattern: /^\/admin\/lecturers\/(\d+)$/,
    roles: ['admin'],
    handler: (m) => {
      const db = getDb()
      const lecturer = db.lecturers.find((l) => l.id === Number(m[1]))
      if (!lecturer) throw new HttpError(404, 'Resource not found')
      const heldSessions = db.attendanceSessions.filter((s) => s.lecturer_id === lecturer.id)
      if (heldSessions.length) {
        throw new HttpError(
          409,
          'Lecturer has attendance sessions on record and cannot be removed (sessions are kept for audit).'
        )
      }
      db.lecturers = db.lecturers.filter((l) => l.id !== lecturer.id)
      db.users = db.users.filter((u) => u.id !== lecturer.user_id)
      commit()
      return null
    },
    status: 204,
  },

  // ---------------------------------------------------------------- students
  {
    method: 'GET',
    pattern: /^\/admin\/students$/,
    roles: ['admin', 'lecturer'],
    handler: (_m, _b, _u, query) => {
      const db = getDb()
      const departmentId = query.get('department_id')
      return db.students
        .filter((s) => !departmentId || s.department_id === Number(departmentId))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map((s) => serialiseStudent(db, s))
    },
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students$/,
    roles: ['admin'],
    handler: (_m, body) => {
      requireFields(body, ['matric_number', 'full_name', 'department_id'])
      const db = getDb()
      const matric = String(body.matric_number).trim().toUpperCase()
      if (!db.departments.some((d) => d.id === Number(body.department_id))) {
        throw new HttpError(404, 'Department not found')
      }
      if (db.students.some((s) => s.matric_number === matric)) {
        throw new HttpError(409, 'Matric number already exists')
      }
      const student = {
        id: nextId('student'),
        matric_number: matric,
        full_name: String(body.full_name).trim(),
        department_id: Number(body.department_id),
        user_id: null,
        consent_given: false,
        consent_given_at: null,
        facial_enrolment: false,
        created_at: new Date().toISOString(),
      }
      createPortalAccount(db, student, body)
      db.students.push(student)
      commit()
      return serialiseStudent(db, student)
    },
    status: 201,
  },
  {
    method: 'PUT',
    pattern: /^\/admin\/students\/(\d+)$/,
    roles: ['admin'],
    handler: (m, body) => {
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      if (body.full_name !== undefined) {
        student.full_name = String(body.full_name).trim()
        const account = db.users.find((u) => u.id === student.user_id)
        if (account) account.full_name = student.full_name
      }
      if (body.department_id !== undefined) student.department_id = Number(body.department_id)
      commit()
      return serialiseStudent(db, student)
    },
  },
  {
    method: 'POST',
    pattern: /^\/admin\/students\/(\d+)\/account$/,
    roles: ['admin'],
    handler: (m, body) => {
      requireFields(body, ['email', 'password'])
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      if (student.user_id) throw new HttpError(409, 'Student already has a portal account')
      createPortalAccount(db, student, body)
      commit()
      return serialiseStudent(db, student)
    },
    status: 201,
  },
  {
    method: 'DELETE',
    pattern: /^\/admin\/students\/(\d+)$/,
    roles: ['admin'],
    handler: (m) => {
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      db.students = db.students.filter((s) => s.id !== student.id)
      db.users = db.users.filter((u) => u.id !== student.user_id)
      db.enrolments = db.enrolments.filter((e) => e.student_id !== student.id)
      db.facialEnrolments = db.facialEnrolments.filter((f) => f.student_id !== student.id)
      db.attendanceLogs = db.attendanceLogs.filter((l) => l.student_id !== student.id)
      commit()
      return null
    },
    status: 204,
  },

  // -------------------------------------------------------------- enrolments
  {
    method: 'GET',
    pattern: /^\/admin\/enrolments$/,
    roles: ['admin', 'lecturer'],
    handler: (_m, _b, _u, query) => {
      const db = getDb()
      const courseId = query.get('course_id')
      return db.enrolments
        .filter((e) => !courseId || e.course_id === Number(courseId))
        .map((e) => serialiseEnrolment(db, e))
    },
  },
  {
    method: 'POST',
    pattern: /^\/admin\/enrolments$/,
    roles: ['admin'],
    handler: (_m, body) => {
      requireFields(body, ['student_id', 'course_id', 'session_year'])
      const db = getDb()
      const studentId = Number(body.student_id)
      const courseId = Number(body.course_id)
      if (!db.students.some((s) => s.id === studentId)) throw new HttpError(404, 'Student not found')
      if (!db.courses.some((c) => c.id === courseId)) throw new HttpError(404, 'Course not found')
      if (
        db.enrolments.some(
          (e) =>
            e.student_id === studentId &&
            e.course_id === courseId &&
            e.session_year === body.session_year
        )
      ) {
        throw new HttpError(409, 'Student already enrolled for this session')
      }
      const enrolment = {
        id: nextId('enrolment'),
        student_id: studentId,
        course_id: courseId,
        session_year: body.session_year,
      }
      db.enrolments.push(enrolment)
      commit()
      return serialiseEnrolment(db, enrolment)
    },
    status: 201,
  },
  {
    method: 'DELETE',
    pattern: /^\/admin\/enrolments\/(\d+)$/,
    roles: ['admin'],
    handler: (m) => {
      const db = getDb()
      const id = Number(m[1])
      if (!db.enrolments.some((e) => e.id === id)) throw new HttpError(404, 'Resource not found')
      db.enrolments = db.enrolments.filter((e) => e.id !== id)
      commit()
      return null
    },
    status: 204,
  },

  // ------------------------------------------------------ facial enrolment
  {
    method: 'GET',
    pattern: /^\/facial-enrolment\/(\d+)$/,
    roles: ['admin', 'lecturer'],
    handler: (m) => {
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      const enrolment = db.facialEnrolments.find((f) => f.student_id === student.id)
      return {
        student_id: student.id,
        consent_given: student.consent_given,
        enrolled: Boolean(enrolment),
        enrolment: enrolment
          ? {
              id: enrolment.id,
              student_id: enrolment.student_id,
              model_version: enrolment.model_version,
              enrolled_at: enrolment.enrolled_at,
              vector_length: enrolment.vector_length,
              has_offline_descriptor: enrolment.has_offline_descriptor,
            }
          : null,
      }
    },
  },
  {
    method: 'POST',
    pattern: /^\/facial-enrolment\/(\d+)$/,
    roles: ['admin', 'lecturer'],
    handler: (m, body) => {
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      if (!body.consent_given) {
        throw bad(
          'NDPA 2023 requires recorded student consent before biometric enrolment. Set consent_given: true after the student has accepted the consent notice.'
        )
      }
      const frames = body.frames
      if (!Array.isArray(frames) || frames.length < 3) {
        throw bad('At least 3 multi-angle frames are required')
      }
      if (!student.consent_given) {
        student.consent_given = true
        student.consent_given_at = new Date().toISOString()
      }
      let enrolment = db.facialEnrolments.find((f) => f.student_id === student.id)
      if (!enrolment) {
        enrolment = {
          id: nextId('enrolment'),
          student_id: student.id,
          model_version: 'sface-v1',
          enrolled_at: new Date().toISOString(),
          vector_length: 128,
          has_offline_descriptor: false,
          embedding: Array.from({ length: 128 }, () => Number((Math.random() * 2 - 1).toFixed(6))),
          offline_descriptor: null,
        }
        db.facialEnrolments.push(enrolment)
      }
      if (body.offline_descriptor) enrolment.has_offline_descriptor = true
      student.facial_enrolment = true
      commit()
      return {
        id: enrolment.id,
        student_id: enrolment.student_id,
        model_version: enrolment.model_version,
        enrolled_at: enrolment.enrolled_at,
        vector_length: 128,
        has_offline_descriptor: enrolment.has_offline_descriptor,
      }
    },
    status: 201,
  },
  {
    method: 'DELETE',
    pattern: /^\/facial-enrolment\/(\d+)$/,
    roles: ['admin', 'lecturer'],
    handler: (m) => {
      const db = getDb()
      const student = db.students.find((s) => s.id === Number(m[1]))
      if (!student) throw new HttpError(404, 'Resource not found')
      db.facialEnrolments = db.facialEnrolments.filter((f) => f.student_id !== student.id)
      student.facial_enrolment = false
      commit()
      return null
    },
    status: 204,
  },

  // --------------------------------------------------------------- sessions
  {
    method: 'POST',
    pattern: /^\/attendance\/sessions$/,
    roles: ['admin', 'lecturer'],
    handler: (m, body) => {
      requireFields(body, ['course_id'])
      const db = getDb()
      const courseId = Number(body.course_id)
      if (!db.courses.some((c) => c.id === courseId)) throw new HttpError(404, 'Course not found')
      const lecturer =
        (body.lecturer_id && db.lecturers.find((l) => l.id === Number(body.lecturer_id))) ||
        db.lecturers[0]
      if (!lecturer) throw bad('No lecturer profile exists yet')
      const existing = db.attendanceSessions.find(
        (s) => s.course_id === courseId && s.lecturer_id === lecturer.id && !s.is_locked
      )
      if (existing) return serialiseSession(existing)
      const session = {
        id: nextId('session'),
        course_id: courseId,
        lecturer_id: lecturer.id,
        start_time: new Date().toISOString(),
        end_time: null,
        is_locked: false,
        present_count: 0,
      }
      db.attendanceSessions.push(session)
      commit()
      return serialiseSession(session)
    },
    status: 201,
  },
  {
    method: 'GET',
    pattern: /^\/attendance\/sessions\/(\d+)$/,
    roles: ['admin', 'lecturer'],
    handler: (m) => {
      const db = getDb()
      const session = db.attendanceSessions.find((s) => s.id === Number(m[1]))
      if (!session) throw new HttpError(404, 'Resource not found')
      return serialiseSession(session)
    },
  },
  {
    method: 'POST',
    pattern: /^\/attendance\/sessions\/(\d+)\/close$/,
    roles: ['admin', 'lecturer'],
    handler: (m) => {
      const db = getDb()
      const session = db.attendanceSessions.find((s) => s.id === Number(m[1]))
      if (!session) throw new HttpError(404, 'Resource not found')
      session.is_locked = true
      session.end_time = new Date().toISOString()
      commit()
      return serialiseSession(session)
    },
  },
  {
    method: 'GET',
    pattern: /^\/attendance\/sessions\/(\d+)\/logs$/,
    roles: ['admin', 'lecturer'],
    handler: (m) => {
      const db = getDb()
      if (!db.attendanceSessions.some((s) => s.id === Number(m[1]))) {
        throw new HttpError(404, 'Resource not found')
      }
      return db.attendanceLogs
        .filter((l) => l.session_id === Number(m[1]))
        .map((l) => ({ ...l }))
    },
  },
  {
    method: 'GET',
    pattern: /^\/attendance\/sessions\/(\d+)\/roster-cache$/,
    roles: ['admin', 'lecturer'],
    handler: (m, _b, _u, query) => {
      const db = getDb()
      const session = db.attendanceSessions.find((s) => s.id === Number(m[1]))
      if (!session) throw new HttpError(404, 'Resource not found')
      const sessionYear = query.get('session_year')
      if (!sessionYear) throw bad('session_year query parameter is required')
      return db.enrolments
        .filter(
          (e) => e.course_id === session.course_id && e.session_year === sessionYear
        )
        .map((e) => {
          const student = db.students.find((s) => s.id === e.student_id)
          const enrolment = db.facialEnrolments.find((f) => f.student_id === e.student_id)
          if (!student || !enrolment) return null
          return {
            student_id: student.id,
            matric_number: student.matric_number,
            full_name: student.full_name,
            offline_descriptor: enrolment.offline_descriptor,
          }
        })
        .filter(Boolean)
    },
  },
  {
    method: 'POST',
    pattern: /^\/attendance\/sessions\/(\d+)\/recognize$/,
    roles: ['admin', 'lecturer'],
    handler: (m, body) => {
      requireFields(body, ['frame', 'session_year'])
      const db = getDb()
      const session = db.attendanceSessions.find((s) => s.id === Number(m[1]))
      if (!session) throw new HttpError(404, 'Resource not found')
      if (session.is_locked) throw new HttpError(409, 'Session is closed')

      const roster = db.enrolments
        .filter((e) => e.course_id === session.course_id && e.session_year === body.session_year)
        .map((e) => db.students.find((s) => s.id === e.student_id))
        .filter(Boolean)

      if (roster.length === 0) return { status: 'no_match' }

      // Blink liveness, mirroring the server rule: a blink counts once the EAR
      // has stayed under the threshold and then recovers, or when the client
      // reports a blink it already counted for this session.
      const earThreshold = 0.21
      const earSequence = Array.isArray(body.ear_sequence) ? body.ear_sequence : []
      const reported = Number(body.blink_count) || 0
      let below = 0
      let sawBlink = false
      for (const reading of earSequence) {
        const avg = ((reading.left ?? 1) + (reading.right ?? 1)) / 2
        if (avg < earThreshold) {
          below += 1
        } else {
          if (below >= 2) sawBlink = true
          below = 0
        }
      }
      const live = reported > 0 || sawBlink
      if (!live) return { status: 'liveness_check_failed', student_id: null, reason: 'blink' }

      // Deterministic pick from the roster so repeated scans walk through the
      // class instead of always returning the first student.
      const already = db.attendanceLogs
        .filter((l) => l.session_id === session.id)
        .map((l) => l.student_id)
      const remaining = roster.filter((s) => !already.includes(s.id))
      const target = remaining.length ? remaining[0] : roster[0]

      const existing = db.attendanceLogs.find(
        (l) => l.session_id === session.id && l.student_id === target.id
      )
      if (existing) return { status: 'already_marked', student_id: target.id }

      const confidence = Number((0.9 + Math.random() * 0.09).toFixed(4))
      const log = {
        id: nextId('log'),
        session_id: session.id,
        student_id: target.id,
        matric_number: target.matric_number,
        student_name: target.full_name,
        timestamp: new Date().toISOString(),
        confidence_score: confidence,
        is_offline_sync: false,
      }
      db.attendanceLogs.push(log)
      session.present_count = (session.present_count || 0) + 1
      commit()
      return { status: 'marked_present', log: { ...log } }
    },
    status: 201,
  },

  // ------------------------------------------------------------------- sync
  {
    method: 'POST',
    pattern: /^\/sync\/attendance$/,
    roles: ['admin', 'lecturer'],
    handler: (_m, body) => {
      const records = body.records
      if (!Array.isArray(records) || records.length === 0) {
        throw bad('records must be a non-empty list')
      }
      const db = getDb()
      const accepted = []
      const skipped = []
      const errors = []

      records.forEach((record, index) => {
        const missing = ['session_id', 'student_id', 'confidence_score', 'captured_at'].filter(
          (f) => record[f] === undefined || record[f] === null || record[f] === ''
        )
        if (missing.length) {
          errors.push({ index, error: 'Missing fields', fields: missing })
          return
        }
        const session = db.attendanceSessions.find((s) => s.id === Number(record.session_id))
        if (!session) {
          errors.push({ index, error: 'Session not found' })
          return
        }
        if (session.is_locked) {
          skipped.push({ index, reason: 'session_locked' })
          return
        }
        const student = db.students.find((s) => s.id === Number(record.student_id))
        if (!student) {
          errors.push({ index, error: 'Student not found' })
          return
        }
        if (
          db.attendanceLogs.some(
            (l) => l.session_id === session.id && l.student_id === student.id
          )
        ) {
          skipped.push({ index, reason: 'already_marked' })
          return
        }
        const parsed = new Date(record.captured_at)
        if (Number.isNaN(parsed.getTime())) {
          errors.push({ index, error: 'captured_at must be ISO 8601' })
          return
        }
        const log = {
          id: nextId('log'),
          session_id: session.id,
          student_id: student.id,
          matric_number: student.matric_number,
          student_name: student.full_name,
          timestamp: parsed.toISOString(),
          confidence_score: Number(record.confidence_score),
          is_offline_sync: true,
        }
        db.attendanceLogs.push(log)
        session.present_count = (session.present_count || 0) + 1
        accepted.push(index)
      })

      commit()
      return {
        accepted_count: accepted.length,
        skipped_count: skipped.length,
        error_count: errors.length,
        skipped,
        errors,
      }
    },
  },

  // ---------------------------------------------------------------- reports
  {
    method: 'GET',
    pattern: /^\/reports\/courses\/(\d+)$/,
    roles: ['admin', 'lecturer'],
    handler: (m, _b, _u, query) => {
      const sessionYear = query.get('session_year')
      if (!sessionYear) throw bad('session_year query parameter is required')
      return buildCourseReport(Number(m[1]), sessionYear)
    },
  },

  // ---------------------------------------------------------- student portal
  {
    method: 'GET',
    pattern: /^\/student\/me$/,
    roles: ['student'],
    handler: (_m, _b, user) => {
      const db = getDb()
      const student = db.students.find((s) => s.user_id === user.id)
      if (!student) throw new HttpError(404, 'No student record is linked to this account')
      const department = db.departments.find((d) => d.id === student.department_id)
      return {
        id: student.id,
        full_name: student.full_name,
        matric_number: student.matric_number,
        department: department ? department.name : null,
        consent_given: student.consent_given,
        has_facial_enrolment: student.facial_enrolment,
      }
    },
  },
  {
    method: 'GET',
    pattern: /^\/student\/attendance$/,
    roles: ['student'],
    handler: (_m, _b, user) => {
      const db = getDb()
      const student = db.students.find((s) => s.user_id === user.id)
      if (!student) throw new HttpError(404, 'No student record is linked to this account')

      const courses = db.enrolments
        .filter((e) => e.student_id === student.id && e.session_year === SESSION_YEAR)
        .map((e) => {
          const course = db.courses.find((c) => c.id === e.course_id)
          const locked = db.attendanceSessions.filter(
            (s) => s.course_id === e.course_id && s.is_locked
          )
          const attended = db.attendanceLogs.filter(
            (l) => l.student_id === student.id && locked.some((s) => s.id === l.session_id)
          ).length
          const percentage = calculatePercentage(attended, locked.length)
          return {
            course_id: course.id,
            course_code: course.course_code,
            title: course.title,
            unit_load: course.unit_load,
            sessions_attended: attended,
            sessions_held: locked.length,
            attendance_percentage: percentage,
            is_compliant: percentage >= NUC_THRESHOLD,
          }
        })
        .sort((a, b) => a.course_code.localeCompare(b.course_code))

      const graded = courses.filter((c) => c.sessions_held > 0)
      const atRisk = graded.filter((c) => !c.is_compliant)
      return {
        session_year: SESSION_YEAR,
        nuc_threshold: NUC_THRESHOLD,
        courses,
        summary: {
          courses_enrolled: courses.length,
          courses_graded: graded.length,
          at_risk_count: atRisk.length,
          is_eligible_for_exams: graded.length > 0 && atRisk.length === 0,
          average_percentage: graded.length
            ? Number(
                (graded.reduce((sum, c) => sum + c.attendance_percentage, 0) / graded.length).toFixed(2)
              )
            : 0,
        },
      }
    },
  },
]

function createPortalAccount(db, student, body) {
  const email = String(body.email || '').toLowerCase().trim()
  const password = body.password
  if (!email && !password) return
  if (!email || !password) throw bad('Provide both email and password to create a portal account')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw bad('Invalid email address')
  if (String(password).length < 8) throw bad('Password must be at least 8 characters')
  if (db.users.some((u) => u.email === email)) throw new HttpError(409, 'Email already registered')

  const user = {
    id: nextId('user'),
    email,
    password,
    full_name: student.full_name,
    role: 'student',
    is_active: true,
  }
  db.users.push(user)
  student.user_id = user.id
}

// ------------------------------------------------------------------ dispatch

/**
 * Routes a request the way the Flask API would.
 * Throws HttpError on failure so the adapter can shape a proper axios error.
 */
export function dispatch({ method, url, body, headers }) {
  const parsed = new URL(url, 'http://demo.local')
  const path = parsed.pathname
  const query = new URLSearchParams(parsed.search)
  const verb = method.toUpperCase()

  let matchedPath = false
  for (const route of routes) {
    const m = path.match(route.pattern)
    if (!m) continue
    matchedPath = true
    if (route.method !== verb) continue

    let user = null
    if (route.auth || route.roles) {
      user = authenticate(headers)
      if (route.roles) requireRole(user, ...route.roles)
    }
    const data = route.handler(m, body || {}, user, query)
    return { status: route.status || 200, data }
  }

  if (matchedPath) throw new HttpError(405, 'Method not allowed')
  throw new HttpError(404, 'Resource not found')
}

export { HttpError }
