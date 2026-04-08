"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncAlertsForTutorStudents } from "@/services/alerts/evaluateAlerts";

export async function saveTutorNoteAction(studentId: string, body: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "tutor") {
    return { ok: false as const, error: "Tutor only." };
  }

  const { data: link } = await supabase
    .from("tutor_student_links")
    .select("id")
    .eq("tutor_id", user.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) return { ok: false as const, error: "Student not linked." };

  const trimmed = body.trim();
  if (!trimmed) return { ok: false as const, error: "Note is empty." };

  const { error } = await supabase.from("tutor_notes").insert({
    tutor_id: user.id,
    student_id: studentId,
    body: trimmed,
  });
  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/students/${studentId}`);
  return { ok: true as const };
}

export async function dismissAlertFormAction(formData: FormData) {
  const id = String(formData.get("alertId") ?? "");
  if (!id) return;
  await dismissAlertAction(id);
}

export async function dismissAlertAction(alertId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from("alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("tutor_id", user.id);
  if (error) return;
  revalidatePath("/dashboard/tutor");
  revalidatePath("/students");
}

export async function refreshTutorAlertsAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "tutor") {
    return;
  }

  const admin = createAdminClient();
  await syncAlertsForTutorStudents(admin, user.id);
  revalidatePath("/dashboard/tutor");
}
