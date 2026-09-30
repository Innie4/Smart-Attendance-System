/**
 * Demo dataset for the frontend-only build.
 *
 * The app ships with placeholder data so it runs with no backend: every screen
 * has something meaningful to show and the whole workflow can be demonstrated
 * (and graded) without a database, a Render service, or a Vercel env var.
 *
 * Shape mirrors the real API responses exactly, so switching back to a live
 * server is a one-line change in src/api/client.js and nothing else has to
 * move.
 *
 * State is persisted to localStorage so records created in the UI survive a
 * refresh. `resetDemoData()` puts the original seed back.
 */

const STORAGE_KEY = 'smart-attendance-demo-db-v1'
export const SESSION_YEAR = '2025/2026'
export const NUC_THRESHOLD = 75

// Deterministic pseudo-random so every reload produces the same vectors and
// the same simulated recognition behaviour.
function makeRng(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

function vector(seed) {
  const rng = makeRng(seed)
  return Array.from({ length: 128 }, () => Number((rng() * 2 - 1).toFixed(6)))
}

function isoDaysAgo(days, hourOffset = 0) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(d.getHours() - hourOffset)
  return d.toISOString()
}

function buildSeed() {
  const departments = [
    { id: 1, name: 'Computer Science', code: 'CSC', created_at: isoDaysAgo(120) },
    { id: 2, name: 'Electrical Engineering', code: 'EEE', created_at: isoDaysAgo(118) },
  ]

  const courses = [
    { id: 1, course_code: 'CSC301', title: 'Operating Systems', unit_load: 3, department_id: 1 },
    { id: 2, course_code: 'CSC305', title: 'Computer Networks', unit_load: 3, department_id: 1 },
    { id: 3, course_code: 'CSC401', title: 'Machine Learning', unit_load: 3, department_id: 1 },
    { id: 4, course_code: 'EEE201', title: 'Circuit Theory', unit_load: 2, department_id: 2 },
  ]

  const users = [
    {
      id: 1,
      email: 'admin@smartattendance.ng',
      password: 'Admin@12345',
      full_name: 'System Administrator',
      role: 'admin',
      is_active: true,
    },
    {
      id: 2,
      email: 'lecturer@smartattendance.ng',
      password: 'Lecturer@12345',
      full_name: 'Dr. Ada Obi',
      role: 'lecturer',
      is_active: true,
    },
    {
      id: 3,
      email: 'lecturer2@smartattendance.ng',
      password: 'Lecturer@12345',
      full_name: 'Dr. Emeka Nwosu',
      role: 'lecturer',
      is_active: true,
    },
  ]

  const lecturers = [
    { id: 1, user_id: 2, staff_id: 'CSC/L/001', department_id: 1 },
    { id: 2, user_id: 3, staff_id: 'CSC/L/002', department_id: 1 },
  ]

  const names = [
    'Amara Okonkwo',
    'Tunde Bakare',
    'Chioma Eze',
    'Ibrahim Musa',
    'Blessing Adeyemi',
    'Segun Oduya',
  ]

  const students = names.map((full_name, index) => {
    const id = index + 1
    return {
      id,
      matric_number: `CSC/20/${1000 + id}`,
      full_name,
      department_id: 1,
      user_id: 100 + id,
      consent_given: true,
      consent_given_at: isoDaysAgo(90),
      has_facial_enrolment: true,
      created_at: isoDaysAgo(100),
    }
  })

  // Portal logins for every seeded student.
  students.forEach((student) => {
    users.push({
      id: student.user_id,
      email: `student${student.id}@smartattendance.ng`,
      password: 'Student@12345',
      full_name: student.full_name,
      role: 'student',
      is_active: true,
    })
  })

  const enrolments = []
  students.forEach((student) => {
    // Student 5 and 6 are enrolled in a second course so the portal shows
    // more than one row and a mix of compliant/at-risk.
    enrolments.push({ id: enrolments.length + 1, student_id: student.id, course_id: 1, session_year: SESSION_YEAR })
  })
  students.slice(0, 4).forEach((student) => {
    enrolments.push({ id: enrolments.length + 1, student_id: student.id, course_id: 2, session_year: SESSION_YEAR })
  })
  // The seeded open session belongs to CSC401, so give it a roster too and the
  // live-attendance walkthrough works straight out of the box.
  students.slice(0, 4).forEach((student) => {
    enrolments.push({ id: enrolments.length + 1, student_id: student.id, course_id: 3, session_year: SESSION_YEAR })
  })

  const facialEnrolments = students.map((student) => ({
    id: student.id,
    student_id: student.id,
    model_version: 'sface-v1',
    enrolled_at: isoDaysAgo(88),
    vector_length: 128,
    has_offline_descriptor: true,
    embedding: vector(1000 + student.id),
    offline_descriptor: vector(5000 + student.id),
  }))

  // Locked sessions with a deliberate attendance spread, plus one open
  // session so Live Attendance has something to attach to.
  const attendanceSessions = []
  const attendanceLogs = []
  const plan = [
    { daysAgo: 21, courseId: 1, present: [1, 2, 3, 4, 5, 6] },
    { daysAgo: 14, courseId: 1, present: [1, 2, 3, 4, 5] },
    { daysAgo: 7, courseId: 1, present: [1, 2, 3, 4] },
    { daysAgo: 4, courseId: 2, present: [1, 2, 4] },
    { daysAgo: 2, courseId: 2, present: [1, 2] },
  ]

  plan.forEach((spec, sIndex) => {
    const id = attendanceSessions.length + 1
    attendanceSessions.push({
      id,
      course_id: spec.courseId,
      lecturer_id: 1,
      start_time: isoDaysAgo(spec.daysAgo, 2),
      end_time: isoDaysAgo(spec.daysAgo, 1),
      is_locked: true,
      present_count: spec.present.length,
    })
    spec.present.forEach((studentId, position) => {
      attendanceLogs.push({
        id: attendanceLogs.length + 1,
        session_id: id,
        student_id: studentId,
        matric_number: students[studentId - 1].matric_number,
        student_name: students[studentId - 1].full_name,
        timestamp: isoDaysAgo(spec.daysAgo, 2),
        confidence_score: Number((0.86 + 0.02 * position).toFixed(4)),
        is_offline_sync: position === 0,
      })
    })
    void sIndex
  })

  // One in-progress session for the live-attendance demo.
  const openId = attendanceSessions.length + 1
  attendanceSessions.push({
    id: openId,
    course_id: 3,
    lecturer_id: 1,
    start_time: new Date().toISOString(),
    end_time: null,
    is_locked: false,
    present_count: 0,
  })

  return {
    version: 1,
    departments,
    courses,
    users,
    lecturers,
    students,
    enrolments,
    facialEnrolments,
    attendanceSessions,
    attendanceLogs,
    counters: {
      department: departments.length,
      course: courses.length,
      user: users.length,
      lecturer: lecturers.length,
      student: students.length,
      enrolment: enrolments.length,
      session: attendanceSessions.length,
      log: attendanceLogs.length,
    },
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

let db = null

function ensureLoaded() {
  if (db) return db
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed && parsed.version === 1) {
        db = parsed
        return db
      }
    }
  } catch {
    // Corrupt or unavailable storage falls through to a fresh seed.
  }
  db = buildSeed()
  persist()
  return db
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Private browsing or a full quota: keep running from memory.
  }
}

export function getDb() {
  return ensureLoaded()
}

export function commit() {
  persist()
  return db
}

export function nextId(kind) {
  const data = ensureLoaded()
  data.counters[kind] = (data.counters[kind] || 0) + 1
  return data.counters[kind]
}

export function resetDemoData() {
  db = buildSeed()
  persist()
  return db
}

export const helpers = { makeRng, vector, isoDaysAgo, clone, SESSION_YEAR, NUC_THRESHOLD }
