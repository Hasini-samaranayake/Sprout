-- One-shot: sync demo student display names in public.profiles (matches scripts/seed-demo.ts).
-- Run in Supabase SQL Editor if UI still shows old names after a failed or partial seed.
-- Requires column public.profiles.full_name and matching email rows.

update public.profiles
set full_name = 'Hasini Samaranayake'
where email = 'tutor@sprout.demo';

update public.profiles
set full_name = 'Callum Pererra'
where email = 'alex.thriving@sprout.demo';

update public.profiles
set full_name = 'Riona Panandian'
where email = 'carlos.inactive@sprout.demo';

update public.profiles
set full_name = 'Melissa Mathews'
where email = 'dana.streak@sprout.demo';

update public.profiles
set full_name = 'Iqra Syed'
where email = 'elena.followup@sprout.demo';

-- Brianna unchanged in seed; include only if you renamed her in seed-demo.ts:
-- update public.profiles set full_name = 'Brianna Cole' where email = 'brianna.struggling@sprout.demo';
