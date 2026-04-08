import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/get-profile";
import { markHelpRequestReadFormAction } from "@/app/actions/help-request";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TutorHelpPage() {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("help_requests")
    .select("id, body, created_at, read_at, student_id")
    .eq("tutor_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const studentIds = [...new Set((requests ?? []).map((r) => r.student_id))];
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

  type Row = {
    id: string;
    body: string;
    created_at: string;
    read_at: string | null;
    student_id: string;
  };

  const list = (requests ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tutor"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Tutor home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sprout-on-surface">
          Help requests
        </h1>
        <p className="mt-1 text-sm text-sprout-on-surface-variant">
          Messages from students who used &quot;Ask for help&quot;.
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="border-sprout-outline-variant/30">
          <CardContent className="py-10 text-center text-sm text-sprout-on-surface-variant">
            No help requests yet.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-4">
          {list.map((r) => {
            const name = nameById.get(r.student_id) ?? "Student";
            return (
              <li key={r.id}>
                <Card
                  className={
                    r.read_at
                      ? "border-sprout-outline-variant/30"
                      : "border-primary/40 bg-sprout-primary-container/10"
                  }
                >
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">{name}</CardTitle>
                        <CardDescription>
                          {new Date(r.created_at).toLocaleString()}
                          {r.read_at ? " · Read" : " · Unread"}
                        </CardDescription>
                      </div>
                      {!r.read_at && (
                        <form action={markHelpRequestReadFormAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Mark read
                          </Button>
                        </form>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-sprout-on-surface">
                      {r.body}
                    </p>
                    <p className="mt-3">
                      <Link
                        href={`/students/${r.student_id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        View student profile
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
