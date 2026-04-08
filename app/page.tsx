import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-profile";
import { SproutLogo } from "@/components/brand/sprout-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const { user } = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-stone-50 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <SproutLogo size={144} priority className="drop-shadow-sm" />
        <h1 className="text-2xl font-semibold tracking-tight text-teal-900">
          Sprout
        </h1>
        <p className="max-w-sm text-sm text-stone-600">
          Guided tutoring for step-by-step learning and tutor support.
        </p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link
          href="/login"
          className={cn(
            buttonVariants({ variant: "default", size: "lg" }),
            "w-full bg-teal-700 hover:bg-teal-800"
          )}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full")}
        >
          Create account
        </Link>
      </div>
    </div>
  );
}
