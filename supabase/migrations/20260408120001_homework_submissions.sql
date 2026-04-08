-- Homework annotation submissions (separate from graded task_attempts)
create table public.homework_submissions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  comment_text text,
  strokes_json jsonb,
  image_storage_path text,
  status text not null default 'draft' check (status in ('draft', 'submitted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_homework_submissions_student on public.homework_submissions (student_id);
create index idx_homework_submissions_lesson on public.homework_submissions (lesson_id);

create trigger homework_submissions_updated_at
  before update on public.homework_submissions
  for each row execute procedure public.set_updated_at();

alter table public.homework_submissions enable row level security;

create policy "Students read own homework submissions"
  on public.homework_submissions for select
  using (student_id = auth.uid());

create policy "Students insert own homework submissions"
  on public.homework_submissions for insert
  with check (student_id = auth.uid());

create policy "Students update own homework submissions"
  on public.homework_submissions for update
  using (student_id = auth.uid());

create policy "Tutors read homework for linked students"
  on public.homework_submissions for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id = homework_submissions.student_id
    )
  );

-- Private bucket for annotated exports
insert into storage.buckets (id, name, public)
values ('homework-annotations', 'homework-annotations', false)
on conflict (id) do nothing;

create policy "Students upload homework to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'homework-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students read own homework files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'homework-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students update own homework files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'homework-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students delete own homework files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'homework-annotations'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Tutors read homework files for linked students"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'homework-annotations'
    and exists (
      select 1 from public.tutor_student_links tsl
      where tsl.tutor_id = auth.uid()
        and tsl.student_id::text = (storage.foldername(name))[1]
    )
  );
