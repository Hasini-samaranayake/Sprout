import { Suspense } from "react";
import { redirect } from "next/navigation";
import { BookOpen, Heart, Sparkles, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth/get-profile";
import { LoginForm } from "./login-form";

const studentHighlights = [
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

const tutorHighlights = [
  {
    icon: Users,
    text: "See your roster, streaks, and who needs a nudge at a glance.",
  },
  {
    icon: Sparkles,
    text: "Rule-based alerts surface follow-ups without extra spreadsheets.",
  },
  {
    icon: BookOpen,
    text: "Open any linked student to review lessons and notes in context.",
  },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; role?: string }>;
}) {
  const { user } = await getSessionUser();
  const sp = await searchParams;
  const role = sp.role === "tutor" ? "tutor" : "student";
  if (user) {
    redirect("/dashboard");
  }

  const highlights = role === "tutor" ? tutorHighlights : studentHighlights;

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

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-4 py-10 md:grid md:grid-cols-2 md:items-center md:gap-12 md:py-14 lg:gap-16">
        <section
          className="order-2 mx-auto flex w-full max-w-md flex-col gap-5 text-center md:order-1 md:mx-0 md:max-w-none md:text-left"
          aria-labelledby="login-hero-title"
        >
          <h1
            id="login-hero-title"
            className="font-serif text-4xl font-semibold tracking-tight text-teal-900 sm:text-5xl"
          >
            Sprout
          </h1>
          <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
            Guided tutoring platform for step-by-step learning and tutor support.
          </p>
          <ul className="mx-auto flex w-full max-w-sm flex-col gap-3.5 text-left text-sm text-stone-600 md:mx-0 md:max-w-md">
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
        </section>

        <div className="order-1 w-full md:order-2 md:flex md:justify-end">
          <Suspense
            fallback={
              <p className="mx-auto w-full max-w-md rounded-2xl border border-stone-200 bg-card/90 px-6 py-16 text-center text-sm text-stone-500 shadow-xl backdrop-blur-sm">
                Loading…
              </p>
            }
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
