-- Sync demo display names in public.profiles (matches scripts/demo-users.ts).
-- Run in Supabase SQL Editor if names in the app are stale.
--
-- If updates affect 0 rows, your emails may still be old (e.g. alex.thriving@sprout.demo).
-- Prefer: npm run sync:demo-names   (updates Auth + profiles, migrates Callum email)
-- Or run the legacy UPDATEs below, then full seed if needed.

-- -----------------------------------------------------------------------------
-- Canonical emails (current seed)
-- -----------------------------------------------------------------------------

update public.profiles
set full_name = 'Hasini Samaranayake'
where email = 'tutor@sprout.demo';

update public.profiles
set full_name = 'Callum Perera'
where email = 'callum.perera@sprout.demo';

update public.profiles
set full_name = 'Bella Smith'
where email = 'brianna.struggling@sprout.demo';

update public.profiles
set full_name = 'Riona Das'
where email = 'carlos.inactive@sprout.demo';

update public.profiles
set full_name = 'Melissa Mathews'
where email = 'dana.streak@sprout.demo';

update public.profiles
set full_name = 'Iqra Syed'
where email = 'elena.followup@sprout.demo';

-- -----------------------------------------------------------------------------
-- Legacy: older seed used alex.thriving@sprout.demo for Callum (before rename)
-- -----------------------------------------------------------------------------

update public.profiles
set full_name = 'Callum Perera'
where email = 'alex.thriving@sprout.demo';
