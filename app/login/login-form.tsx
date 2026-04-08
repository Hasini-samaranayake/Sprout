"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SproutLogo } from "@/components/brand/sprout-logo";
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
import {
  RoleToggle,
  type AccountRole,
} from "@/components/auth/role-toggle";
import { postAuthRedirectPath } from "@/lib/auth/post-auth-redirect";

function dashboardPathForRole(role: AccountRole) {
  return role === "tutor" ? "/dashboard/tutor" : "/dashboard/student";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roleParam = searchParams.get("role");
  const role: AccountRole =
    roleParam === "tutor" ? "tutor" : "student";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const explicitNext = searchParams.get("next");
  const next = useMemo(() => {
    if (explicitNext?.startsWith("/") && !explicitNext.startsWith("//")) {
      return explicitNext;
    }
    return dashboardPathForRole(role);
  }, [explicitNext, role]);

  const syncRoleToUrl = useCallback(
    (r: AccountRole) => {
      const params = new URLSearchParams();
      params.set("role", r);
      const n = searchParams.get("next");
      if (n?.startsWith("/") && !n.startsWith("//")) {
        params.set("next", n);
      }
      router.replace(`/login?${params.toString()}`, { scroll: false });
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
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signErr) {
      setLoading(false);
      setError(signErr.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      setError("Could not load session.");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr || !profile) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        profileErr?.message ??
          "Your profile is missing. Ask an admin or run migrations."
      );
      return;
    }

    const actual = profile.role as AccountRole;
    if (actual !== role) {
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        `This account is registered as a ${actual}. Select “${
          actual === "tutor" ? "Tutor" : "Student"
        }” above and try again.`
      );
      return;
    }

    const raw =
      next.startsWith("/") && !next.startsWith("//")
        ? next
        : dashboardPathForRole(actual);

    window.location.assign(postAuthRedirectPath(raw));
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
            Sign in
          </p>
        </div>
        <CardDescription>
          Sign in to continue. New here?{" "}
          <Link
            href={`/signup?${nextQuery}`}
            className="font-medium text-teal-800 underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not sign in</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="login-role">I am signing in as a</Label>
            <RoleToggle
              id="login-role"
              value={role}
              onChange={syncRoleToUrl}
              disabled={loading}
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
              autoComplete="current-password"
              required
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
            {loading ? "Signing in…" : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
