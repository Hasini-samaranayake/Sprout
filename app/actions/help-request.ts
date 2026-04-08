"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function sendHelpRequestAction(body: string): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const trimmed = body.trim();
  if (!trimmed) {
    return { ok: false, error: "Please write a message." };
  }
  if (trimmed.length > 4000) {
    return { ok: false, error: "Message is too long (max 4000 characters)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") {
    return { ok: false, error: "Only students can send help requests." };
  }

  const { data: link } = await supabase
    .from("tutor_student_links")
    .select("tutor_id")
    .eq("student_id", user.id)
    .maybeSingle();
  if (!link?.tutor_id) {
    return { ok: false, error: "No tutor is linked to your account yet." };
  }

  const { error } = await supabase.from("help_requests").insert({
    student_id: user.id,
    tutor_id: link.tutor_id,
    body: trimmed,
  });
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/messages");
  revalidatePath("/dashboard/tutor");
  revalidatePath("/dashboard/tutor/help");
  return { ok: true };
}

export async function markHelpRequestReadFormAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await markHelpRequestReadAction(id);
}

export async function markHelpRequestReadAction(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "tutor") {
    return { ok: false, error: "Only tutors can mark requests read." };
  }

  const { error } = await supabase
    .from("help_requests")
    .update({ read_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("tutor_id", user.id);
  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/tutor");
  revalidatePath("/dashboard/tutor/help");
  return { ok: true };
}
