-- Tutor whiteboard lessons (saved PNG + optional stroke data)
create table public.tutor_whiteboard_lessons (
  id uuid primary key default gen_random_uuid(),
  tutor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default 'Untitled lesson',
  image_storage_path text not null,
  strokes_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tutor_whiteboard_lessons_tutor on public.tutor_whiteboard_lessons (tutor_id, created_at desc);

create trigger tutor_whiteboard_lessons_updated_at
  before update on public.tutor_whiteboard_lessons
  for each row execute procedure public.set_updated_at();

alter table public.tutor_whiteboard_lessons enable row level security;

create policy "Tutors manage own whiteboard lessons"
  on public.tutor_whiteboard_lessons for all
  using (tutor_id = auth.uid())
  with check (tutor_id = auth.uid());

create policy "Students read linked tutor whiteboard lessons"
  on public.tutor_whiteboard_lessons for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.student_id = auth.uid()
        and tsl.tutor_id = tutor_whiteboard_lessons.tutor_id
    )
  );

-- Private bucket: path {tutor_id}/{filename}
insert into storage.buckets (id, name, public)
values ('tutor-whiteboards', 'tutor-whiteboards', false)
on conflict (id) do nothing;

create policy "Tutors upload whiteboard to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tutor-whiteboards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Tutors read own whiteboard files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tutor-whiteboards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Tutors update own whiteboard files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tutor-whiteboards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Tutors delete own whiteboard files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tutor-whiteboards'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Students read linked tutor whiteboard files"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'tutor-whiteboards'
    and exists (
      select 1 from public.tutor_student_links tsl
      where tsl.student_id = auth.uid()
        and tsl.tutor_id::text = (storage.foldername(name))[1]
    )
  );
