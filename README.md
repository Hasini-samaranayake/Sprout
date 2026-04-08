# Sprout (MVP)

Sprout is a tutoring web app built with **Next.js (App Router)**, **Supabase Auth + Postgres + RLS**, **Tailwind**, **shadcn/ui**, and **Recharts**. It focuses on guided lessons, deterministic feedback, tutor decision-support (alerts, roster metrics), and seeded demo data.

## Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com/) project

## Setup

1. **Clone / open this project** and install dependencies:

   ```bash
   npm install
   ```

2. **Environment variables** — copy `.env.example` to **`.env.local`** (Next.js only loads `.env.local`, not `.env.example`) and fill in values from Supabase **Project Settings → API**:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (keep secret; used only on the server / for `npm run seed`)

3. **Apply the database schema** — in the Supabase SQL editor (or via CLI), run the migration:

   - File: [`supabase/migrations/20260408000000_init.sql`](supabase/migrations/20260408000000_init.sql)

4. **Seed demo users and data** (requires service role key):

   ```bash
   npm run seed
   ```

   This creates demo accounts (same password for all) and links a tutor to five students, with subjects, lessons, tasks, attempts, streaks, progress, and sample notes.

5. **Run the app**:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). You will be redirected to `/login`.

## Demo accounts (after seed)

Password for all (from seed script): **`DemoSprout2026!`**

| Role   | Email                      |
|--------|----------------------------|
| Tutor  | `tutor@sprout.demo`        |
| Student| `callum.perera@sprout.demo` |
| Student| `brianna.struggling@sprout.demo` |
| Student| `carlos.inactive@sprout.demo` |
| Student| `dana.streak@sprout.demo`  |
| Student| `elena.followup@sprout.demo` |

## Routes

| Path | Description |
|------|-------------|
| `/login` | Email / password sign-in |
| `/dashboard` | Redirects by role |
| `/dashboard/student` | Student home |
| `/dashboard/tutor` | Tutor roster + alerts |
| `/subjects/[id]` | Subject detail (student) |
| `/lessons/[id]` | Guided lesson steps (student) |
| `/students/[id]` | Tutor student profile |
| `/settings` | Basic profile placeholder |

## Deploy (e.g. Vercel)

1. Create a Supabase project and run the migration SQL.
2. Set the same three env vars in Vercel (use **Production** and **Preview** as needed).
3. Run `npm run seed` locally against that project once, or run it in CI with `SUPABASE_SERVICE_ROLE_KEY` stored as a secret.
4. Connect the repo and deploy; default Next.js settings work.

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
