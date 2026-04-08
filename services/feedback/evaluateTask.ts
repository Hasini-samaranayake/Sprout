import type { AttemptResult } from "@/types/database";
import type { FeedbackResult, TaskForEvaluation } from "./types";

function normalizeText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function parseNumberLoose(s: string): number | null {
  const t = s.replace(/,/g, "").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function numbersClose(a: number, b: number, eps = 1e-6): boolean {
  return Math.abs(a - b) <= eps;
}

/**
 * Deterministic evaluation (MVP). Swap or wrap with AI via FeedbackProvider later.
 */
export function evaluateTaskDeterministic(
  task: TaskForEvaluation,
  rawAnswer: string
): FeedbackResult {
  const misconceptionTags = task.misconception_tags ?? [];

  if (task.type === "multiple_choice") {
    const correct = (task.correct_answer ?? "").trim();
    const given = rawAnswer.trim();
    const ok = correct.length > 0 && given === correct;
    const partial = !ok && given.length > 0 && correct.length > 0;
    const result: AttemptResult = ok ? "correct" : partial ? "partial" : "incorrect";
    const score = ok ? 1 : partial ? 0.35 : 0;
    return {
      result,
      score,
      userMessage: ok
        ? "Nice work — that matches the best choice here."
        : partial
          ? "You selected an option, but it is not the strongest match."
          : "Not quite — compare each option to what the question asks.",
      hintMessage: ok ? undefined : task.hint_text ?? undefined,
      explanation: ok ? task.explanation_text ?? undefined : task.explanation_text ?? undefined,
      misconceptionTags: ok ? [] : misconceptionTags,
    };
  }

  if (task.type === "short_answer" || task.type === "structured") {
    const normalized = normalizeText(rawAnswer);
    const canonical = normalizeText(task.correct_answer ?? "");
    const variants = (task.accepted_variants ?? []).map(normalizeText);

    if (!canonical && variants.length === 0) {
      return {
        result: "partial",
        score: 0.5,
        userMessage: "Recorded. Your tutor may review this response.",
        misconceptionTags,
      };
    }

    const exactMatch =
      normalized === canonical || variants.some((v) => v === normalized);

    const correctNum = parseNumberLoose(task.correct_answer ?? "");
    const givenNum = parseNumberLoose(rawAnswer);
    const numericMatch =
      correctNum !== null &&
      givenNum !== null &&
      numbersClose(givenNum, correctNum);

    if (exactMatch || numericMatch) {
      return {
        result: "correct",
        score: 1,
        userMessage: "That is correct.",
        explanation: task.explanation_text ?? undefined,
        misconceptionTags: [],
      };
    }

    const rules = task.rules_hint ?? {};
    const closeHint =
      typeof rules.closeWhen === "string" && normalized.includes(rules.closeWhen as string)
        ? "You are close, but double-check the final value."
        : undefined;
    const signHint =
      typeof rules.checkSign === "boolean" &&
      rules.checkSign &&
      givenNum !== null &&
      correctNum !== null &&
      Math.sign(givenNum) !== Math.sign(correctNum)
        ? "Check the sign in the intermediate step."
        : undefined;

    const partialByMagnitude =
      correctNum !== null &&
      givenNum !== null &&
      !numericMatch &&
      numbersClose(givenNum, correctNum, Math.max(0.05 * Math.abs(correctNum), 0.01));

    const result: AttemptResult = partialByMagnitude ? "partial" : "incorrect";
    const score = partialByMagnitude ? 0.45 : 0;

    return {
      result,
      score,
      userMessage: partialByMagnitude
        ? "Close — your approach is on the right track."
        : "Not quite yet. Use the hint and try once more.",
      hintMessage:
        signHint ??
        closeHint ??
        (task.hint_text ?? undefined),
      explanation: task.explanation_text ?? undefined,
      misconceptionTags,
    };
  }

  return {
    result: "incorrect",
    score: 0,
    userMessage: "Unsupported task type.",
    misconceptionTags,
  };
}
