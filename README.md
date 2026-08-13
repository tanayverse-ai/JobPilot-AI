# JobPilot AI

A full-stack job application tracker — built to replace the messy spreadsheet most job-seekers use to track where they've applied, what stage each application is at, and when to follow up.

**🔗 Live app:** https://job-pilot-ai-hazel.vercel.app
**🔗 API:** https://jobpilot-ai-qjq1.onrender.com/docs

> Note: the backend is on Render's free tier, so the first request after a period of inactivity can take 30–50 seconds to wake up.

---

## Features

- **Authentication** — JWT-based auth with Argon2id password hashing.
- **Application tracking** — full CRUD, with a searchable/sortable list view and a Kanban-style board view (Saved → Applied → Screening → Interviewing → Offer / Rejected / Withdrawn), with inline drag-free status updates.
- **Timeline** — an immutable, per-application audit trail of every create/status-change/edit/archive event.
- **Reminders** — a dashboard widget surfacing applications with an upcoming or overdue follow-up date.
- **Materials** — résumé / cover-letter / portfolio file uploads, stored on Cloudinary.
- **Analytics** — an activity trend chart (Recharts) and a response-rate card, computed from the same event data that powers the timeline.

## Tech stack

| Layer | Tech |
|---|---|
| Backend | FastAPI (Python), PyMongo |
| Database | MongoDB Atlas |
| Auth | JWT + Argon2id (`pwdlib`) |
| File storage | Cloudinary |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Hosting | Vercel (frontend) · Render (backend) · MongoDB Atlas (database) |

## Architecture

```
backend/
  app/
    routes/     → FastAPI routers — HTTP concerns only
    services/   → business logic, independent of the web framework
    models/     → Pydantic models mirroring MongoDB documents
    schemas/    → request/response DTOs
frontend/
  src/
    features/   → one folder per feature (applications, materials, analytics, ...)
    components/ → shared UI
    lib/        → API client
```

Two conventions held across the whole backend: every database query is scoped to the authenticated user (never trust a path ID alone), and every error response uses a standard `{"error": {"code", "message", "details?"}}` envelope.

## Running it locally

**Backend**
```bash
cd backend
python -m venv .venv && .venv\Scripts\activate      # or source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
cp .env.example .env   # fill in your own MongoDB URI, JWT secret, Cloudinary keys
uvicorn app.main:app --reload --reload-dir app
```

**Frontend**
```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_BASE_URL to your backend URL
npm run dev
```

## Screenshots
<img width="1920" height="884" alt="dashboard" src="https://github.com/user-attachments/assets/eed48905-9123-4d70-b164-4459d9e574bf" />



Built as an end-to-end portfolio project — designed, built, debugged, and deployed solo, including working through a couple of real infrastructure issues along the way (a MongoDB Atlas connectivity/IP-allowlist problem, and catching a secret accidentally staged for a git commit before it reached GitHub).
