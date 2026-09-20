-- Development seed data. Run after schema.sql on a fresh database.
-- The admin password below is "Admin@12345" (bcrypt hash generated at seed time
-- by backend/app/cli.py -- do not rely on this literal hash in production).

INSERT INTO departments (name, code) VALUES
    ('Computer Science', 'CSC'),
    ('Electrical Engineering', 'EEE'),
    ('Mass Communication', 'MAC');

INSERT INTO courses (course_code, title, unit_load, department_id) VALUES
    ('CSC301', 'Operating Systems', 3, 1),
    ('CSC305', 'Software Engineering', 3, 1),
    ('EEE302', 'Digital Signal Processing', 3, 2),
    ('MAC201', 'Broadcast Journalism', 2, 3);

-- Users, lecturers, students, enrolments, and the bcrypt-hashed admin
-- credential are created via `flask seed` (backend/app/cli.py) so that
-- password hashing always uses the application's configured work factor
-- instead of a hash frozen into this file.
