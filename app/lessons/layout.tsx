import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/app-frame";
import { getProfile } from "@/lib/auth/get-profile";

export default async function LessonsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const title = profile.full_name ?? profile.email ?? "Sprout";

  return (
    <AppFrame role={profile.role} title={title}>
      {children}
    </AppFrame>
  );
}
