"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SproutLogo } from "@/components/brand/sprout-logo";

export function SignupForm() {
  const searchParams = useSearchParams();
  /** Public signup is always for students; avoid generic /dashboard + client nav race with stale sessions. */
  const next = searchParams.get("next") ?? "/dashboard/student";
  const nextQuery = `next=${encodeURIComponent(next)}`;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const origin = window.location.origin;
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      setLoading(false);
      return;
    }
    const emailNorm = email.trim().toLowerCase();
    const { data, error: signErr } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        data: { full_name: trimmedName, signup_role: "student" },
        emailRedirectTo,
      },
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    if (data.session) {
      const sessionEmail = data.user?.email?.toLowerCase();
      if (sessionEmail && sessionEmail !== emailNorm) {
        setError(
          "Session email did not match. Try signing out, then create your account again."
        );
        return;
      }
      const target =
        next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard/student";
      window.location.assign(target);
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-md border-stone-200/90 bg-card/95 shadow-xl ring-1 ring-stone-200/60 backdrop-blur-sm">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2.5">
            <SproutLogo size={56} priority />
            <span className="font-serif text-2xl font-semibold tracking-tight text-teal-900">
              Sprout
            </span>
          </div>
          <CardDescription>
            Check your email for a confirmation link. After you confirm, you will
            be signed in and redirected to your Sprout home.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href={`/login?${nextQuery}`}
            className="text-sm font-medium text-teal-800 underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md rounded-2xl border-stone-200/90 bg-card/95 shadow-xl ring-1 ring-teal-900/5 backdrop-blur-sm">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2.5">
            <SproutLogo size={56} priority />
            <span className="font-serif text-2xl font-semibold tracking-tight text-teal-900">
              Sprout
            </span>
          </div>
          <p className="text-xs font-medium uppercase tracking-wider text-teal-800/70">
            Student sign-up
          </p>
        </div>
        <CardDescription>
          Create an account to continue. Already registered?{" "}
          <Link
            href={`/login?${nextQuery}`}
            className="font-medium text-teal-800 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not create account</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="fullName">Name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              minLength={1}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full rounded-xl bg-teal-700 text-base font-semibold shadow-md hover:bg-teal-800"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
