-- In-app help requests (student -> linked tutor)
create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_help_requests_tutor on public.help_requests (tutor_id, read_at);
create index idx_help_requests_student on public.help_requests (student_id, created_at desc);

alter table public.help_requests enable row level security;

create policy "Students insert help for linked tutor"
  on public.help_requests for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.tutor_student_links tsl
      where tsl.student_id = auth.uid()
        and tsl.tutor_id = help_requests.tutor_id
    )
  );

create policy "Students read own help requests"
  on public.help_requests for select
  using (student_id = auth.uid());

create policy "Tutors read help from linked students"
  on public.help_requests for select
  using (
    tutor_id = auth.uid()
    and exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = help_requests.student_id
    )
  );

create policy "Tutors update help read_at"
  on public.help_requests for update
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());
