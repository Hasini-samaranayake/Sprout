-- Tutors can set due dates and assign lessons to linked students (homework flow)
create policy "Tutors update lessons for linked students subjects"
  on public.lessons for update
  to authenticated
  using (
    exists (
      select 1 from public.enrollments e
      join public.tutor_student_links tsl
        on tsl.student_id = e.student_id and tsl.tutor_id = auth.uid()
      where e.subject_id = lessons.subject_id
    )
  )
  with check (
    exists (
      select 1 from public.enrollments e
      join public.tutor_student_links tsl
        on tsl.student_id = e.student_id and tsl.tutor_id = auth.uid()
      where e.subject_id = lessons.subject_id
    )
  );
