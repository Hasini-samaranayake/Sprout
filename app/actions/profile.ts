"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const full_name = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Email is required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not signed in." };
  }

  if (user.email !== email) {
    const { error: authErr } = await supabase.auth.updateUser({ email });
    if (authErr) {
      return { error: authErr.message };
    }
  }

  const { error: dbErr } = await supabase
    .from("profiles")
    .update({
      full_name: full_name || null,
      email,
    })
    .eq("id", user.id);

  if (dbErr) {
    return { error: dbErr.message };
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/tutor");
  revalidatePath("/subjects");
  revalidatePath("/lessons");
  revalidatePath("/students");

  return { success: true };
}
