/**
 * Simple rolling signal from recent attempt scores (0–1).
 */
export function computeMomentum(scores: number[]): {
  label: "Steady" | "Building" | "Needs support";
  detail: string;
  value: number;
} {
  if (!scores.length) {
    return {
      label: "Building",
      detail: "Complete a task to establish a baseline.",
      value: 0,
    };
  }
  const recent = scores.slice(0, 5);
  const avg =
    recent.reduce((a, b) => a + b, 0) / Math.min(recent.length, 5);
  if (avg >= 0.75) {
    return {
      label: "Steady",
      detail: "Recent answers look consistent. Keep the rhythm.",
      value: avg,
    };
  }
  if (avg >= 0.45) {
    return {
      label: "Building",
      detail: "You are making progress — small steps add up.",
      value: avg,
    };
  }
  return {
    label: "Needs support",
    detail: "Slow down, use hints, and ask your tutor if stuck.",
    value: avg,
  };
}
