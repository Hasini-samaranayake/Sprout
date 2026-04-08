import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function StudentMessagesPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("help_requests")
    .select("id, body, created_at, read_at, tutor_id")
    .eq("student_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-sprout-on-surface">Messages</h1>
        <p className="mt-1 text-sm text-sprout-on-surface-variant">
          Help requests you&apos;ve sent to your tutor.
        </p>
      </div>

      {(rows ?? []).length === 0 ? (
        <Card className="border-sprout-outline-variant/30">
          <CardContent className="py-10 text-center text-sm text-sprout-on-surface-variant">
            No messages yet. Use{" "}
            <strong className="text-sprout-on-surface">Ask for help</strong> on
            the home screen.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {(rows ?? []).map((r) => (
            <li key={r.id}>
              <Card className="border-sprout-outline-variant/30">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">Help request</CardTitle>
                    <span className="text-xs text-sprout-on-surface-variant">
                      {new Date(r.created_at).toLocaleString()}
                    </span>
                  </div>
                  <CardDescription>
                    {r.read_at
                      ? "Seen by tutor"
                      : "Waiting for tutor to read"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-sprout-on-surface">
                    {r.body}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <p className="text-center text-sm">
        <Link href="/dashboard/student" className="font-medium text-primary">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
