import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const R = 36;
const CIRC = 2 * Math.PI * R;

export function CircularSubjectProgress({
  pct,
  icon: Icon,
  ringClassName,
}: {
  pct: number;
  icon: LucideIcon;
  /** stroke color for progress arc */
  ringClassName?: string;
}) {
  const clamped = Math.min(100, Math.max(0, pct));
  const offset = CIRC - (clamped / 100) * CIRC;

  return (
    <div className="relative h-20 w-20">
      <svg
        className="h-full w-full -rotate-90"
        viewBox="0 0 80 80"
        aria-hidden
      >
        <circle
          className="text-sprout-surface-container-highest"
          cx="40"
          cy="40"
          r={R}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
        />
        <circle
          className={cn("text-primary", ringClassName)}
          cx="40"
          cy="40"
          r={R}
          fill="transparent"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-primary">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>
    </div>
  );
}
