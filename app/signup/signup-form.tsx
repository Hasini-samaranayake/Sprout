"use client";

import { useState } from "react";
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

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/dashboard";
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
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: trimmedName ? { full_name: trimmedName } : {},
        emailRedirectTo,
      },
    });
    setLoading(false);
    if (signErr) {
      setError(signErr.message);
      return;
    }
    if (data.session) {
      router.replace(next);
      router.refresh();
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <Card className="w-full max-w-md border-stone-200 shadow-sm">
        <CardHeader className="flex flex-col items-center gap-2 text-center">
          <SproutLogo size={56} priority />
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
    <Card className="w-full max-w-md border-stone-200 shadow-sm">
      <CardHeader className="flex flex-col items-center gap-3 text-center">
        <SproutLogo size={56} priority />
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
            <Label htmlFor="fullName">Name (optional)</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
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
            className="w-full bg-teal-700 hover:bg-teal-800"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
