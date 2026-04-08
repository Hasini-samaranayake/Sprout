"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitTaskAction } from "@/app/actions/task";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaskType } from "@/types/database";

type Step = {
  id: string;
  order_index: number;
  title: string;
  tasks: {
    id: string;
    type: TaskType;
    prompt: string;
    options: { choices?: string[] } | null;
    hint_text: string | null;
  } | null;
};

export function LessonRunner({
  lessonId,
  lessonTitle,
  subjectTitle,
  steps,
  initialTaskId,
}: {
  lessonId: string;
  lessonTitle: string;
  subjectTitle: string;
  steps: Step[];
  initialTaskId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const ordered = useMemo(
    () => [...steps].sort((a, b) => a.order_index - b.order_index),
    [steps]
  );

  const initialIndex = Math.max(
    0,
    ordered.findIndex((s) => s.tasks?.id === initialTaskId)
  );
  const [index, setIndex] = useState(initialIndex);
  const step = ordered[index];
  const task = step?.tasks;

  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{
    result: string;
    userMessage: string;
    hintMessage?: string;
    explanation?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progressValue =
    ordered.length > 0 ? ((index + (feedback ? 1 : 0)) / ordered.length) * 100 : 0;

  function resetForStep() {
    setAnswer("");
    setFeedback(null);
    setError(null);
  }

  function goNext() {
    resetForStep();
    setIndex((i) => Math.min(i + 1, ordered.length - 1));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setError(null);
    startTransition(async () => {
      const res = await submitTaskAction({
        lessonId,
        taskId: task.id,
        rawAnswer: answer,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFeedback(res.feedback);
      router.refresh();
    });
  }

  if (!task) {
    return (
      <p className="text-sm text-stone-600">
        This lesson does not have tasks configured.
      </p>
    );
  }

  const isMc = task.type === "multiple_choice";
  const choices = task.options?.choices ?? [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-stone-500">
          <Link href="/dashboard/student" className="hover:text-teal-800">
            Dashboard
          </Link>{" "}
          /{" "}
          <span className="text-stone-600">{subjectTitle}</span> / Lesson
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-stone-900">
          {lessonTitle}
        </h1>
        <p className="mt-1 text-sm text-stone-600">
          Step {index + 1} of {ordered.length}: {step.title}
        </p>
        <div className="mt-4">
          <Progress value={Math.min(100, progressValue)} className="h-2" />
        </div>
      </div>

      <Card className="border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Your step</CardTitle>
          <CardDescription>
            Take your time — you will get immediate feedback after you submit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="rounded-lg bg-stone-50 p-4 text-sm leading-relaxed text-stone-800">
              {task.prompt}
            </div>

            {isMc ? (
              <div className="space-y-2">
                <Label htmlFor="answer">Select an option</Label>
                <Select
                  value={answer}
                  onValueChange={(v) => setAnswer(v ?? "")}
                  disabled={!!feedback}
                >
                  <SelectTrigger id="answer">
                    <SelectValue placeholder="Choose one" />
                  </SelectTrigger>
                  <SelectContent>
                    {choices.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="answer">Your answer</Label>
                <Input
                  id="answer"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  disabled={!!feedback}
                  autoComplete="off"
                />
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {!feedback ? (
              <Button
                type="submit"
                disabled={pending || !answer.trim()}
                className="bg-teal-700 hover:bg-teal-800"
              >
                {pending ? "Checking…" : "Submit answer"}
              </Button>
            ) : (
              <div className="space-y-4">
                <Alert
                  className={
                    feedback.result === "correct"
                      ? "border-emerald-200 bg-emerald-50"
                      : feedback.result === "partial"
                        ? "border-amber-200 bg-amber-50"
                        : "border-stone-200 bg-white"
                  }
                >
                  <AlertTitle className="capitalize">
                    {feedback.result.replace("_", " ")}
                  </AlertTitle>
                  <AlertDescription className="space-y-2 text-stone-800">
                    <p>{feedback.userMessage}</p>
                    {feedback.hintMessage && (
                      <p className="text-sm text-stone-700">
                        <span className="font-medium">Hint:</span>{" "}
                        {feedback.hintMessage}
                      </p>
                    )}
                    {feedback.explanation && (
                      <p className="text-sm text-stone-700">
                        <span className="font-medium">Why:</span>{" "}
                        {feedback.explanation}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-2">
                  {index < ordered.length - 1 ? (
                    <Button type="button" onClick={goNext}>
                      Next step
                    </Button>
                  ) : (
                    <Link
                      href="/dashboard/student"
                      className={cn(buttonVariants({ variant: "secondary" }))}
                    >
                      Back to dashboard
                    </Link>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForStep();
                    }}
                  >
                    Try another answer
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {!feedback && task.hint_text && (
        <p className="text-xs text-stone-500">
          Stuck? The question is designed so you can succeed — start with what
          you are sure about.
        </p>
      )}
    </div>
  );
}
