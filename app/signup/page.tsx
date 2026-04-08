import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-profile";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { user } = await getSessionUser();
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";
  if (user) {
    redirect(next.startsWith("/") ? next : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-50 px-4 py-12">
      <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
