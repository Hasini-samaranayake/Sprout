"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function assignHomeworkLessonAction(
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lessonId = String(formData.get("lesson_id") ?? "").trim();
  const studentId = String(formData.get("student_id") ?? "").trim();
  const dueRaw = String(formData.get("due_at") ?? "").trim();

  if (!lessonId || !studentId) {
    return { ok: false, error: "Choose a student and a lesson." };
  }

  const dueAt = dueRaw ? new Date(dueRaw).toISOString() : null;
  if (dueRaw && Number.isNaN(Date.parse(dueRaw))) {
    return { ok: false, error: "Invalid due date." };
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
  if (profile?.role !== "tutor") {
    return { ok: false, error: "Only tutors can assign homework." };
  }

  const { data: link } = await supabase
    .from("tutor_student_links")
    .select("id")
    .eq("tutor_id", user.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (!link) {
    return { ok: false, error: "That student is not linked to you." };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, subject_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) {
    return { ok: false, error: "Lesson not found." };
  }

  const { data: enrollment } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", studentId)
    .eq("subject_id", lesson.subject_id)
    .maybeSingle();
  if (!enrollment) {
    return {
      ok: false,
      error: "That student is not enrolled in this lesson's subject.",
    };
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      due_at: dueAt,
      assigned_student_id: studentId,
    })
    .eq("id", lessonId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/tutor/assign-homework");
  revalidatePath("/dashboard/student");
  return { ok: true };
}
