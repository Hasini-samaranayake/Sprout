-- One-shot: sync demo student display names in public.profiles (matches scripts/seed-demo.ts).
-- Run in Supabase SQL Editor if UI still shows old names after a failed or partial seed.
-- Requires column public.profiles.full_name and matching email rows.

update public.profiles
set full_name = 'Hasini Samaranayake'
where email = 'tutor@sprout.demo';

update public.profiles
set full_name = 'Callum Perera'
where email = 'callum.perera@sprout.demo';

update public.profiles
set full_name = 'Riona Das'
where email = 'carlos.inactive@sprout.demo';

update public.profiles
set full_name = 'Melissa Mathews'
where email = 'dana.streak@sprout.demo';

update public.profiles
set full_name = 'Iqra Syed'
where email = 'elena.followup@sprout.demo';

update public.profiles
set full_name = 'Bella Smith'
where email = 'brianna.struggling@sprout.demo';
