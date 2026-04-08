"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SproutLogo } from "@/components/brand/sprout-logo";
import { sendHelpRequestAction } from "@/app/actions/help-request";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function AskHelpFab({
  hasTutorLink,
  className,
}: {
  /** True when tutor_student_links exists for this student */
  hasTutorLink: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setError(null);
      if (sent) {
        setText("");
        setSent(false);
      }
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const r = await sendHelpRequestAction(text);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setSent(true);
      setText("");
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1200);
    });
  }

  if (!hasTutorLink) {
    return (
      <Link
        href="/settings"
        className={cn(
          "fixed bottom-28 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-sprout-secondary-container bg-sprout-secondary-container px-4 py-3 shadow-lg transition hover:scale-[1.02] active:scale-[0.98] md:bottom-8",
          className
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <SproutLogo size={32} />
        </span>
        <span className="text-sm font-bold text-sprout-on-secondary-container">
          Ask for help
        </span>
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-28 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-sprout-secondary-container bg-sprout-secondary-container px-4 py-3 shadow-lg transition hover:scale-[1.02] active:scale-[0.98] md:bottom-8",
          className
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
          <SproutLogo size={32} />
        </span>
        <span className="text-sm font-bold text-sprout-on-secondary-container">
          Ask for help
        </span>
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message your tutor</DialogTitle>
          </DialogHeader>
          {sent ? (
            <p className="text-sm text-teal-800">
              Sent! Your tutor will see this in their dashboard.
            </p>
          ) : (
            <>
              <Textarea
                placeholder="What do you need help with?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={5}
                className="resize-none"
                disabled={pending}
              />
              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}
            </>
          )}
          {!sent && (
            <DialogFooter className="border-0 bg-transparent p-0 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-teal-700 hover:bg-teal-800"
                disabled={pending || !text.trim()}
                onClick={submit}
              >
                {pending ? "Sending…" : "Send"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
