"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { UserRole } from "@/types/database";

export async function getOrCreateHomeworkSubmissionDraft(input: {
  lessonId: string;
  taskId: string;
}): Promise<{ ok: true; submissionId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profileRow?.role as UserRole | undefined;
  if (role !== "student") {
    return { ok: false, error: "Only students can use the homework workspace." };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, subject_id")
    .eq("id", input.lessonId)
    .single();
  if (!lesson) return { ok: false, error: "Lesson not found." };

  const { data: enr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("subject_id", lesson.subject_id)
    .maybeSingle();
  if (!enr) return { ok: false, error: "Not enrolled in this subject." };

  const { data: step } = await supabase
    .from("lesson_steps")
    .select("id")
    .eq("lesson_id", input.lessonId)
    .eq("task_id", input.taskId)
    .maybeSingle();
  if (!step) return { ok: false, error: "Task is not part of this lesson." };

  const { data: existing } = await supabase
    .from("homework_submissions")
    .select("id")
    .eq("student_id", user.id)
    .eq("lesson_id", input.lessonId)
    .eq("task_id", input.taskId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, submissionId: existing.id };
  }

  return createHomeworkSubmissionDraft(input);
}

export async function createHomeworkSubmissionDraft(input: {
  lessonId: string;
  taskId: string;
}): Promise<{ ok: true; submissionId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = profileRow?.role as UserRole | undefined;
  if (role !== "student") {
    return { ok: false, error: "Only students can create homework submissions." };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, subject_id")
    .eq("id", input.lessonId)
    .single();
  if (!lesson) return { ok: false, error: "Lesson not found." };

  const { data: enr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", user.id)
    .eq("subject_id", lesson.subject_id)
    .maybeSingle();
  if (!enr) return { ok: false, error: "Not enrolled in this subject." };

  const { data: step } = await supabase
    .from("lesson_steps")
    .select("id")
    .eq("lesson_id", input.lessonId)
    .eq("task_id", input.taskId)
    .maybeSingle();
  if (!step) return { ok: false, error: "Task is not part of this lesson." };

  const { data: row, error } = await supabase
    .from("homework_submissions")
    .insert({
      student_id: user.id,
      lesson_id: input.lessonId,
      task_id: input.taskId,
      status: "draft",
    })
    .select("id")
    .single();

  if (error || !row) {
    return { ok: false, error: error?.message ?? "Could not create draft." };
  }

  return { ok: true, submissionId: row.id };
}

export async function finalizeHomeworkSubmission(input: {
  submissionId: string;
  storagePath: string;
  commentText: string;
  strokesJson: Json;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const expectedPrefix = `${user.id}/`;
  if (!input.storagePath.startsWith(expectedPrefix)) {
    return { ok: false, error: "Invalid storage path." };
  }

  const { data: row } = await supabase
    .from("homework_submissions")
    .select("id, student_id, status")
    .eq("id", input.submissionId)
    .single();

  if (!row || row.student_id !== user.id) {
    return { ok: false, error: "Submission not found." };
  }
  if (row.status === "submitted") {
    return { ok: false, error: "Already submitted." };
  }

  const { error } = await supabase
    .from("homework_submissions")
    .update({
      image_storage_path: input.storagePath,
      comment_text: input.commentText.trim() || null,
      strokes_json: input.strokesJson,
      status: "submitted",
    })
    .eq("id", input.submissionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export async function saveHomeworkDraftMeta(input: {
  submissionId: string;
  strokesJson: Json;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row } = await supabase
    .from("homework_submissions")
    .select("student_id")
    .eq("id", input.submissionId)
    .single();

  if (!row || row.student_id !== user.id) {
    return { ok: false, error: "Not found." };
  }

  const { error } = await supabase
    .from("homework_submissions")
    .update({ strokes_json: input.strokesJson })
    .eq("id", input.submissionId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
