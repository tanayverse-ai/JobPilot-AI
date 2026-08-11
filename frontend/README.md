# JobPilot AI — Frontend

React + TypeScript + Tailwind CSS, scaffolded per `docs/architecture.md`
(`app/`, `features/`, `components/`, `lib/`, `types/`) and
`docs/screen-design.md` (Login/Register screens). Currently implements
Feature 1 from the roadmap: register, log in, log out, and a protected
dashboard shell.

## Setup

```bash
npm install
cp .env.example .env   # point VITE_API_BASE_URL at your backend
npm run dev
```

## Known limitations (by design, not oversight)

- The access token lives in memory only (`AuthContext`), matching
  `architecture.md`'s Feature 1 open decision to defer the refresh-token /
  persistent-session model. Refreshing the page currently signs you out —
  wire up an HttpOnly refresh cookie before this goes further than a local
  demo.
- `DashboardPage` is a placeholder that proves the auth loop works; the real
  dashboard (pipeline summary, next-action queue, upcoming interviews) is
  Feature 2+ per the roadmap.
