import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/app-frame";
import { getProfile } from "@/lib/auth/get-profile";

export default async function StudentsSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "tutor") {
    redirect("/dashboard/student");
  }

  const title = profile.full_name ?? profile.email ?? "Tutor";

  return (
    <AppFrame role="tutor" title={title}>
      {children}
    </AppFrame>
  );
}
