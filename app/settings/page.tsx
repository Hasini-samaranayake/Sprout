import { getProfile } from "@/lib/auth/get-profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function SettingsPage() {
  const profile = await getProfile();

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-600">
          Basic profile context for this MVP.
        </p>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Name and email come from your account. Extend this screen later with
            editable fields.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-stone-500">Name</span>
            <span className="text-stone-900">{profile?.full_name ?? "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-4">
            <span className="text-stone-500">Email</span>
            <span className="text-stone-900">{profile?.email ?? "—"}</span>
          </div>
          <Separator />
          <div className="flex justify-between gap-4">
            <span className="text-stone-500">Role</span>
            <span className="capitalize text-stone-900">
              {profile?.role ?? "—"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
