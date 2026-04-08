import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-profile";

export default async function Home() {
  const { user } = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }
  redirect("/login");
}
