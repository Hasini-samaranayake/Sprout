import type { SupabaseClient } from "@supabase/supabase-js";
import type { AlertSeverity } from "@/types/database";

type AlertRow = {
  student_id: string;
  tutor_id: string;
  severity: AlertSeverity;
  reason_code: string;
  message: string;
  suggested_action: string | null;
};

const INACTIVE_DAYS = 5;
const STRUGGLE_ATTEMPTS = 3;

export async function syncAlertsForTutorStudents(
  admin: SupabaseClient,
  tutorId: string
): Promise<void> {
  const { data: links } = await admin
    .from("tutor_student_links")
    .select("student_id")
    .eq("tutor_id", tutorId);

  const studentIds = (links ?? []).map((l) => l.student_id);
  if (!studentIds.length) return;

  await admin
    .from("alerts")
    .delete()
    .eq("tutor_id", tutorId)
    .is("dismissed_at", null);

  const now = new Date();
  const rows: AlertRow[] = [];

  for (const studentId of studentIds) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", studentId)
      .single();

    const name = profile?.full_name ?? "Student";

    const { data: lastAct } = await admin
      .from("activity_events")
      .select("occurred_at")
      .eq("student_id", studentId)
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastAt = lastAct?.occurred_at
      ? new Date(lastAct.occurred_at)
      : null;
    const inactiveDays = lastAt
      ? Math.floor((now.getTime() - lastAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (inactiveDays >= INACTIVE_DAYS) {
      rows.push({
        student_id: studentId,
        tutor_id: tutorId,
        severity: inactiveDays >= 10 ? "high" : "medium",
        reason_code: "inactive",
        message: `${name} has been inactive for ${inactiveDays} days.`,
        suggested_action: "Send a short check-in and suggest a 15-minute review slot.",
      });
    }

    const { data: attempts } = await admin
      .from("task_attempts")
      .select("task_id, result")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .limit(80);

    const taskIds = [...new Set((attempts ?? []).map((a) => a.task_id))];
    const { data: taskRows } = await admin
      .from("tasks")
      .select("id, topic_tag")
      .in("id", taskIds.length ? taskIds : ["00000000-0000-0000-0000-000000000000"]);

    const topicByTask = new Map<string, string>();
    for (const t of taskRows ?? []) {
      topicByTask.set(t.id, t.topic_tag ?? "general");
    }

    const failByTopic = new Map<string, number>();
    for (const a of attempts ?? []) {
      if (a.result !== "incorrect") continue;
      const tag = topicByTask.get(a.task_id) ?? "general";
      failByTopic.set(tag, (failByTopic.get(tag) ?? 0) + 1);
    }
    for (const [topic, n] of failByTopic) {
      if (n >= STRUGGLE_ATTEMPTS) {
        rows.push({
          student_id: studentId,
          tutor_id: tutorId,
          severity: n >= 5 ? "high" : "medium",
          reason_code: "struggling_topic",
          message: `${name} has ${n} recent incorrect attempts on ${topic}.`,
          suggested_action: "Assign a short revision lesson and review one worked example together.",
        });
      }
    }

    const { data: streak } = await admin
      .from("streak_records")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("student_id", studentId)
      .maybeSingle();

    if (
      streak &&
      streak.longest_streak >= 7 &&
      streak.current_streak <= 2
    ) {
      rows.push({
        student_id: studentId,
        tutor_id: tutorId,
        severity: "medium",
        reason_code: "broken_streak",
        message: `${name}'s streak dropped after a strong ${streak.longest_streak}-day run (now ${streak.current_streak}).`,
        suggested_action: "Celebrate past consistency and set a smaller daily goal for this week.",
      });
    }

    const { data: overdueLessons } = await admin
      .from("lessons")
      .select("id, title, due_at, subject_id")
      .not("due_at", "is", null)
      .lte("due_at", now.toISOString())
      .eq("assigned_student_id", studentId);

    const subIds = [...new Set((overdueLessons ?? []).map((l) => l.subject_id))];
    const { data: subjRows } = await admin
      .from("subjects")
      .select("id, title")
      .in("id", subIds.length ? subIds : ["00000000-0000-0000-0000-000000000000"]);
    const subjTitle = new Map((subjRows ?? []).map((s) => [s.id, s.title]));

    for (const l of overdueLessons ?? []) {
      const { data: pr } = await admin
        .from("progress_records")
        .select("completion_pct")
        .eq("student_id", studentId)
        .eq("lesson_id", l.id)
        .maybeSingle();
      const pct = pr?.completion_pct ?? 0;
      if (pct < 100) {
        const subj = subjTitle.get(l.subject_id) ?? "Subject";
        rows.push({
          student_id: studentId,
          tutor_id: tutorId,
          severity: "high",
          reason_code: "overdue_lesson",
          message: `${name} has an overdue assignment: ${l.title} (${subj}).`,
          suggested_action: "Reschedule or break the lesson into two shorter sessions.",
        });
      }
    }

    const recent = (attempts ?? []).slice(0, 12);
    const older = (attempts ?? []).slice(12, 24);
    const avg = (xs: typeof attempts) => {
      if (!xs?.length) return null;
      let s = 0,
        c = 0;
      for (const a of xs) {
        if (a.result === "correct") {
          s += 1;
          c += 1;
        } else if (a.result === "partial") {
          s += 0.5;
          c += 1;
        } else if (a.result === "incorrect") {
          c += 1;
        }
      }
      return c ? s / c : null;
    };
    const r1 = avg(recent);
    const r2 = avg(older);
    if (r1 !== null && r2 !== null && r1 < r2 - 0.2 && recent.length >= 6) {
      rows.push({
        student_id: studentId,
        tutor_id: tutorId,
        severity: "low",
        reason_code: "performance_drop",
        message: `${name}'s recent accuracy is lower than the prior window.`,
        suggested_action: "Review errors together and reinforce one foundational skill.",
      });
    }
  }

  const dedup = new Map<string, AlertRow>();
  for (const r of rows) {
    const key = `${r.student_id}:${r.reason_code}:${r.message}`;
    const existing = dedup.get(key);
    const rank: Record<AlertSeverity, number> = {
      low: 1,
      medium: 2,
      high: 3,
    };
    if (!existing || rank[r.severity] > rank[existing.severity]) {
      dedup.set(key, r);
    }
  }

  const finalRows = [...dedup.values()];
  if (finalRows.length) {
    await admin.from("alerts").insert(finalRows);
  }
}
