import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
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

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect("/dashboard/tutor");
  }

  const supabase = await createClient();

  const { data: enr } = await supabase
    .from("enrollments")
    .select("id")
    .eq("student_id", profile.id)
    .eq("subject_id", id)
    .maybeSingle();

  if (!enr) notFound();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, title, description")
    .eq("id", id)
    .single();

  if (!subject) notFound();

  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, title, order_index, due_at")
    .eq("subject_id", id)
    .order("order_index", { ascending: true });

  const lessonIds = (lessons ?? []).map((l) => l.id);
  const { data: steps } = await supabase
    .from("lesson_steps")
    .select("lesson_id")
    .in("lesson_id", lessonIds);

  const stepCountByLesson = new Map<string, number>();
  for (const s of steps ?? []) {
    stepCountByLesson.set(
      s.lesson_id,
      (stepCountByLesson.get(s.lesson_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-500">
          <Link href="/dashboard/student" className="hover:text-teal-800">
            Dashboard
          </Link>{" "}
          / Subject
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {subject.title}
        </h1>
        {subject.description && (
          <p className="mt-2 max-w-2xl text-stone-600">{subject.description}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-stone-900">Lessons</h2>
        {(lessons ?? []).map((lesson) => (
          <Card key={lesson.id} className="border-stone-200">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">{lesson.title}</CardTitle>
                <CardDescription>
                  {stepCountByLesson.get(lesson.id) ?? 0} steps
                  {lesson.due_at && (
                    <span className="ml-2">
                      · Due{" "}
                      {new Date(lesson.due_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex shrink-0 gap-2">
                {lesson.due_at &&
                  new Date(lesson.due_at) < new Date() && (
                    <Badge variant="outline" className="border-amber-200 text-amber-900">
                      Past due
                    </Badge>
                  )}
                <Link
                  href={`/lessons/${lesson.id}`}
                  className={cn(
                    buttonVariants({ size: "sm" }),
                    "bg-teal-700 text-white hover:bg-teal-800"
                  )}
                >
                  Open
                </Link>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-stone-600">
              Guided steps, one at a time — submit answers for immediate feedback.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
