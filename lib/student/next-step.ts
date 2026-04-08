import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type NextStepInfo = {
  lessonId: string;
  lessonTitle: string;
  subjectTitle: string;
  subjectId: string;
  stepIndex: number;
  stepTitle: string;
  taskId: string;
} | null;

/**
 * First incomplete step across enrolled subjects (by subject order, lesson order, step order).
 * A step is complete if the latest attempt for its task is correct or partial.
 */
export async function getNextRecommendedStep(
  supabase: SupabaseClient<Database>,
  studentId: string
): Promise<NextStepInfo> {
  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("subject_id, subjects(id, title)")
    .eq("student_id", studentId);

  const rows = enrollments ?? [];
  if (!rows.length) return null;

  const subjectOrder = [...rows].sort((a, b) => {
    const ra = a as { subjects?: { title?: string } | null };
    const rb = b as { subjects?: { title?: string } | null };
    const ta = ra.subjects?.title ?? "";
    const tb = rb.subjects?.title ?? "";
    return ta.localeCompare(tb);
  });

  for (const e of subjectOrder) {
    const subject = (e as { subjects: { id: string; title: string } | null })
      .subjects;
    if (!subject) continue;

    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, order_index")
      .eq("subject_id", subject.id)
      .order("order_index", { ascending: true });

    for (const lesson of (lessons ?? []) as {
      id: string;
      title: string;
      order_index: number;
    }[]) {
      const { data: steps } = await supabase
        .from("lesson_steps")
        .select("id, order_index, title, task_id")
        .eq("lesson_id", lesson.id)
        .order("order_index", { ascending: true });

      const stepRows = (steps ?? []) as {
        order_index: number;
        title: string;
        task_id: string;
      }[];

      const taskIds = stepRows.map((s) => s.task_id);
      if (!taskIds.length) continue;

      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("task_id, result, created_at")
        .eq("student_id", studentId)
        .in("task_id", taskIds)
        .order("created_at", { ascending: false });

      const best = new Map<string, string>();
      for (const a of (attempts ?? []) as {
        task_id: string;
        result: string;
      }[]) {
        if (!best.has(a.task_id)) best.set(a.task_id, a.result);
      }

      for (const step of stepRows) {
        const r = best.get(step.task_id);
        const done = r === "correct" || r === "partial";
        if (!done) {
          return {
            lessonId: lesson.id,
            lessonTitle: lesson.title,
            subjectTitle: subject.title,
            subjectId: subject.id,
            stepIndex: step.order_index,
            stepTitle: step.title,
            taskId: step.task_id,
          };
        }
      }
    }
  }

  return null;
}
