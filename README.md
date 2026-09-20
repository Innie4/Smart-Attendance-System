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

```bash
cd frontend
npm install
npm run dev
```

The dev server proxies `/api` to `http://localhost:5000`. Set
`VITE_API_BASE_URL` in `.env` to point at a different backend.

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
