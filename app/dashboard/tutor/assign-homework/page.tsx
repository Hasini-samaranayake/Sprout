import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  AssignHomeworkForm,
  type AssignHomeworkEnrollment,
  type AssignHomeworkLesson,
  type AssignHomeworkStudent,
} from "@/components/tutor/assign-homework-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const NIL = "00000000-0000-0000-0000-000000000000";

export default async function AssignHomeworkPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: links } = await supabase
    .from("tutor_student_links")
    .select("student_id")
    .eq("tutor_id", profile.id);

  const studentIds = (links ?? []).map((l) => l.student_id);

  const { data: studentProfiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", studentIds.length ? studentIds : [NIL]);

  const students: AssignHomeworkStudent[] = (studentProfiles ?? []).map(
    (p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? "Student",
    })
  );

  const { data: enrollRows } = await supabase
    .from("enrollments")
    .select("student_id, subject_id")
    .in("student_id", studentIds.length ? studentIds : [NIL]);

  const enrollments: AssignHomeworkEnrollment[] = (enrollRows ?? []).map(
    (e) => ({
      studentId: e.student_id,
      subjectId: e.subject_id,
    })
  );

  const subjectIds = [...new Set(enrollments.map((e) => e.subjectId))];

  const { data: lessonsRaw } = await supabase
    .from("lessons")
    .select("id, title, subject_id, subjects ( title )")
    .in("subject_id", subjectIds.length ? subjectIds : [NIL]);

  const lessonIds = (lessonsRaw ?? []).map((l) => l.id);
  const { data: stepRows } = await supabase
    .from("lesson_steps")
    .select("lesson_id")
    .in("lesson_id", lessonIds.length ? lessonIds : [NIL]);

  const withSteps = new Set((stepRows ?? []).map((s) => s.lesson_id));

  const lessons: AssignHomeworkLesson[] = (lessonsRaw ?? [])
    .filter((l) => withSteps.has(l.id))
    .map((l) => {
      const sub = l.subjects as { title?: string } | null;
      return {
        id: l.id,
        title: l.title,
        subjectId: l.subject_id,
        subjectTitle: sub?.title ?? "Subject",
      };
    });

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tutor"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Tutor home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sprout-on-surface md:text-3xl">
          Assign homework
        </h1>
        <p className="mt-1 text-sm text-sprout-on-surface-variant">
          Set a due date and assign an existing lesson to a linked student. They
          will see it under Due work on their dashboard.
        </p>
      </div>

      <Card className="border-sprout-outline-variant/20">
        <CardHeader>
          <CardTitle>Lesson &amp; due date</CardTitle>
          <CardDescription>
            Only lessons in subjects the student is enrolled in are listed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AssignHomeworkForm
            students={students}
            lessons={lessons}
            enrollments={enrollments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
