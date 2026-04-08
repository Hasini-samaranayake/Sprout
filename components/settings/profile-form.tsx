"use client";

import { useActionState } from "react";
import type { Profile } from "@/lib/auth/get-profile";
import {
  updateProfileAction,
  type ProfileFormState,
} from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ProfileFormState = {};

function roleLabel(role: Profile["role"]) {
  return role === "tutor" ? "Tutor" : "Student";
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, formAction, isPending] = useActionState(
    updateProfileAction,
    initialState
  );

  return (
    <Card className="border-stone-200">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your name and email. Your role is fixed for this account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}
          {state?.success ? (
            <Alert>
              <AlertDescription>Profile saved.</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="full_name">Name</Label>
            <Input
              id="full_name"
              name="full_name"
              type="text"
              autoComplete="name"
              defaultValue={profile.full_name ?? ""}
              placeholder="Your name"
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
              defaultValue={profile.email ?? ""}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input
              id="role"
              readOnly
              tabIndex={-1}
              defaultValue={roleLabel(profile.role)}
              className="pointer-events-none bg-stone-50/80"
            />
            <p className="text-xs text-stone-500">
              Student and tutor accounts use the same settings screen; role is
              set when the account is created.
            </p>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
