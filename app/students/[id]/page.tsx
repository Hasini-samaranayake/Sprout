import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AttemptsChart } from "@/components/tutor/attempts-chart";
import { TutorNoteForm } from "@/components/tutor/tutor-note-form";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TutorStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: studentId } = await params;
  const profile = await getProfile();
  if (!profile || profile.role !== "tutor") return null;

  const supabase = await createClient();

  const { data: link } = await supabase
    .from("tutor_student_links")
    .select("id")
    .eq("tutor_id", profile.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!link) notFound();

  const { data: student } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("id", studentId)
    .single();

  if (!student) notFound();

  const { data: progress } = await supabase
    .from("progress_records")
    .select("subject_id, lesson_id, completion_pct")
    .eq("student_id", studentId);

  const subjIds = [
    ...new Set(
      (progress ?? [])
        .map((p) => p.subject_id)
        .filter((x): x is string => x !== null)
    ),
  ];
  const { data: subjRows } = await supabase
    .from("subjects")
    .select("id, title")
    .in(
      "id",
      subjIds.length ? subjIds : ["00000000-0000-0000-0000-000000000000"]
    );
  const subjTitle = new Map((subjRows ?? []).map((s) => [s.id, s.title]));

  const { data: streak } = await supabase
    .from("streak_records")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("score, created_at, result, task_id")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(120);

  const attemptTaskIds = [...new Set((attempts ?? []).map((a) => a.task_id))];
  const { data: taskMeta } = await supabase
    .from("tasks")
    .select("id, topic_tag")
    .in(
      "id",
      attemptTaskIds.length
        ? attemptTaskIds
        : ["00000000-0000-0000-0000-000000000000"]
    );
  const topicByTask = new Map(
    (taskMeta ?? []).map((t) => [t.id, t.topic_tag ?? "topic"])
  );

  const byDay = new Map<string, { sum: number; n: number }>();
  for (const a of [...(attempts ?? [])].reverse()) {
    const day = new Date(a.created_at).toISOString().slice(0, 10);
    const cur = byDay.get(day) ?? { sum: 0, n: 0 };
    cur.sum += Number(a.score);
    cur.n += 1;
    byDay.set(day, cur);
  }
  const chartData = [...byDay.entries()]
    .slice(-14)
    .map(([day, v]) => ({
      day,
      score: v.n ? v.sum / v.n : 0,
    }));

  const { data: notes } = await supabase
    .from("tutor_notes")
    .select("id, body, created_at")
    .eq("tutor_id", profile.id)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });

  const { data: alerts } = await supabase
    .from("alerts")
    .select("severity, message, suggested_action")
    .eq("tutor_id", profile.id)
    .eq("student_id", studentId)
    .is("dismissed_at", null);

  const subjectRows = (progress ?? []).filter((p) => p.subject_id);
  const lessonRows = (progress ?? []).filter((p) => p.lesson_id);

  const recentSubs = (attempts ?? []).slice(0, 12);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-stone-500">
          <Link href="/dashboard/tutor" className="hover:text-teal-800">
            Tutor home
          </Link>{" "}
          / Student
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {student.full_name ?? student.email}
        </h1>
        <p className="mt-1 text-sm text-stone-600">{student.email}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Current streak</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {streak?.current_streak ?? 0}{" "}
              <span className="text-lg font-normal text-stone-500">days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            Longest: {streak?.longest_streak ?? 0} · Last active day:{" "}
            {streak?.last_activity_date ?? "—"}
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Subjects tracked</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {subjectRows.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            Avg completion across subjects:{" "}
            {subjectRows.length
              ? Math.round(
                  subjectRows.reduce(
                    (a, p) => a + Number(p.completion_pct),
                    0
                  ) / subjectRows.length
                )
              : 0}
            %
          </CardContent>
        </Card>
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Lessons with progress rows</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {lessonRows.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            Lesson completion rate (avg):{" "}
            {lessonRows.length
              ? Math.round(
                  lessonRows.reduce(
                    (a, p) => a + Number(p.completion_pct),
                    0
                  ) / lessonRows.length
                )
              : 0}
            %
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle>Performance trend</CardTitle>
          <CardDescription>
            Average score by calendar day (recent 14 days with activity).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttemptsChart data={chartData} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Subject breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {subjectRows.length === 0 ? (
              <p className="text-stone-600">No subject progress yet.</p>
            ) : (
              subjectRows.map((p) => (
                <div
                  key={String(p.subject_id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2"
                >
                  <span className="text-stone-800">
                    {p.subject_id
                      ? subjTitle.get(p.subject_id) ?? "Subject"
                      : "Subject"}
                  </span>
                  <span className="tabular-nums text-stone-600">
                    {Math.round(Number(p.completion_pct))}%
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Active alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {(alerts ?? []).length === 0 ? (
              <p className="text-stone-600">No open alerts.</p>
            ) : (
              (alerts ?? []).map((a, i) => (
                <div key={i} className="rounded-lg border border-stone-100 p-3">
                  <Badge variant="secondary" className="mb-1">
                    {a.severity}
                  </Badge>
                  <p className="text-stone-800">{a.message}</p>
                  {a.suggested_action && (
                    <p className="mt-1 text-stone-600">{a.suggested_action}</p>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle>Recent submissions</CardTitle>
          <CardDescription>Latest attempts (most recent first).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recentSubs.length === 0 ? (
            <p className="text-stone-600">No attempts yet.</p>
          ) : (
            recentSubs.map((a) => (
              <div
                key={`${a.created_at}-${a.result}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2 last:border-0"
              >
                <span className="capitalize text-stone-800">{a.result}</span>
                <span className="text-xs text-stone-500">
                  {new Date(a.created_at).toLocaleString()}
                </span>
                <span className="text-xs text-stone-500">
                  {topicByTask.get(a.task_id) ?? "topic"}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Separator />

      <Card id="note" className="scroll-mt-24 border-stone-200">
        <CardHeader>
          <CardTitle>Tutor notes</CardTitle>
          <CardDescription>
            Private notes visible only to you. Add quick context after sessions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <TutorNoteForm studentId={studentId} />
          <div className="space-y-2">
            {(notes ?? []).map((n) => (
              <div
                key={n.id}
                className="rounded-lg border border-stone-100 bg-stone-50/80 p-3 text-sm text-stone-800"
              >
                <p>{n.body}</p>
                <p className="mt-2 text-xs text-stone-500">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Link
        href="/dashboard/tutor"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Back to roster
      </Link>
    </div>
  );
}
