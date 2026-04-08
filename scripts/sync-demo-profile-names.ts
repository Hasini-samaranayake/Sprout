/**
 * Push demo display names to Auth user_metadata + public.profiles (service role).
 * Use when the UI still shows old names after git pull:
 *   npm run sync:demo-names
 *
 * Also migrates legacy Callum email (alex.thriving@sprout.demo → callum.perera@sprout.demo)
 * if the old user still exists and the new one does not.
 */
import { config as loadEnv } from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEMO_PASSWORD,
  LEGACY_EMAIL_BY_CANONICAL,
  USERS,
} from "./demo-users";

loadEnv({ path: ".env.local" });
loadEnv();

async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<{ id: string; email?: string } | null> {
  const perPage = 200;
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return { id: found.id, email: found.email ?? undefined };
    if (data.users.length < perPage) break;
  }
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const u of USERS) {
    let authUser = await findAuthUserByEmail(admin, u.email);
    let fromLegacy = false;

    if (!authUser) {
      const legacy = LEGACY_EMAIL_BY_CANONICAL[u.email];
      if (legacy) {
        const legacyUser = await findAuthUserByEmail(admin, legacy);
        if (legacyUser) {
          authUser = legacyUser;
          fromLegacy = true;
        }
      }
    }

    if (!authUser) {
      console.warn(`Skip (no Auth user): ${u.email}`);
      continue;
    }

    if (fromLegacy) {
      const { error: updErr } = await admin.auth.admin.updateUserById(authUser.id, {
        email: u.email,
        password: DEMO_PASSWORD,
        user_metadata: { full_name: u.full_name, role: u.role },
      });
      if (updErr) {
        console.error(`Could not migrate ${u.email}:`, updErr.message);
        continue;
      }
      console.log(`Migrated ${LEGACY_EMAIL_BY_CANONICAL[u.email]} → ${u.email}`);
    } else {
      await admin.auth.admin.updateUserById(authUser.id, {
        user_metadata: { full_name: u.full_name, role: u.role },
      });
    }

    const { error: profErr } = await admin.from("profiles").upsert(
      {
        id: authUser.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
      },
      { onConflict: "id" }
    );
    if (profErr) {
      console.error(`profiles upsert ${u.email}:`, profErr.message);
    } else {
      console.log(`OK: ${u.full_name} <${u.email}>`);
    }
  }

  console.log("sync:demo-names complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
