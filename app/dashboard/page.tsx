import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/get-profile";

export default async function DashboardRouterPage() {
  const profile = await getProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role === "tutor") {
    redirect("/dashboard/tutor");
  }
  redirect("/dashboard/student");
}
