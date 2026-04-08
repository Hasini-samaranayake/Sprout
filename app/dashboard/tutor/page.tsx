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
import { Badge } from "@/components/ui/badge";
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
    .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  const nameById = new Map(
    (studentProfiles ?? []).map((p) => [
      p.id,
      p.full_name ?? p.email ?? "Student",
    ])
  );

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

      return {
        id: sid,
        name,
        avgProgress,
        streak: streak?.current_streak ?? 0,
        lastActivity: lastAct?.occurred_at ?? null,
        avgScore,
        struggling: incorrect,
        lessonAvg,
      };
    })
  );

  const { data: alerts } = await supabase
    .from("alerts")
    .select("id, student_id, severity, message, suggested_action")
    .eq("tutor_id", profile.id)
    .is("dismissed_at", null)
    .order("severity", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">
            Tutor overview
          </h1>
          <p className="mt-1 text-stone-600">
            Who needs a check-in, and what should you do next?
          </p>
        </div>
        <form action={refreshTutorAlertsAction}>
          <Button type="submit" variant="outline" size="sm">
            Refresh alerts
          </Button>
        </form>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle>Risk & follow-up</CardTitle>
          <CardDescription>
            Rule-based signals from activity, attempts, streaks, and due work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(alerts ?? []).length === 0 ? (
            <p className="text-sm text-stone-600">No active alerts.</p>
          ) : (
            (alerts ?? []).map((a) => {
              const name = nameById.get(a.student_id) ?? "Student";
              const sev = a.severity;
              return (
                <div
                  key={a.id}
                  className="flex flex-col gap-2 rounded-xl border border-stone-100 bg-stone-50/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-stone-900">{name}</p>
                      <Badge
                        variant={sev === "high" ? "destructive" : "secondary"}
                      >
                        {sev}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-stone-700">{a.message}</p>
                    {a.suggested_action && (
                      <p className="mt-2 text-sm text-stone-600">
                        <span className="font-medium text-stone-700">
                          Suggested:
                        </span>{" "}
                        {a.suggested_action}
                      </p>
                    )}
                  </div>
                  <form action={dismissAlertFormAction} className="shrink-0">
                    <input type="hidden" name="alertId" value={a.id} />
                    <Button type="submit" size="sm" variant="ghost">
                      Dismiss
                    </Button>
                  </form>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-stone-200">
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
                  <TableCell className="text-xs text-stone-500">
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
