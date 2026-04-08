import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { getOrCreateHomeworkSubmissionDraft } from "@/app/actions/homework-submission";
import { AnnotationWorkspace } from "@/components/homework/annotation-workspace";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type TaskOptions = {
  homeworkImageUrl?: string;
  homeworkWorkspace?: boolean;
};

export default async function AnnotatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const { id: lessonId } = await params;
  const sp = await searchParams;
  const taskId = sp.task;
  if (!taskId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sprout-on-surface-variant">
          Missing <code className="font-mono">task</code> query. Open this page
          from a lesson step that supports the homework workspace.
        </p>
        <Link
          href={`/lessons/${lessonId}`}
          className={cn(buttonVariants(), "mt-4")}
        >
          Back to lesson
        </Link>
      </div>
    );
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "student") {
    redirect("/login");
  }

  const supabase = await createClient();

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id, title, subject_id, due_at")
    .eq("id", lessonId)
    .single();

  if (!lesson) notFound();

  const { data: enr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("subject_id", lesson.subject_id)
    .maybeSingle();

  if (!enr) notFound();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, prompt, options")
    .eq("id", taskId)
    .single();

  if (!task) notFound();

  const { data: step } = await supabase
    .from("lesson_steps")
    .select("id")
    .eq("lesson_id", lessonId)
    .eq("task_id", taskId)
    .maybeSingle();

  if (!step) notFound();

  const opts = task.options as TaskOptions | null;
  const imageUrl =
    opts?.homeworkImageUrl?.trim() ||
    "/placeholder-homework.svg";

  const draft = await getOrCreateHomeworkSubmissionDraft({
    lessonId,
    taskId,
  });

  if (!draft.ok) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
        {draft.error}
      </div>
    );
  }

  const { data: link } = await supabase
    .from("tutor_student_links")
    .select("tutor_id")
    .eq("student_id", profile.id)
    .maybeSingle();

  let tutorName = "your tutor";
  let tutorEmail: string | null = null;
  if (link?.tutor_id) {
    const { data: tp } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", link.tutor_id)
      .maybeSingle();
    tutorName = tp?.full_name ?? tp?.email ?? tutorName;
    tutorEmail = tp?.email ?? null;
  }

  const { data: lastNoteRow } = await supabase
    .from("homework_submissions")
    .select("comment_text")
    .eq("student_id", profile.id)
    .not("comment_text", "is", null)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const recentCommentPreview =
    lastNoteRow?.comment_text?.trim().slice(0, 80) ?? null;

  return (
    <AnnotationWorkspace
      lessonId={lessonId}
      lessonTitle={lesson.title}
      taskPrompt={task.prompt}
      submissionId={draft.submissionId}
      imageUrl={imageUrl}
      dueAt={lesson.due_at}
      tutorEmail={tutorEmail}
      tutorName={tutorName}
      recentCommentPreview={recentCommentPreview}
    />
  );
}
