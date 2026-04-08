import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/database";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function getProfile(): Promise<Profile | null> {
  const { supabase, user } = await getSessionUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  return data as Profile | null;
}
