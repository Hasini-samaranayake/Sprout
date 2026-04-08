import { redirect } from "next/navigation";
import { AppFrame } from "@/components/layout/app-frame";
import { StudentBottomNav } from "@/components/layout/student-bottom-nav";
import { getProfile } from "@/lib/auth/get-profile";

export default async function StudentDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect("/dashboard/tutor");
  }

  const title = profile.full_name ?? profile.email ?? "Student";

  return (
    <AppFrame role="student" title={title}>
      {children}
      <StudentBottomNav />
    </AppFrame>
  );
}
