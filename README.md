# Smart Attendance Management System

Facial recognition attendance platform built for NUC 75% attendance compliance
reporting and NDPA 2023 biometric privacy standards. Full stack: Flask REST
API, React SPA, and a relational schema shared by both.

## Stack

- **Backend**: Flask, SQLAlchemy, Flask-JWT-Extended, OpenCV DNN (YuNet
  detector, SFace recognizer), ReportLab, Pandas, pytest.
- **Frontend**: React, Vite, Tailwind CSS, face-api.js (client-side liveness
  and offline recognition fallback), Recharts, IndexedDB offline queue.
- **Database**: SQLite by default, PostgreSQL/MySQL supported via
  `DATABASE_URL`.

## Project layout

```
backend/     Flask API, services, models, tests
frontend/    React SPA (Vite)
database/    Raw SQL schema and seed reference
.env.example Environment variable template
```

## Backend setup

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate   # .venv\Scripts\activate on native Windows shells
pip install -r requirements.txt
python download_models.py       # fetches YuNet/SFace ONNX weights
flask --app wsgi seed           # creates dev data and an admin account
flask --app wsgi run
```

Default seeded admin login: `admin@smartattendance.ng` / `Admin@12345`.
Change this password before any non-local deployment.

Run the test suite:

```bash
pytest
```

## Frontend setup

The frontend runs **standalone by default**. It ships with an in-browser demo
backend (`src/mock/`) so the whole app — every screen, role and report — works
with no server, no database and no environment variables.

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
npm test           # contract tests for the demo backend (no browser needed)
```

Sign in with any of the seeded accounts (one tap on the login screen fills the
form):

| Role         | Email                        | Password       |
| ------------ | ---------------------------- | -------------- |
| Administrator| `admin@smartattendance.ng`   | `Admin@12345`  |
| Lecturer     | `lecturer@smartattendance.ng`| `Lecturer@12345` |
| Student      | `student1@smartattendance.ng`| `Student@12345` (also `student2`…`student6`) |

Data you create is kept in the browser's localStorage so a refresh doesn't lose
it. "Reset sample data" on the login screen restores the original seed.

To point the same UI at the real Flask API instead, set
`VITE_USE_LIVE_API=1` and `VITE_API_BASE_URL` before building. No component
changes are needed.

## Environment variables

Copy `.env.example` to `.env` and fill in real values before deploying. See
that file for a full, commented list covering the database, JWT secrets,
mail, WebRTC/TURN, and face recognition tuning.

## NDPA and NUC compliance notes

- Only numerical face embeddings are stored (`facial_enrolments` table); raw
  photographs are processed in memory and discarded.
- Enrolment requires an explicit recorded consent flag before a vector is
  saved, and a lecturer can revoke a student's vector at any time.
- Attendance percentage and the 75% NUC eligibility flag are computed per
  course from locked attendance sessions and exported as CSV or PDF.
