import Link from "next/link";
import {
  BookOpen,
  Calculator,
  Flame,
  Lightbulb,
  Microscope,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { getNextRecommendedStep } from "@/lib/student/next-step";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CircularSubjectProgress } from "@/components/sprout/circular-subject-progress";
import { SproutGradientButton } from "@/components/sprout/sprout-gradient-button";
import { AskHelpFab } from "@/components/student/ask-help-fab";

const SUBJECT_ICONS = [Calculator, Microscope, BookOpen] as const;
const RING_COLORS = [
  undefined,
  "text-[#3e6752]",
  "text-[#556444]",
] as const;

function greetingLabel() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

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

  const { data: attemptsForStars } = await supabase
    .from("task_attempts")
    .select("result")
    .eq("student_id", profile.id);

  const starsEarned = (attemptsForStars ?? []).filter(
    (a) => a.result === "correct"
  ).length;

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

  const { data: tutorLink } = await supabase
    .from("tutor_student_links")
    .select("tutor_id")
    .eq("student_id", profile.id)
    .maybeSingle();

  const hasTutorLink = Boolean(tutorLink?.tutor_id);

  const { data: savedWhiteboardLessons } = tutorLink?.tutor_id
    ? await supabase
        .from("tutor_whiteboard_lessons")
        .select("id, title, created_at")
        .eq("tutor_id", tutorLink.tutor_id)
        .order("created_at", { ascending: false })
        .limit(6)
    : { data: null };

  const firstName = profile.full_name?.split(" ")[0] ?? "Sprout";

  return (
    <div className="relative space-y-10 pb-4">
      <section className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-sprout-on-surface md:text-4xl">
          {greetingLabel()}, {firstName}!
        </h1>
        <p className="text-lg font-medium text-sprout-on-surface-variant">
          You&apos;ve grown so much today. Ready to learn?
        </p>
        <p className="text-sm text-sprout-on-surface-variant">
          Overall progress: {Math.round(avgProgress)}% across enrolled subjects.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
        <div className="space-y-4 md:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-sprout-on-surface md:text-2xl">
              My subjects
            </h2>
            <Link
              href="/subjects"
              className="text-sm font-semibold text-primary"
            >
              View all / add class
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(enrollments ?? []).map((e, idx) => {
              const s = e.subjects as unknown as {
                id: string;
                title: string;
              } | null;
              if (!s) return null;
              const pr = progressRows?.find((p) => p.subject_id === s.id);
              const pct = pr ? Number(pr.completion_pct) : 0;
              const Icon = SUBJECT_ICONS[idx % SUBJECT_ICONS.length];
              const ringClass = RING_COLORS[idx % RING_COLORS.length];
              return (
                <Link
                  key={s.id}
                  href={`/subjects/${s.id}`}
                  className="flex flex-col items-center rounded-2xl bg-sprout-surface-container-low p-6 text-center transition hover:bg-sprout-surface-container"
                >
                  <CircularSubjectProgress
                    pct={pct}
                    icon={Icon}
                    ringClassName={ringClass}
                  />
                  <p className="mt-3 text-lg font-bold text-sprout-on-surface">
                    {s.title}
                  </p>
                  <p className="text-xs font-medium text-sprout-on-surface-variant">
                    {Math.round(pct)}% done
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl bg-sprout-tertiary-container p-6 md:col-span-4 md:p-8">
          <h2 className="text-xl font-bold text-sprout-on-tertiary-container md:text-2xl">
            My Sprout stats
          </h2>
          <div className="mt-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sprout-primary-container">
                <Star
                  className="h-7 w-7 fill-primary text-primary"
                  aria-hidden
                />
              </div>
              <div>
                <p className="text-3xl font-extrabold tabular-nums text-sprout-on-tertiary-container">
                  {starsEarned}
                </p>
                <p className="text-sm font-semibold text-sprout-on-tertiary-container/90">
                  Stars earned
                </p>
                <p className="text-xs text-sprout-on-tertiary-container/80">
                  One star per correct answer (all time).
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sprout-secondary-container">
                <Flame
                  className="h-7 w-7 text-primary"
                  fill="currentColor"
                  aria-hidden
                />
              </div>
              <div>
                <p className="text-3xl font-extrabold tabular-nums text-sprout-on-tertiary-container">
                  {streak?.current_streak ?? 0}{" "}
                  <span className="text-lg font-semibold">days</span>
                </p>
                <p className="text-sm font-semibold text-sprout-on-tertiary-container/90">
                  Growth streak
                </p>
                <p className="text-xs text-sprout-on-tertiary-container/80">
                  Best: {streak?.longest_streak ?? 0} days.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden rounded-3xl bg-sprout-surface-container-lowest p-8 shadow-[0_12px_32px_-4px_rgba(45,52,48,0.06)] md:p-12">
        <Lightbulb
          className="pointer-events-none absolute right-4 top-4 h-32 w-32 text-primary/10"
          aria-hidden
        />
        <div className="relative z-10 max-w-2xl">
          <span className="mb-4 inline-flex items-center rounded-full bg-sprout-primary-container px-4 py-1.5 text-xs font-bold text-sprout-on-primary-container">
            Daily focus
          </span>
          {nextStep ? (
            <>
              <h2 className="mb-3 text-2xl font-extrabold leading-tight text-sprout-on-surface md:text-3xl">
                {nextStep.lessonTitle}
              </h2>
              <p className="mb-2 text-sm font-medium text-sprout-on-surface-variant">
                {nextStep.subjectTitle} · Step {nextStep.stepIndex}:{" "}
                {nextStep.stepTitle}
              </p>
              <p className="mb-8 text-base text-sprout-on-surface-variant">
                Continue where you left off — one focused step.
              </p>
              <SproutGradientButton
                href={`/lessons/${nextStep.lessonId}?task=${nextStep.taskId}`}
              >
                Start learning
              </SproutGradientButton>
            </>
          ) : (
            <>
              <h2 className="mb-3 text-2xl font-extrabold text-sprout-on-surface">
                You&apos;re caught up
              </h2>
              <p className="text-sprout-on-surface-variant">
                Nice work — there are no new recommended steps right now.
              </p>
            </>
          )}
        </div>
      </section>

      {hasTutorLink && (savedWhiteboardLessons ?? []).length > 0 && (
        <section className="relative overflow-hidden rounded-3xl border border-sprout-outline-variant/20 bg-sprout-surface-container p-8 shadow-[0_12px_32px_-4px_rgba(45,52,48,0.06)] md:p-10">
          <span className="mb-4 inline-flex items-center rounded-full bg-sprout-secondary-container px-4 py-1.5 text-xs font-bold text-sprout-on-secondary-container">
            From your tutor
          </span>
          <h2 className="mb-2 text-xl font-extrabold text-sprout-on-surface md:text-2xl">
            Saved lessons
          </h2>
          <p className="mb-6 text-sm text-sprout-on-surface-variant">
            Whiteboard snapshots your tutor saved for you.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {(savedWhiteboardLessons ?? []).map((lesson) => (
              <li key={lesson.id}>
                <Link
                  href={`/lessons/saved/${lesson.id}`}
                  className="flex flex-col rounded-2xl border border-sprout-outline-variant/30 bg-white p-4 transition hover:border-primary/40 hover:shadow-sm"
                >
                  <span className="font-semibold text-sprout-on-surface">
                    {lesson.title}
                  </span>
                  <span className="mt-1 text-xs text-sprout-on-surface-variant">
                    {new Date(lesson.created_at).toLocaleString()}
                  </span>
                  <span className="mt-3 text-sm font-bold text-primary">
                    View lesson →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div id="due-work" className="scroll-mt-24 space-y-3">
        <h2 className="text-lg font-bold text-sprout-on-surface">
          Due work &amp; upcoming
        </h2>
        <Card className="border-sprout-outline-variant/30 bg-card">
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Assigned items and due dates in your subjects.
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
                      className="flex items-start justify-between gap-2 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-sprout-on-surface">
                          {l.title}
                        </p>
                        <p className="text-xs text-sprout-on-surface-variant">
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
              <p className="text-sprout-on-surface-variant">
                No dated assignments right now.
              </p>
            ) : (
              upcomingFiltered.map((l) => (
                <div
                  key={l.id}
                  className="flex items-start justify-between gap-2 rounded-xl border border-sprout-outline-variant/20 bg-sprout-surface-container-low px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-sprout-on-surface">{l.title}</p>
                    <p className="text-xs text-sprout-on-surface-variant">
                      {subjectTitle(l.subject_id)}
                    </p>
                  </div>
                  <span className="text-xs text-sprout-on-surface-variant tabular-nums">
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
        <h2 className="mb-3 text-lg font-bold text-sprout-on-surface">
          Recent activity
        </h2>
        <Card className="border-sprout-outline-variant/30 bg-card">
          <CardContent className="divide-y divide-border px-0 py-0">
            {(activity ?? []).length === 0 ? (
              <p className="p-4 text-sm text-sprout-on-surface-variant">
                No activity yet — start a lesson when you are ready.
              </p>
            ) : (
              (activity ?? []).map((a) => (
                <div
                  key={`${a.occurred_at}-${a.type}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                >
                  <span className="capitalize text-sprout-on-surface">
                    {a.type.replace("_", " ")}
                  </span>
                  <span className="text-xs text-sprout-on-surface-variant tabular-nums">
                    {new Date(a.occurred_at).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Separator className="bg-border" />

      <p className="text-xs text-sprout-on-surface-variant">
        Streaks use calendar days in UTC. Complete at least one meaningful step
        on a day to keep momentum.
      </p>

      <AskHelpFab hasTutorLink={hasTutorLink} />
    </div>
  );
}
