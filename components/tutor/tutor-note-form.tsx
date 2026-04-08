"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveTutorNoteAction } from "@/app/actions/tutor";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function TutorNoteForm({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await saveTutorNoteAction(studentId, body);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <Label htmlFor="note">Add a note</Label>
      <Textarea
        id="note"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        placeholder="What should future-you remember about this learner?"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending || !body.trim()} size="sm">
        {pending ? "Saving…" : "Save note"}
      </Button>
    </form>
  );
}
