import type { AttemptResult, TaskType } from "@/types/database";

export interface FeedbackResult {
  result: AttemptResult;
  score: number;
  userMessage: string;
  hintMessage?: string;
  explanation?: string;
  misconceptionTags: string[];
  /** Layer-3 hook: reserved for future AI explanations */
  aiExtensionPayload?: Record<string, unknown>;
}

export interface TaskForEvaluation {
  id: string;
  type: TaskType;
  prompt: string;
  options: unknown;
  correct_answer: string | null;
  accepted_variants: string[] | null;
  misconception_tags: string[] | null;
  hint_text: string | null;
  explanation_text: string | null;
  rules_hint: Record<string, unknown> | null;
}
