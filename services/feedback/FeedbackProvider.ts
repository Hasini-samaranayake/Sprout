import type { FeedbackResult, TaskForEvaluation } from "./types";
import { evaluateTaskDeterministic } from "./evaluateTask";

export interface FeedbackProvider {
  evaluate(task: TaskForEvaluation, rawAnswer: string): FeedbackResult;
}

export class DeterministicFeedbackProvider implements FeedbackProvider {
  evaluate(task: TaskForEvaluation, rawAnswer: string): FeedbackResult {
    return evaluateTaskDeterministic(task, rawAnswer);
  }
}
