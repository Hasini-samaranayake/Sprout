"use client";

import { useMemo, useState, useTransition } from "react";
import { assignHomeworkLessonAction } from "@/app/actions/assign-homework";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export type AssignHomeworkStudent = { id: string; name: string };
export type AssignHomeworkLesson = {
  id: string;
  title: string;
  subjectId: string;
  subjectTitle: string;
};
export type AssignHomeworkEnrollment = {
  studentId: string;
  subjectId: string;
};

export function AssignHomeworkForm({
  students,
  lessons,
  enrollments,
}: {
  students: AssignHomeworkStudent[];
  lessons: AssignHomeworkLesson[];
  enrollments: AssignHomeworkEnrollment[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [lessonId, setLessonId] = useState("");
  const [dueLocal, setDueLocal] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const lessonOptions = useMemo(() => {
    if (!studentId) return [];
    const subjectIds = new Set(
      enrollments
        .filter((e) => e.studentId === studentId)
        .map((e) => e.subjectId)
    );
    return lessons.filter((l) => subjectIds.has(l.subjectId));
  }, [studentId, enrollments, lessons]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);
    if (!studentId || !lessonId || !dueLocal) {
      setError("Choose a student, a lesson, and a due date.");
      return;
    }
    const fd = new FormData();
    fd.set("student_id", studentId);
    fd.set("lesson_id", lessonId);
    fd.set("due_at", dueLocal);
    startTransition(async () => {
      const r = await assignHomeworkLessonAction(fd);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setDone(true);
    });
  }

  if (students.length === 0) {
    return (
      <p className="text-sm text-sprout-on-surface-variant">
        Link at least one student before assigning homework.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-lg space-y-6">
      <div className="space-y-2">
        <Label htmlFor="assign-student">Student</Label>
        <select
          id="assign-student"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={studentId}
          onChange={(e) => {
            setStudentId(e.target.value);
            setLessonId("");
          }}
        >
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assign-lesson">Lesson</Label>
        <select
          id="assign-lesson"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={lessonId}
          onChange={(e) => setLessonId(e.target.value)}
          disabled={lessonOptions.length === 0}
        >
          <option value="">
            {lessonOptions.length === 0
              ? "No lessons for this student’s subjects"
              : "Select a lesson"}
          </option>
          {lessonOptions.map((l) => (
            <option key={l.id} value={l.id}>
              {l.subjectTitle}: {l.title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="assign-due">Due</Label>
        <input
          id="assign-due"
          type="datetime-local"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={dueLocal}
          onChange={(e) => setDueLocal(e.target.value)}
        />
      </div>

      {error && (
        <p className="text-sm font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
      {done && (
        <p className="text-sm font-medium text-primary">
          Homework assigned. The student will see it under Due work.
        </p>
      )}

      <Button type="submit" disabled={pending || lessonOptions.length === 0}>
        {pending ? "Saving…" : "Assign homework"}
      </Button>
    </form>
  );
}
