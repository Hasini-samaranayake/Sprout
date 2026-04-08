-- Allow students to read basic profile rows for their linked tutor(s) (e.g. help mailto).
create policy "Students read linked tutor profile"
  on public.profiles for select
  using (
    exists (
      select 1 from public.tutor_student_links tsl
      where tsl.student_id = auth.uid()
        and tsl.tutor_id = profiles.id
    )
  );
