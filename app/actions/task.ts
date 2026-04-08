"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DeterministicFeedbackProvider } from "@/services/feedback/FeedbackProvider";
import type { TaskForEvaluation } from "@/services/feedback/types";
import { recomputeProgressForStudentLesson } from "@/services/progress/updateProgress";
import { syncAlertsForTutorStudents } from "@/services/alerts/evaluateAlerts";
import { updateStreakAfterActivity } from "@/services/streaks/updateStreak";
import type { UserRole } from "@/types/database";

export type SubmitTaskResult =
  | {
      ok: true;
      feedback: {
        result: string;
        score: number;
        userMessage: string;
        hintMessage?: string;
        explanation?: string;
      };
    }
  | { ok: false; error: string };

export async function submitTaskAction(input: {
  lessonId: string;
  taskId: string;
  rawAnswer: string;
}): Promise<SubmitTaskResult> {
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
  const profile = profileRow as { role: UserRole } | null;
  if (profile?.role !== "student") {
    return { ok: false, error: "Only students can submit tasks." };
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

  const admin = createAdminClient();
  const { data: fullTask, error: taskErr } = await admin
    .from("tasks")
    .select("*")
    .eq("id", input.taskId)
    .single();
  if (taskErr || !fullTask) return { ok: false, error: "Could not load task." };

  const evalTask: TaskForEvaluation = {
    id: fullTask.id,
    type: fullTask.type,
    prompt: fullTask.prompt,
    options: fullTask.options,
    correct_answer: fullTask.correct_answer,
    accepted_variants: fullTask.accepted_variants,
    misconception_tags: fullTask.misconception_tags,
    hint_text: fullTask.hint_text,
    explanation_text: fullTask.explanation_text,
    rules_hint: (fullTask.rules_hint as Record<string, unknown> | null) ?? null,
  };

  const provider = new DeterministicFeedbackProvider();
  const feedback = provider.evaluate(evalTask, input.rawAnswer);

  const { data: attempt, error: attErr } = await supabase
    .from("task_attempts")
    .insert({
      student_id: user.id,
      task_id: input.taskId,
      lesson_id: input.lessonId,
      raw_answer: input.rawAnswer,
      normalized_answer: input.rawAnswer.trim().toLowerCase(),
      result: feedback.result,
      score: feedback.score,
      feedback_payload: {
        result: feedback.result,
        score: feedback.score,
        userMessage: feedback.userMessage,
        hintMessage: feedback.hintMessage ?? null,
        explanation: feedback.explanation ?? null,
      },
    })
    .select("id")
    .single();

  if (attErr || !attempt) {
    return { ok: false, error: attErr?.message ?? "Could not save attempt." };
  }

  await supabase.from("feedback_events").insert({
    task_attempt_id: attempt.id,
    event_type: "deterministic",
    payload: { layer: 1 },
  });

  await supabase.from("activity_events").insert({
    student_id: user.id,
    type: "task_submit",
    metadata: { lesson_id: input.lessonId, task_id: input.taskId },
  });

  await updateStreakAfterActivity(supabase, user.id, new Date());

  await recomputeProgressForStudentLesson(
    supabase,
    user.id,
    input.lessonId,
    lesson.subject_id
  );

  const { data: tutors } = await admin
    .from("tutor_student_links")
    .select("tutor_id")
    .eq("student_id", user.id);

  for (const t of tutors ?? []) {
    await syncAlertsForTutorStudents(admin, t.tutor_id);
  }

  return {
    ok: true,
    feedback: {
      result: feedback.result,
      score: feedback.score,
      userMessage: feedback.userMessage,
      hintMessage: feedback.hintMessage,
      explanation: feedback.explanation,
    },
  };
}
