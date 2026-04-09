# Sprout (MVP)

Sprout is a tutoring web app built with **Next.js (App Router)**, **Supabase Auth + Postgres + RLS**, **Tailwind**, **shadcn/ui**, and **Recharts**. It focuses on guided lessons, deterministic feedback, tutor decision-support (alerts, roster metrics), and seeded demo data.



## Architecture notes

- **Feedback**: Deterministic evaluation in `services/feedback/` with a provider interface for future AI. Stub API: `POST /api/feedback/extension` (501).
- **Alerts**: Recomputed for a tutor when they load the tutor dashboard or when a student submits a task (non-dismissed rows are refreshed). Dismissed alerts are kept until manually cleared from the DB or you adjust the sync logic.
- **Grading**: Task solutions are read with the **service role** only inside server actions after session checks, so students cannot rely on the anon key alone to read full answer keys.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run seed` | Seed demo data (needs service role) |
