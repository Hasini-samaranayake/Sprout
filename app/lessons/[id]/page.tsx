import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { LessonRunner } from "@/components/lesson/lesson-runner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function LessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, subject_id, subjects(title)")
    .eq("id", id)
    .single();

  if (!lesson) notFound();

  const subjectTitle =
    (lesson.subjects as { title?: string } | null)?.title ?? "Subject";

  if (profile.role === "student") {
    const { data: enr } = await supabase
      .from("enrollments")
      .select("id")
      .eq("student_id", profile.id)
      .eq("subject_id", lesson.subject_id)
      .maybeSingle();
    if (!enr) notFound();
  } else {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Lessons are optimized for students. Open a linked student account
              to try the full guided flow.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard/tutor"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              Back to tutor home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: steps } = await supabase
    .from("lesson_steps")
    .select(
      "id, order_index, title, tasks ( id, type, prompt, options, hint_text )"
    )
    .eq("lesson_id", id)
    .order("order_index", { ascending: true });

  const normalized =
    (steps ?? []).map((s) => ({
      ...s,
      tasks: Array.isArray(s.tasks) ? s.tasks[0] : s.tasks,
    })) ?? [];

  const firstTaskId = normalized.find((s) => s.tasks)?.tasks?.id;
  const validTaskIds = new Set(
    normalized.map((s) => s.tasks?.id).filter(Boolean) as string[]
  );
  let initialTaskId = sp.task ?? firstTaskId;
  if (initialTaskId && !validTaskIds.has(initialTaskId)) {
    initialTaskId = firstTaskId;
  }

  if (!initialTaskId) {
    return (
      <p className="text-sm text-stone-600">This lesson has no steps yet.</p>
    );
  }

  return (
    <LessonRunner
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      subjectTitle={subjectTitle}
      steps={normalized as never}
      initialTaskId={initialTaskId}
    />
  );
}
