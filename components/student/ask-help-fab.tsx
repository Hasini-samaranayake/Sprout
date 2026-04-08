"use client";

import Link from "next/link";
import { SproutLogo } from "@/components/brand/sprout-logo";
import { cn } from "@/lib/utils";

export function AskHelpFab({
  tutorEmail,
  className,
}: {
  tutorEmail: string | null;
  className?: string;
}) {
  const href =
    tutorEmail && tutorEmail.length > 0
      ? `mailto:${tutorEmail}?subject=Sprout%20—%20I%20need%20help`
      : "/settings";

  return (
    <Link
      href={href}
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
