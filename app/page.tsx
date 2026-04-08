import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, Heart, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth/get-profile";
import { SproutLogo } from "@/components/brand/sprout-logo";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const highlights = [
  {
    icon: BookOpen,
    text: "Short, step-by-step lessons you can finish in one sitting.",
  },
  {
    icon: Sparkles,
    text: "Friendly feedback as you practice—no scary red pens.",
  },
  {
    icon: Heart,
    text: "Your tutor can follow your streaks and nudge you when it helps.",
  },
];

export default async function Home() {
  const { user } = await getSessionUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-stone-50 via-emerald-50/45 to-teal-50/35">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgb(16 185 129 / 0.12) 1px, transparent 0)`,
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute -left-24 top-24 h-72 w-72 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-20 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-10 px-4 py-14 sm:max-w-xl md:max-w-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <SproutLogo size={144} priority className="drop-shadow-sm" />
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-teal-900 sm:text-5xl">
            Sprout
          </h1>
          <p className="max-w-md text-base leading-relaxed text-stone-600 sm:text-lg">
            A cozy place for guided tutoring—bite-sized learning, gentle
            check-ins, and room to grow at your pace.
          </p>
        </div>

        <ul className="mx-auto flex w-full max-w-md flex-col gap-3.5 text-left text-sm text-stone-600">
          {highlights.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100/90 text-emerald-700 shadow-sm ring-1 ring-emerald-200/60"
                aria-hidden
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="pt-1.5 leading-snug">{text}</span>
            </li>
          ))}
        </ul>

        <div className="mx-auto flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/login"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "h-12 w-full rounded-xl bg-teal-700 text-base font-semibold shadow-md hover:bg-teal-800"
            )}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "h-12 w-full rounded-xl"
            )}
          >
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
