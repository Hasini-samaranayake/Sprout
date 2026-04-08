import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { getNextRecommendedStep } from "@/lib/student/next-step";
import { computeMomentum } from "@/lib/student/momentum";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

export default async function StudentDashboardPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("subject_id, subjects(id, title, slug, description)")
    .eq("student_id", profile.id);

  const { data: streak } = await supabase
    .from("streak_records")
    .select("current_streak, longest_streak, last_activity_date")
    .eq("student_id", profile.id)
    .maybeSingle();

  const { data: activity } = await supabase
    .from("activity_events")
    .select("type, occurred_at, metadata")
    .eq("student_id", profile.id)
    .order("occurred_at", { ascending: false })
    .limit(8);

  const { data: attempts } = await supabase
    .from("task_attempts")
    .select("score, created_at")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(12);

  const scores = (attempts ?? []).map((a) => Number(a.score));
  const momentum = computeMomentum(scores);

  const nextStep = await getNextRecommendedStep(supabase, profile.id);

  const { data: progressRows } = await supabase
    .from("progress_records")
    .select("subject_id, completion_pct")
    .eq("student_id", profile.id)
    .not("subject_id", "is", null);

  const avgProgress =
    progressRows?.length && progressRows.length > 0
      ? progressRows.reduce((a, p) => a + Number(p.completion_pct), 0) /
        progressRows.length
      : 0;

  const enrolledSubjectIds = new Set(
    (enrollments ?? []).map((e) => e.subject_id)
  );

  const { data: datedLessons } = await supabase
    .from("lessons")
    .select("id, title, due_at, subject_id, assigned_student_id")
    .not("due_at", "is", null)
    .order("due_at", { ascending: true });

  const subjectTitle = (id: string) => {
    const row = (enrollments ?? []).find((e) => e.subject_id === id);
    const sub = row?.subjects as { title?: string } | null;
    return sub?.title ?? "Subject";
  };

  const datedFiltered = (datedLessons ?? []).filter(
    (l) =>
      enrolledSubjectIds.has(l.subject_id) &&
      (l.assigned_student_id === null ||
        l.assigned_student_id === profile.id)
  );

  const nowIso = new Date().toISOString();
  const overdue = datedFiltered.filter((l) => l.due_at && l.due_at < nowIso);
  const upcomingFiltered = datedFiltered.filter(
    (l) => l.due_at && l.due_at >= nowIso
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
          Welcome back{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h1>
        <p className="mt-1 text-stone-600">
          One step at a time — here is what matters today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Overall progress</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {Math.round(avgProgress)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={avgProgress} className="h-2" />
            <p className="mt-2 text-xs text-stone-500">
              Averaged across your enrolled subjects.
            </p>
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Current streak</CardDescription>
            <CardTitle className="text-3xl font-semibold tabular-nums">
              {streak?.current_streak ?? 0}{" "}
              <span className="text-lg font-normal text-stone-500">days</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            Best: {streak?.longest_streak ?? 0} days. Activity on a day keeps the
            streak alive.
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader className="pb-2">
            <CardDescription>Momentum</CardDescription>
            <CardTitle className="flex items-center gap-2 text-xl font-semibold">
              {momentum.label}
              <Badge variant="secondary" className="font-normal">
                {Math.round(momentum.value * 100)}% recent
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-stone-600">
            {momentum.detail}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Next recommended step</CardTitle>
            <CardDescription>
              Continue where you left off — one focused step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextStep ? (
              <>
                <div>
                  <p className="text-sm font-medium text-stone-800">
                    {nextStep.subjectTitle} · {nextStep.lessonTitle}
                  </p>
                  <p className="text-sm text-stone-600">
                    Step {nextStep.stepIndex}: {nextStep.stepTitle}
                  </p>
                </div>
                <Link
                  href={`/lessons/${nextStep.lessonId}?task=${nextStep.taskId}`}
                  className={cn(
                    buttonVariants(),
                    "bg-teal-700 text-white hover:bg-teal-800"
                  )}
                >
                  Continue
                </Link>
              </>
            ) : (
              <p className="text-sm text-stone-600">
                You are caught up on available steps. Nice work.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-stone-200">
          <CardHeader>
            <CardTitle>Due work & upcoming</CardTitle>
            <CardDescription>
              Assigned items and scheduled due dates in your subjects.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {overdue.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-amber-800">
                  Needs attention
                </p>
                <div className="space-y-2">
                  {overdue.map((l) => (
                    <div
                      key={`o-${l.id}`}
                      className="flex items-start justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-stone-800">{l.title}</p>
                        <p className="text-xs text-stone-500">
                          {subjectTitle(l.subject_id)}
                        </p>
                      </div>
                      <span className="text-xs text-amber-800 tabular-nums">
                        Due{" "}
                        {l.due_at
                          ? new Date(l.due_at).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcomingFiltered.length === 0 && overdue.length === 0 ? (
              <p className="text-stone-600">No dated assignments right now.</p>
            ) : (
              upcomingFiltered.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-stone-100 bg-stone-50/80 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-stone-800">{l.title}</p>
                    <p className="text-xs text-stone-500">
                      {subjectTitle(l.subject_id)}
                    </p>
                  </div>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {l.due_at
                      ? new Date(l.due_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          Active subjects
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(enrollments ?? []).map((e) => {
            const s = e.subjects as unknown as {
              id: string;
              title: string;
              slug: string;
              description: string | null;
            } | null;
            if (!s) return null;
            const pr = progressRows?.find(
              (p) => p.subject_id === s.id
            );
            const pct = pr ? Number(pr.completion_pct) : 0;
            return (
              <Card key={s.id} className="border-stone-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{s.title}</CardTitle>
                  {s.description && (
                    <CardDescription>{s.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-stone-500">Topic progress</span>
                    <span className="font-medium tabular-nums">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                  <Link
                    href={`/subjects/${s.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    Open subject
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-stone-900">
          Recent activity
        </h2>
        <Card className="border-stone-200">
          <CardContent className="divide-y divide-stone-100 px-0 py-0">
            {(activity ?? []).length === 0 ? (
              <p className="p-4 text-sm text-stone-600">
                No activity yet — start a lesson when you are ready.
              </p>
            ) : (
              (activity ?? []).map((a) => (
                <div
                  key={`${a.occurred_at}-${a.type}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="capitalize text-stone-800">
                    {a.type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-stone-500 tabular-nums">
                    {new Date(a.occurred_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Separator />

      <p className="text-xs text-stone-500">
        Streaks use calendar days in UTC. Complete at least one meaningful step
        on a day to keep momentum.
      </p>
    </div>
  );
}
