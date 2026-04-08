-- Sprout: core schema + RLS
-- Run via Supabase CLI or SQL editor

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('student', 'tutor');
create type public.task_type as enum ('multiple_choice', 'short_answer', 'structured');
create type public.attempt_result as enum ('correct', 'partial', 'incorrect');
create type public.alert_severity as enum ('low', 'medium', 'high');
create type public.activity_event_type as enum (
  'task_submit',
  'lesson_start',
  'session_booked',
  'other'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role public.user_role not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tutor_student_links (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (tutor_id, student_id),
  check (tutor_id <> student_id)
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  unique (student_id, subject_id)
);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null,
  order_index int not null default 0,
  due_at timestamptz,
  assigned_student_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  type public.task_type not null,
  prompt text not null,
  options jsonb,
  correct_answer text,
  accepted_variants text[] default '{}',
  misconception_tags text[] default '{}',
  hint_text text,
  explanation_text text,
  rules_hint jsonb,
  topic_tag text,
  created_at timestamptz not null default now()
);

create table public.lesson_steps (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  order_index int not null,
  title text not null,
  task_id uuid not null references public.tasks (id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (lesson_id, order_index)
);

create table public.task_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  raw_answer text not null,
  normalized_answer text,
  result public.attempt_result not null,
  score numeric(4, 3) not null check (score >= 0 and score <= 1),
  feedback_payload jsonb,
  created_at timestamptz not null default now()
);

create table public.feedback_events (
  id uuid primary key default gen_random_uuid(),
  task_attempt_id uuid not null references public.task_attempts (id) on delete cascade,
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

create table public.progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  completion_pct numeric(5, 2) not null default 0 check (completion_pct >= 0 and completion_pct <= 100),
  updated_at timestamptz not null default now(),
  check (
    (subject_id is not null and lesson_id is null)
    or (lesson_id is not null and subject_id is null)
  )
);

create unique index progress_records_student_subject_key
  on public.progress_records (student_id, subject_id)
  where subject_id is not null;

create unique index progress_records_student_lesson_key
  on public.progress_records (student_id, lesson_id)
  where lesson_id is not null;

create table public.streak_records (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  longest_streak int not null default 0 check (longest_streak >= 0),
  last_activity_date date,
  updated_at timestamptz not null default now()
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  type public.activity_event_type not null default 'other',
  metadata jsonb,
  occurred_at timestamptz not null default now()
);

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  severity public.alert_severity not null,
  reason_code text not null,
  message text not null,
  suggested_action text,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.tutor_notes (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------
create index idx_tutor_student_links_tutor on public.tutor_student_links (tutor_id);
create index idx_tutor_student_links_student on public.tutor_student_links (student_id);
create index idx_enrollments_student on public.enrollments (student_id);
create index idx_enrollments_subject on public.enrollments (subject_id);
create index idx_lessons_subject on public.lessons (subject_id);
create index idx_lesson_steps_lesson on public.lesson_steps (lesson_id);
create index idx_task_attempts_student on public.task_attempts (student_id);
create index idx_task_attempts_task on public.task_attempts (task_id);
create index idx_task_attempts_student_task on public.task_attempts (student_id, task_id);
create index idx_task_attempts_created on public.task_attempts (created_at desc);
create index idx_activity_events_student_time on public.activity_events (student_id, occurred_at desc);
create index idx_alerts_tutor on public.alerts (tutor_id, dismissed_at);
create index idx_alerts_student on public.alerts (student_id);

-- -----------------------------------------------------------------------------
-- Helper: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger tutor_notes_updated_at
  before update on public.tutor_notes
  for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.tutor_student_links enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_steps enable row level security;
alter table public.tasks enable row level security;
alter table public.task_attempts enable row level security;
alter table public.feedback_events enable row level security;
alter table public.progress_records enable row level security;
alter table public.streak_records enable row level security;
alter table public.activity_events enable row level security;
alter table public.alerts enable row level security;
alter table public.tutor_notes enable row level security;

-- profiles
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Tutors can read linked student profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = profiles.id
    )
  );

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- tutor_student_links
create policy "Tutor or student can read their links"
  on public.tutor_student_links for select
  using (tutor_id = auth.uid() or student_id = auth.uid());

-- subjects (catalog)
create policy "Authenticated read subjects"
  on public.subjects for select
  to authenticated
  using (true);

-- enrollments
create policy "Students read own enrollments"
  on public.enrollments for select
  using (student_id = auth.uid());

create policy "Tutors read enrollments for linked students"
  on public.enrollments for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = enrollments.student_id
    )
  );

-- lessons
create policy "Students read lessons in enrolled subjects"
  on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments e
      where e.student_id = auth.uid()
        and e.subject_id = lessons.subject_id
    )
  );

