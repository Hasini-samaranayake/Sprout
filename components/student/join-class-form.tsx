"use client";

import { useActionState } from "react";
import {
  joinClassByCodeAction,
  type ClassCodeFormState,
} from "@/app/actions/class-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ClassCodeFormState = {};

export function JoinClassForm() {
  const [state, formAction, isPending] = useActionState(
    joinClassByCodeAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-3">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-2">
          <Label htmlFor="class-code">Class code</Label>
          <Input
            id="class-code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            maxLength={12}
            className="font-mono text-lg tracking-widest"
            aria-invalid={Boolean(state?.error)}
          />
          <p className="text-xs text-stone-500">
            Enter the 6-digit code your tutor shared with you.
          </p>
        </div>
        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? "Joining…" : "Join class"}
        </Button>
      </div>
    </form>
  );
}
