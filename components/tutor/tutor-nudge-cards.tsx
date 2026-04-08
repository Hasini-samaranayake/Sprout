"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileEdit, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { AttemptResult } from "@/types/database";

export type NudgeStudent = {
  id: string;
  name: string;
  email: string | null;
  avgProgress: number;
  streak: number;
  lastActivity: string | null;
  inactiveDays: number | null;
  latestHomework: {
    lessonTitle: string;
    result: AttemptResult;
    createdAt: string;
  } | null;
  alertSeverity: "high" | "medium" | "low" | null;
  consistencyBadge: boolean;
};

function severityRank(s: NudgeStudent["alertSeverity"]) {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  if (s === "low") return 1;
  return 0;
}

export function TutorNudgeCards({ students }: { students: NudgeStudent[] }) {
  const [tab, setTab] = useState<"urgent" | "recent">("urgent");

  const sorted = useMemo(() => {
    const copy = [...students];
    if (tab === "urgent") {
      copy.sort((a, b) => {
        const dr = severityRank(b.alertSeverity) - severityRank(a.alertSeverity);
        if (dr !== 0) return dr;
        return (b.inactiveDays ?? 0) - (a.inactiveDays ?? 0);
      });
    } else {
      copy.sort((a, b) => {
        const ta = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
        const tb = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
        return tb - ta;
      });
    }
    return copy;
  }, [students, tab]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight text-sprout-on-surface md:text-3xl">
          Students needing a nudge
        </h2>
        <div className="flex gap-2 text-sm font-medium text-sprout-on-surface-variant">
          <button
            type="button"
            onClick={() => setTab("urgent")}
            className={cn(
              "border-b-2 px-2 pb-1 transition-colors",
              tab === "urgent"
                ? "border-primary font-semibold text-primary"
                : "border-transparent hover:text-primary"
            )}
          >
            Most urgent
          </button>
          <button
            type="button"
            onClick={() => setTab("recent")}
            className={cn(
              "border-b-2 px-2 pb-1 transition-colors",
              tab === "recent"
                ? "border-primary font-semibold text-primary"
                : "border-transparent hover:text-primary"
            )}
          >
            Recently active
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sorted.map((s) => {
          const atRisk =
            s.alertSeverity === "high" ||
            (s.inactiveDays !== null && s.inactiveDays >= 5);
          const mailto =
            s.email && s.email.length > 0
              ? `mailto:${s.email}?subject=Hello%20from%20Sprout`
              : null;

          return (
            <div
              key={s.id}
              className="flex flex-col gap-6 rounded-2xl border border-sprout-outline-variant/15 bg-sprout-surface-container-lowest p-6 shadow-[0_12px_32px_-4px_rgba(45,52,48,0.06)] transition hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex gap-3">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sprout-surface-container text-lg font-bold text-sprout-on-surface">
                    {s.name
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-sprout-on-surface">
                      {s.name}
                    </h3>
                    <p className="text-sm text-sprout-on-surface-variant">
                      {s.inactiveDays !== null && s.inactiveDays > 0
                        ? `Inactive for ${s.inactiveDays} day${s.inactiveDays === 1 ? "" : "s"}`
                        : s.lastActivity
                          ? `Active ${formatRelative(s.lastActivity)}`
                          : "No activity yet"}
                    </p>
                  </div>
                </div>
                {atRisk ? (
                  <span className="shrink-0 rounded-full bg-sprout-error-container/25 px-3 py-1 text-xs font-bold uppercase text-sprout-error-dim">
                    At risk
                  </span>
                ) : s.consistencyBadge ? (
                  <span className="shrink-0 rounded-full bg-sprout-secondary-container/40 px-3 py-1 text-xs font-bold uppercase text-sprout-on-secondary-container">
                    Consistency king
                  </span>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-widest text-sprout-on-surface-variant">
                  Recent homework
                </p>
                {s.latestHomework ? (
                  <div className="flex items-center gap-4 rounded-xl bg-sprout-surface-container-low p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sprout-surface-container-highest text-xs font-bold text-sprout-on-surface-variant">
                      HW
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-sprout-on-surface">
                        {s.latestHomework.lessonTitle}
                      </p>
                      <span
                        className={cn(
                          "mt-0.5 flex items-center gap-1 text-xs",
                          s.latestHomework.result === "correct"
                            ? "text-primary"
                            : "text-sprout-on-surface-variant"
                        )}
                      >
                        {s.latestHomework.result === "correct"
                          ? "Great job!"
                          : s.latestHomework.result === "partial"
                            ? "Partial credit"
                            : "Needs review"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-[72px] items-center justify-center rounded-xl border-2 border-dashed border-sprout-outline-variant/30 bg-sprout-surface-container-low">
                    <span className="text-xs font-medium text-sprout-on-surface-variant">
                      No recent submissions
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-3">
                <Link
                  href={`/students/${s.id}#note`}
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "rounded-full border-sprout-surface-container-highest bg-sprout-surface-container-highest font-bold"
                  )}
                >
                  <FileEdit className="mr-1 h-4 w-4" />
                  Leave note
                </Link>
                {mailto ? (
                  <a
                    href={mailto}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "rounded-full bg-primary font-bold text-primary-foreground hover:opacity-90"
                    )}
                  >
                    <Send className="mr-1 h-4 w-4" />
                    Message
                  </a>
                ) : (
                  <Link
                    href={`/students/${s.id}`}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "rounded-full bg-primary font-bold text-primary-foreground"
                    )}
                  >
                    <Send className="mr-1 h-4 w-4" />
                    Open
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}
