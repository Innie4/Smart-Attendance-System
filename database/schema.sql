-- Smart Attendance Management System
-- Core schema. Portable across SQLite, PostgreSQL, and MySQL with minor type
-- adjustments (SERIAL vs INTEGER PRIMARY KEY AUTOINCREMENT are handled by the
-- SQLAlchemy models in backend/app/models; this file documents the canonical
-- shape and is used for direct DB bootstrap / review outside the ORM).

CREATE TABLE departments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        VARCHAR(120) NOT NULL UNIQUE,
    code        VARCHAR(20)  NOT NULL UNIQUE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    email          VARCHAR(180) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role           VARCHAR(20)  NOT NULL CHECK (role IN ('admin', 'lecturer')),
    full_name      VARCHAR(150) NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT 1,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lecturers (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    staff_id       VARCHAR(40) NOT NULL UNIQUE,
    department_id  INTEGER NOT NULL REFERENCES departments(id)
);

CREATE TABLE students (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    matric_number   VARCHAR(40) NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    department_id   INTEGER NOT NULL REFERENCES departments(id),
    consent_given   BOOLEAN NOT NULL DEFAULT 0,
    consent_given_at TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code    VARCHAR(20) NOT NULL UNIQUE,
    title          VARCHAR(200) NOT NULL,
    unit_load      INTEGER NOT NULL DEFAULT 0,
    department_id  INTEGER NOT NULL REFERENCES departments(id)
);

CREATE TABLE course_enrolments (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id    INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session_year  VARCHAR(9) NOT NULL,
    UNIQUE (student_id, course_id, session_year)
);

-- Stores only the numerical embedding vector, never the source photo, per
-- NDPA 2023 data-minimisation requirements for biometric data.
CREATE TABLE facial_enrolments (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id        INTEGER NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
    embedding_vector  TEXT NOT NULL, -- JSON-encoded float array (128D)
    model_version     VARCHAR(40) NOT NULL DEFAULT 'sface-v1',
    -- Optional face-api.js descriptor (JSON float array) used only for the
    -- client-side offline recognition fallback; a separate embedding space
    -- from embedding_vector above.
    offline_descriptor TEXT,
    enrolled_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendance_sessions (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id    INTEGER NOT NULL REFERENCES courses(id),
    lecturer_id  INTEGER NOT NULL REFERENCES lecturers(id),
    start_time   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time     TIMESTAMP,
    is_locked    BOOLEAN NOT NULL DEFAULT 0
);

CREATE TABLE attendance_logs (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id        INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id        INTEGER NOT NULL REFERENCES students(id),
    timestamp         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confidence_score  FLOAT NOT NULL,
    is_offline_sync   BOOLEAN NOT NULL DEFAULT 0,
    UNIQUE (session_id, student_id)
);

CREATE INDEX idx_students_department ON students(department_id);
CREATE INDEX idx_courses_department ON courses(department_id);
CREATE INDEX idx_enrolments_course ON course_enrolments(course_id);
CREATE INDEX idx_sessions_course ON attendance_sessions(course_id);
CREATE INDEX idx_logs_session ON attendance_logs(session_id);
CREATE INDEX idx_logs_student ON attendance_logs(student_id);
