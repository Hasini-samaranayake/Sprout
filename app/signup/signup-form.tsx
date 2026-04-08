"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  RoleToggle,
  type AccountRole,
} from "@/components/auth/role-toggle";

function defaultNextForRole(role: AccountRole) {
  return role === "tutor" ? "/dashboard/tutor" : "/dashboard/student";
}

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: AccountRole =
    roleParam === "tutor" ? "tutor" : "student";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const explicitNext = searchParams.get("next");
  const next = useMemo(() => {
    if (explicitNext?.startsWith("/") && !explicitNext.startsWith("//")) {
      return explicitNext;
    }
    return defaultNextForRole(role);
  }, [explicitNext, role]);

  const syncRoleToUrl = useCallback(
    (r: AccountRole) => {
      const params = new URLSearchParams();
      params.set("role", r);
      const n = searchParams.get("next");
      if (n?.startsWith("/") && !n.startsWith("//")) {
        params.set("next", n);
      }
      router.replace(`/signup?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const nextQuery = useMemo(() => {
    const params = new URLSearchParams();
    params.set("next", next);
    params.set("role", role);
    return params.toString();
  }, [next, role]);

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
        data: {
          full_name: trimmedName,
          signup_role: role,
        },
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
        next.startsWith("/") && !next.startsWith("//")
          ? next
          : defaultNextForRole(role);
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

  const roleLabel =
    role === "tutor" ? "Tutor sign-up" : "Student sign-up";

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
            {roleLabel}
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
            <Label htmlFor="account-role">I am a</Label>
            <RoleToggle
              value={role}
              onChange={syncRoleToUrl}
              disabled={loading}
            />
            <p className="text-xs text-stone-500">
              {role === "student"
                ? "Students complete lessons and track streaks."
                : "Tutors see rosters, alerts, and student progress."}
            </p>
          </div>
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
