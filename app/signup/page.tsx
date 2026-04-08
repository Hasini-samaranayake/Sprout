import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/get-profile";
import { SignupForm } from "./signup-form";

export default async function SignupPage({
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

  const isTutor = role === "tutor";

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
          className="order-2 mx-auto flex w-full max-w-md flex-col gap-4 text-center md:order-1 md:mx-0 md:max-w-none md:text-left"
          aria-labelledby="signup-hero-title"
        >
          <h1
            id="signup-hero-title"
            className="font-serif text-4xl font-semibold tracking-tight text-teal-900 sm:text-5xl"
          >
            Create your account
          </h1>
          {isTutor ? (
            <>
              <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
                You’re setting up a <strong className="font-semibold text-teal-900">tutor</strong>{" "}
                profile—manage rosters, see who needs a follow-up, and keep
                lesson context in one place.
              </p>
              <p className="text-sm leading-relaxed text-stone-500">
                Use a work email you check often; you’ll sign in with it and the
                password you choose below.
              </p>
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-stone-600 sm:text-lg">
                You’re joining as a <strong className="font-semibold text-teal-900">student</strong>
                —add your name and a password so we can save your lessons,
                streaks, and progress for you and your tutor.
              </p>
              <p className="text-sm leading-relaxed text-stone-500">
                Already use Sprout with a tutor? Use the email they have for you
                so your accounts link smoothly.
              </p>
            </>
          )}
        </section>

        <div className="order-1 w-full md:order-2 md:flex md:justify-end">
          <Suspense
            fallback={
              <p className="mx-auto w-full max-w-md rounded-2xl border border-stone-200 bg-card/90 px-6 py-16 text-center text-sm text-stone-500 shadow-xl backdrop-blur-sm">
                Loading…
              </p>
            }
          >
            <SignupForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
