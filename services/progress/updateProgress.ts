import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Recomputes lesson + subject completion for a student based on lesson_steps vs latest correct/partial attempts.
 */
export async function recomputeProgressForStudentLesson(
  supabase: SupabaseClient,
  studentId: string,
  lessonId: string,
  subjectId: string
): Promise<void> {
  const { data: steps } = await supabase
    .from("lesson_steps")
    .select("id, task_id")
    .eq("lesson_id", lessonId)
    .order("order_index", { ascending: true });

  if (!steps?.length) return;

  const taskIds = steps.map((s) => s.task_id);

  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("task_id, result, created_at")
    .eq("student_id", studentId)
    .in("task_id", taskIds)
    .order("created_at", { ascending: false });

  const best = new Map<string, "correct" | "partial" | "incorrect">();
  for (const a of attempts ?? []) {
    if (!best.has(a.task_id)) {
      best.set(a.task_id, a.result);
    }
  }

  let done = 0;
  for (const tid of taskIds) {
    const r = best.get(tid);
    if (r === "correct" || r === "partial") done += 1;
  }

  const lessonPct = Math.round((done / taskIds.length) * 1000) / 10;

  await supabase
    .from("progress_records")
    .delete()
    .eq("student_id", studentId)
    .eq("lesson_id", lessonId);
  await supabase.from("progress_records").insert({
    student_id: studentId,
    lesson_id: lessonId,
    subject_id: null,
    completion_pct: lessonPct,
    updated_at: new Date().toISOString(),
  });

  const { data: lessonsInSubject } = await supabase
    .from("lessons")
    .select("id")
    .eq("subject_id", subjectId);

  const lessonIds = (lessonsInSubject ?? []).map((l) => l.id);
  if (!lessonIds.length) return;

  const { data: allSteps } = await supabase
    .from("lesson_steps")
    .select("lesson_id, task_id")
    .in("lesson_id", lessonIds);

  const totalTasks = (allSteps ?? []).length;
  if (!totalTasks) return;

  const allTaskIds = [...new Set((allSteps ?? []).map((s) => s.task_id))];

  const { data: allAttempts } = await supabase
    .from("task_attempts")
    .select("task_id, result, created_at")
    .eq("student_id", studentId)
    .in("task_id", allTaskIds)
    .order("created_at", { ascending: false });

  const bestAll = new Map<string, string>();
  for (const a of allAttempts ?? []) {
    if (!bestAll.has(a.task_id)) bestAll.set(a.task_id, a.result);
  }

  let completed = 0;
  for (const tid of allTaskIds) {
    const r = bestAll.get(tid);
    if (r === "correct" || r === "partial") completed += 1;
  }

  const subjectPct = Math.round((completed / totalTasks) * 1000) / 10;

  await supabase
    .from("progress_records")
    .delete()
    .eq("student_id", studentId)
    .eq("subject_id", subjectId);
  await supabase.from("progress_records").insert({
    student_id: studentId,
    subject_id: subjectId,
    lesson_id: null,
    completion_pct: subjectPct,
    updated_at: new Date().toISOString(),
  });
}
