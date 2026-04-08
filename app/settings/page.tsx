import { getProfile } from "@/lib/auth/get-profile";
import { ProfileForm } from "@/components/settings/profile-form";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Settings</h1>
        <p className="mt-1 text-sm text-stone-600">
          Basic profile context for this MVP.
        </p>
      </div>

      <ProfileForm
        key={`${profile.full_name ?? ""}|${profile.email ?? ""}`}
        profile={profile}
      />
    </div>
  );
}