create policy "Tutors read lessons for subjects their students take"
  on public.lessons for select
  using (
    exists (
      select 1 from public.enrollments e
      join public.tutor_student_links tsl
        on tsl.student_id = e.student_id and tsl.tutor_id = auth.uid()
      where e.subject_id = lessons.subject_id
    )
  );

-- lesson_steps
create policy "Students read steps for enrolled lessons"
  on public.lesson_steps for select
  using (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.subject_id = l.subject_id and e.student_id = auth.uid()
      where l.id = lesson_steps.lesson_id
    )
  );

create policy "Tutors read steps for linked students"
  on public.lesson_steps for select
  using (
    exists (
      select 1 from public.lessons l
      join public.enrollments e on e.subject_id = l.subject_id
      join public.tutor_student_links tsl
        on tsl.student_id = e.student_id and tsl.tutor_id = auth.uid()
      where l.id = lesson_steps.lesson_id
    )
  );

-- tasks
create policy "Students read tasks in enrolled lesson paths"
  on public.tasks for select
  using (
    exists (
      select 1 from public.lesson_steps ls
      join public.lessons l on l.id = ls.lesson_id
      join public.enrollments e on e.subject_id = l.subject_id and e.student_id = auth.uid()
      where ls.task_id = tasks.id
    )
  );

create policy "Tutors read tasks for linked students"
  on public.tasks for select
  using (
    exists (
      select 1 from public.lesson_steps ls
      join public.lessons l on l.id = ls.lesson_id
      join public.enrollments e on e.subject_id = l.subject_id
      join public.tutor_student_links tsl
        on tsl.student_id = e.student_id and tsl.tutor_id = auth.uid()
      where ls.task_id = tasks.id
    )
  );

-- task_attempts
create policy "Students read own attempts"
  on public.task_attempts for select
  using (student_id = auth.uid());

create policy "Tutors read attempts for linked students"
  on public.task_attempts for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = task_attempts.student_id
    )
  );

create policy "Students insert own attempts"
  on public.task_attempts for insert
  with check (student_id = auth.uid());

-- feedback_events
create policy "Read feedback for own attempts"
  on public.feedback_events for select
  using (
    exists (
      select 1 from public.task_attempts ta
      where ta.id = feedback_events.task_attempt_id
        and ta.student_id = auth.uid()
    )
  );

create policy "Tutors read feedback for linked students"
  on public.feedback_events for select
  using (
    exists (
      select 1 from public.task_attempts ta
      join public.tutor_student_links tsl
        on tsl.student_id = ta.student_id and tsl.tutor_id = auth.uid()
      where ta.id = feedback_events.task_attempt_id
    )
  );

create policy "Students insert feedback events for own attempts"
  on public.feedback_events for insert
  with check (
    exists (
      select 1 from public.task_attempts ta
      where ta.id = feedback_events.task_attempt_id
        and ta.student_id = auth.uid()
    )
  );

-- progress_records
create policy "Students read own progress"
  on public.progress_records for select
  using (student_id = auth.uid());

create policy "Tutors read progress for linked students"
  on public.progress_records for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = progress_records.student_id
    )
  );

create policy "Students upsert own progress"
  on public.progress_records for insert
  with check (student_id = auth.uid());

create policy "Students update own progress"
  on public.progress_records for update
  using (student_id = auth.uid());

-- streak_records
create policy "Students read own streak"
  on public.streak_records for select
  using (student_id = auth.uid());

create policy "Tutors read streak for linked students"
  on public.streak_records for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = streak_records.student_id
    )
  );

create policy "Students upsert own streak"
  on public.streak_records for insert
  with check (student_id = auth.uid());

create policy "Students update own streak"
  on public.streak_records for update
  using (student_id = auth.uid());

-- activity_events
create policy "Students read own activity"
  on public.activity_events for select
  using (student_id = auth.uid());

create policy "Tutors read activity for linked students"
  on public.activity_events for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = activity_events.student_id
    )
  );

create policy "Students insert own activity"
  on public.activity_events for insert
  with check (student_id = auth.uid());

-- alerts
create policy "Students read own alerts"
  on public.alerts for select
  using (student_id = auth.uid());

create policy "Tutors read their alerts"
  on public.alerts for select
  using (tutor_id = auth.uid());

create policy "Tutors dismiss their alerts"
  on public.alerts for update
  using (tutor_id = auth.uid());

-- Alerts rows are inserted by the application using the service role (bypasses RLS).

-- tutor_notes
create policy "Tutors read own notes"
  on public.tutor_notes for select
  using (tutor_id = auth.uid());

create policy "Tutors insert notes for linked students"
  on public.tutor_notes for insert
  with check (
    tutor_id = auth.uid()
    and exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = tutor_notes.student_id
    )
  );

create policy "Tutors update own notes"
  on public.tutor_notes for update
  using (tutor_id = auth.uid());

create policy "Tutors delete own notes"
  on public.tutor_notes for delete
  using (tutor_id = auth.uid());
