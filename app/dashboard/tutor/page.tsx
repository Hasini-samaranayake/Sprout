import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth/get-profile";
import { syncAlertsForTutorStudents } from "@/services/alerts/evaluateAlerts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  refreshTutorAlertsAction,
  dismissAlertFormAction,
} from "@/app/actions/tutor";
import {
  TutorNudgeCards,
  type NudgeStudent,
} from "@/components/tutor/tutor-nudge-cards";
import {
  ArrowRight,
  BookOpen,
  MessageCircle,
  Sparkles,
  Timer,
  Flower2,
  Users,
} from "lucide-react";
import { CreateClassForm } from "@/components/tutor/create-class-form";

export default async function TutorDashboardPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const admin = createAdminClient();
  await syncAlertsForTutorStudents(admin, profile.id);

  const { data: links } = await supabase
    .from("tutor_student_links")
    .select("student_id")
    .eq("tutor_id", profile.id);

  const studentIds = (links ?? []).map((l) => l.student_id);
  const { data: studentProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]
    );

  const nameById = new Map(
    (studentProfiles ?? []).map((p) => [
      p.id,
      p.full_name ?? p.email ?? "Student",
    ])
  );

  const emailById = new Map(
    (studentProfiles ?? []).map((p) => [p.id, p.email ?? null])
  );

  const now = new Date();

  const metrics = await Promise.all(
    studentIds.map(async (sid) => {
      const name = nameById.get(sid) ?? "Student";

      const { data: progress } = await supabase
        .from("progress_records")
        .select("completion_pct")
        .eq("student_id", sid)
        .not("subject_id", "is", null);

      const avgProgress =
        progress?.length && progress.length > 0
          ? progress.reduce((a, p) => a + Number(p.completion_pct), 0) /
            progress.length
          : 0;

      const { data: streak } = await supabase
        .from("streak_records")
        .select("current_streak, last_activity_date")
        .eq("student_id", sid)
        .maybeSingle();

      const { data: lastAct } = await supabase
        .from("activity_events")
        .select("occurred_at")
        .eq("student_id", sid)
        .order("occurred_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastAt = lastAct?.occurred_at
        ? new Date(lastAct.occurred_at)
        : null;
      const inactiveDays = lastAt
        ? Math.floor(
            (now.getTime() - lastAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : null;

      const { data: attempts } = await supabase
        .from("task_attempts")
        .select("result, score")
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(40);

      let sum = 0,
        c = 0;
      let incorrect = 0;
      for (const a of attempts ?? []) {
        sum += Number(a.score);
        c += 1;
        if (a.result === "incorrect") incorrect += 1;
      }
      const avgScore = c ? sum / c : 0;

      const { data: lessonsDone } = await supabase
        .from("progress_records")
        .select("completion_pct")
        .eq("student_id", sid)
        .not("lesson_id", "is", null);

      const lessonRates =
        (lessonsDone ?? []).map((x) => Number(x.completion_pct)) ?? [];
      const lessonAvg =
        lessonRates.length > 0
          ? lessonRates.reduce((a, b) => a + b, 0) / lessonRates.length
          : 0;

      const { data: latestAttempt } = await supabase
        .from("task_attempts")
        .select("lesson_id, created_at, result")
        .eq("student_id", sid)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let latestHomework: NudgeStudent["latestHomework"] = null;
      if (latestAttempt?.lesson_id) {
        const { data: lessonRow } = await supabase
          .from("lessons")
          .select("title")
          .eq("id", latestAttempt.lesson_id)
          .maybeSingle();
        if (lessonRow) {
          latestHomework = {
            lessonTitle: lessonRow.title,
            result: latestAttempt.result,
            createdAt: latestAttempt.created_at,
          };
        }
      }

      return {
        id: sid,
        name,
        avgProgress,
        streak: streak?.current_streak ?? 0,
        lastActivity: lastAct?.occurred_at ?? null,
        inactiveDays,
        avgScore,
        struggling: incorrect,
        lessonAvg,
        latestHomework,
      };
    })
  );

  const { data: alerts } = await supabase
    .from("alerts")
    .select(
      "id, student_id, severity, message, suggested_action, reason_code"
    )
    .eq("tutor_id", profile.id)
    .is("dismissed_at", null)
    .order("severity", { ascending: false })
    .limit(20);

  const alertByStudent = new Map<
    string,
    { severity: "high" | "medium" | "low" }
  >();
  for (const a of alerts ?? []) {
    const cur = alertByStudent.get(a.student_id);
    const rank = (s: string) =>
      s === "high" ? 3 : s === "medium" ? 2 : 1;
    if (
      !cur ||
      rank(a.severity) > rank(cur.severity)
    ) {
      alertByStudent.set(a.student_id, {
        severity: a.severity as "high" | "medium" | "low",
      });
    }
  }

  const nudgeStudents: NudgeStudent[] = metrics.map((m) => ({
    id: m.id,
    name: m.name,
    email: emailById.get(m.id) ?? null,
    avgProgress: m.avgProgress,
    streak: m.streak,
    lastActivity: m.lastActivity,
    inactiveDays: m.inactiveDays,
    latestHomework: m.latestHomework,
    alertSeverity: alertByStudent.get(m.id)?.severity ?? null,
    consistencyBadge: m.streak >= 5 && m.avgProgress >= 70,
  }));

  const topAlert = (alerts ?? [])[0];
  const submissionCount = (alerts ?? []).length;

  const { data: unreadHelpRows } = await supabase
    .from("help_requests")
    .select("id")
    .eq("tutor_id", profile.id)
    .is("read_at", null);
  const unreadHelpCount = (unreadHelpRows ?? []).length;

  const { data: latestHelp } = await supabase
    .from("help_requests")
    .select("id, body, created_at, read_at")
    .eq("tutor_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: tutorClasses } = await supabase
    .from("tutor_classes")
    .select("id, title, code, created_at, subjects(title)")
    .eq("tutor_id", profile.id)
    .order("created_at", { ascending: false });

  const { data: catalogSubjects } = await supabase
    .from("subjects")
    .select("id, title")
    .order("title", { ascending: true });

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-sprout-on-surface md:text-4xl">
            Welcome back, Tutor!
          </h1>
          <p className="mt-2 text-lg text-sprout-on-surface-variant">
            You have{" "}
            <span className="font-bold text-primary">{submissionCount}</span>{" "}
            submission{submissionCount === 1 ? "" : "s"} to review today.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form action={refreshTutorAlertsAction}>
            <Button type="submit" variant="outline" size="sm" className="rounded-full">
              Refresh alerts
            </Button>
          </form>
          <Button
            type="button"
            variant="outline"
            className="rounded-full bg-sprout-surface-container-highest font-semibold"
            disabled
            title="Coming soon"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Weekly report
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-primary/40 font-semibold"
            asChild
          >
            <Link href="/dashboard/tutor/assign-homework">Assign homework</Link>
          </Button>
          <Button
            type="button"
            className="rounded-full bg-gradient-to-br from-[var(--sprout-gradient-from)] to-[var(--sprout-gradient-to)] font-bold text-[var(--sprout-on-primary-container)] shadow-lg"
            asChild
          >
            <Link href="/dashboard/tutor/whiteboard">+ New lesson</Link>
          </Button>
        </div>
      </div>

      <Card className="border-sprout-outline-variant/20 bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sprout-primary-container/30">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Help requests</CardTitle>
              <CardDescription>
                {unreadHelpCount > 0
                  ? `${unreadHelpCount} unread from students`
                  : "No unread messages"}
              </CardDescription>
            </div>
          </div>
          <Link
            href="/dashboard/tutor/help"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "shrink-0 bg-teal-700 hover:bg-teal-800"
            )}
          >
            Open inbox
          </Link>
        </CardHeader>
        {latestHelp && (
          <CardContent className="pt-0">
            <p className="line-clamp-2 text-sm text-sprout-on-surface-variant">
              {latestHelp.body}
            </p>
            <p className="mt-1 text-xs text-sprout-on-surface-variant">
              {new Date(latestHelp.created_at).toLocaleString()}
            </p>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card className="relative overflow-hidden border-sprout-outline-variant/20 bg-sprout-surface-container lg:col-span-8">
          <CardHeader className="relative z-10 space-y-4 pb-2">
            <span className="inline-flex w-fit rounded-full bg-sprout-tertiary-container px-4 py-1 text-xs font-bold uppercase tracking-wider text-sprout-on-tertiary-container">
              Priority insight
            </span>
            {topAlert ? (
              <>
                <CardTitle className="max-w-lg text-2xl font-bold leading-snug text-sprout-on-surface">
                  {topAlert.message}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href={`/students/${topAlert.student_id}`}
                    className="flex items-center gap-2 font-bold text-primary hover:underline"
                  >
                    Take action now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <form action={dismissAlertFormAction}>
                    <input type="hidden" name="alertId" value={topAlert.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Dismiss
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <p className="text-sprout-on-surface-variant">
                No active priority alerts. Great job staying on top of things.
              </p>
            )}
          </CardHeader>
          <Flower2
            className="pointer-events-none absolute -bottom-8 -right-8 h-48 w-48 text-sprout-on-surface-variant/10"
            aria-hidden
          />
        </Card>

        <Card className="border-sprout-outline-variant/20 bg-sprout-secondary-container lg:col-span-4">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
              <Timer className="h-8 w-8 text-sprout-on-secondary-container" />
            </div>
            <div>
              <p className="text-4xl font-black text-sprout-on-secondary-container">
                1.5h
              </p>
              <p className="mt-1 font-medium text-sprout-on-secondary-container/90">
                Avg. grading time saved this week
              </p>
              <p className="mt-2 text-xs text-sprout-on-secondary-container/70">
                Estimated from streak and review signals (not persisted yet).
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <TutorNudgeCards students={nudgeStudents} />

      <section className="rounded-3xl bg-sprout-surface-container p-8">
        <div className="mb-8 flex flex-wrap items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-sprout-on-surface">
              Recommended resources
            </h2>
            <p className="text-sprout-on-surface-variant">
              Guide your students with these curated materials.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Leaf types guide", icon: "article" },
            { t: "Photosynthesis 101", icon: "video" },
            { t: "Soil health quiz", icon: "quiz" },
            { t: "Root lab activity", icon: "lab" },
          ].map((r) => (
            <a
              key={r.t}
              href="https://sprout.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="rounded-lg bg-sprout-primary-container/20 p-2 text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-sprout-on-surface">
                {r.t}
              </span>
            </a>
          ))}
        </div>
      </section>

      <Card className="border-sprout-outline-variant/20 bg-card">
        <CardHeader>
          <CardTitle>Your students</CardTitle>
          <CardDescription>
            Progress, streaks, and recent performance at a glance.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead className="text-right">Avg subject %</TableHead>
                <TableHead className="text-right">Lesson rate</TableHead>
                <TableHead className="text-right">Streak</TableHead>
                <TableHead className="text-right">Avg score</TableHead>
                <TableHead className="text-right">Recent misses</TableHead>
                <TableHead>Last activity</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(m.avgProgress)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(m.lessonAvg)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.streak}d
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Math.round(m.avgScore * 100)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {m.struggling}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.lastActivity
                      ? new Date(m.lastActivity).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/students/${m.id}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" })
                      )}
                    >
                      Open
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
