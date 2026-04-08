import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-profile";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const { user } = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
