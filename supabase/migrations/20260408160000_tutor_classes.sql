-- Tutor-created classes with 6-digit join codes; students enroll via code (server-side).

create table public.tutor_classes (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null default 'Class',
  code text not null,
  created_at timestamptz not null default now(),
  constraint tutor_classes_code_format check (code ~ '^[0-9]{6}$'),
  constraint tutor_classes_code_unique unique (code)
);

create index idx_tutor_classes_tutor on public.tutor_classes (tutor_id);
create index idx_tutor_classes_subject on public.tutor_classes (subject_id);

alter table public.tutor_classes enable row level security;

create policy "Tutors read own classes"
  on public.tutor_classes for select
  using (tutor_id = auth.uid());

create policy "Tutors insert own classes"
  on public.tutor_classes for insert
  with check (
    tutor_id = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'tutor'
    )
  );

create policy "Tutors update own classes"
  on public.tutor_classes for update
  using (tutor_id = auth.uid());

create policy "Tutors delete own classes"
  on public.tutor_classes for delete
  using (tutor_id = auth.uid());
