import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BookOpen,
  Calculator,
  Microscope,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CircularSubjectProgress } from "@/components/sprout/circular-subject-progress";
import { JoinClassForm } from "@/components/student/join-class-form";

const SUBJECT_ICONS = [Calculator, Microscope, BookOpen] as const;
const RING_COLORS = [
  undefined,
  "text-[#3e6752]",
  "text-[#556444]",
] as const;

export default async function SubjectsIndexPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect("/dashboard/tutor");
  }

  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from("enrollments")
    .select("subject_id, subjects(id, title, slug, description)")
    .eq("student_id", profile.id);

  const { data: progressRows } = await supabase
    .from("progress_records")
    .select("subject_id, completion_pct")
    .eq("student_id", profile.id)
    .not("subject_id", "is", null);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-stone-500">
          <Link href="/dashboard/student" className="hover:text-teal-800">
            Dashboard
          </Link>{" "}
          / Subjects
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          My subjects
        </h1>
        <p className="mt-1 text-stone-600">
          Open a subject to continue lessons, or join a new class with a code
          from your tutor.
        </p>
      </div>

      <Card className="border-sprout-outline-variant/30 bg-card">
        <CardHeader>
          <CardTitle>Add a class</CardTitle>
          <CardDescription>
            Use the 6-digit code your tutor gives you to enroll in their class
            and unlock the subject.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <JoinClassForm />
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-bold text-sprout-on-surface">
          Enrolled subjects
        </h2>
        {(enrollments ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-600">
            You are not enrolled in any subjects yet. Join a class above with
            your tutor&apos;s code.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        )}
      </div>
    </div>
  );
}
