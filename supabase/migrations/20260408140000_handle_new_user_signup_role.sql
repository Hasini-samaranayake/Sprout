-- Respect signup_role from auth user metadata ('tutor' | 'student'); default student.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text;
  chosen public.user_role;
begin
  r := coalesce(new.raw_user_meta_data->>'signup_role', '');
  if r = 'tutor' then
    chosen := 'tutor'::public.user_role;
  else
    chosen := 'student'::public.user_role;
  end if;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), ''),
    chosen
  );
  return new;
end;
$$;
