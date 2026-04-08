import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function SavedWhiteboardLessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("tutor_whiteboard_lessons")
    .select("id, tutor_id, title, image_storage_path, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error || !row) notFound();

  if (profile.role === "student") {
    const { data: link } = await supabase
      .from("tutor_student_links")
      .select("tutor_id")
      .eq("student_id", profile.id)
      .eq("tutor_id", row.tutor_id)
      .maybeSingle();
    if (!link) notFound();
  } else if (profile.role === "tutor" && row.tutor_id !== profile.id) {
    notFound();
  }

  const { data: signed } = await supabase.storage
    .from("tutor-whiteboards")
    .createSignedUrl(row.image_storage_path, 3600);

  const src = signed?.signedUrl;
  if (!src) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={
            profile.role === "student"
              ? "/dashboard/student"
              : "/dashboard/tutor"
          }
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sprout-on-surface">
          {row.title}
        </h1>
        <p className="mt-1 text-sm text-sprout-on-surface-variant">
          Saved lesson · {new Date(row.created_at).toLocaleString()}
        </p>
      </div>
      <Card className="overflow-hidden border-sprout-outline-variant/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Board</CardTitle>
          <CardDescription>View-only snapshot from your tutor.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            className="h-auto w-full bg-[#fefffc]"
          />
        </CardContent>
      </Card>
    </div>
  );
}
