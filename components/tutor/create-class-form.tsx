"use client";

import { useActionState } from "react";
import {
  createTutorClassAction,
  type ClassCodeFormState,
} from "@/app/actions/class-code";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

const initialState: ClassCodeFormState = {};

export function CreateClassForm({
  subjects,
}: {
  subjects: { id: string; title: string }[];
}) {
  const [state, formAction, isPending] = useActionState(
    createTutorClassAction,
    initialState
  );

  return (
    <form action={formAction} className="space-y-4">
      {state?.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state?.success ? (
        <Alert>
          <AlertDescription className="whitespace-pre-wrap font-medium">
            {state.success}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="subject_id">Subject</Label>
          <select
            id="subject_id"
            name="subject_id"
            required
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            defaultValue=""
          >
            <option value="" disabled>
              Select a subject
            </option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="class-title">Class name (optional)</Label>
          <Input
            id="class-title"
            name="title"
            type="text"
            placeholder="e.g. Period 3 Biology"
          />
        </div>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating…" : "Create class & generate code"}
      </Button>
    </form>
  );
}
