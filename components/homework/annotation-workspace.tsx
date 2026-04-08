"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Eraser,
  Highlighter,
  History,
  MessageSquarePlus,
  Pencil,
  Send,
  StickyNote,
} from "lucide-react";
import Link from "next/link";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { finalizeHomeworkSubmission } from "@/app/actions/homework-submission";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

type Tool = "pen" | "highlighter" | "eraser" | "comment";

type Stroke = {
  tool: "pen" | "highlighter" | "eraser";
  points: [number, number][];
};

type CommentPin = { x: number; y: number; text: string };

function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (s.points.length < 2) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (s.tool === "pen") {
    ctx.strokeStyle = "#376b00";
    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 3;
  } else if (s.tool === "highlighter") {
    ctx.strokeStyle = "rgba(255, 230, 0, 0.45)";
    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = 20;
  } else {
    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 24;
  }
  ctx.beginPath();
  ctx.moveTo(s.points[0][0], s.points[0][1]);
  for (let i = 1; i < s.points.length; i++) {
    ctx.lineTo(s.points[i][0], s.points[i][1]);
  }
  ctx.stroke();
  ctx.restore();
}

export function AnnotationWorkspace({
  lessonId,
  lessonTitle,
  taskPrompt,
  submissionId,
  imageUrl,
  dueAt,
  tutorEmail,
  tutorName,
  recentCommentPreview,
}: {
  lessonId: string;
  lessonTitle: string;
  taskPrompt: string;
  submissionId: string;
  imageUrl: string;
  dueAt: string | null;
  tutorEmail: string | null;
  tutorName: string;
  /** Last saved teacher-facing note from a prior homework submission */
  recentCommentPreview: string | null;
}) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [pins, setPins] = useState<CommentPin[]>([]);
  const [commentBox, setCommentBox] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [size, setSize] = useState<{ w: number; h: number }>({
    w: 480,
    h: 640,
  });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const s of strokes) drawStroke(ctx, s);
    if (current) drawStroke(ctx, current);
  }, [strokes, current]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  function syncCanvasSize() {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    if (w > 0 && h > 0) {
      canvas.width = w;
      canvas.height = h;
      setSize({ w, h });
    }
  }

  useEffect(() => {
    syncCanvasSize();
    const ro = new ResizeObserver(() => syncCanvasSize());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    redraw();
  }, [size, redraw]);

  function clientPoint(
    e: React.PointerEvent<HTMLCanvasElement>
  ): [number, number] {
    const canvas = canvasRef.current;
    if (!canvas) return [0, 0];
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    return [x, y];
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (tool === "comment") {
      const [x, y] = clientPoint(e);
      const text = window.prompt("Comment text");
      if (text?.trim()) {
        setPins((p) => [...p, { x, y, text: text.trim() }]);
      }
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setCurrent({ tool, points: [clientPoint(e)] });
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!current) return;
    setCurrent((c) =>
      c ? { ...c, points: [...c.points, clientPoint(e)] } : c
    );
  }

  function onPointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    setStrokes((s) => [...s, current]);
    setCurrent(null);
  }

  const strokesPayload: Json = { strokes, pins, v: 1 };

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = wrap.clientWidth;
      exportCanvas.height = wrap.clientHeight;
      const x = exportCanvas.getContext("2d");
      if (!x) return;

      const bg = new window.Image();
      bg.crossOrigin = "anonymous";
      await new Promise<void>((res) => {
        bg.onload = () => res();
        bg.onerror = () => res();
        bg.src = imageUrl;
      });
      x.drawImage(bg, 0, 0, exportCanvas.width, exportCanvas.height);
      x.drawImage(canvas, 0, 0);

      const blob = await new Promise<Blob | null>((res) =>
        exportCanvas.toBlob((b) => res(b), "image/png")
      );
      if (!blob) {
        setError("Could not export image.");
        return;
      }
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError("Not signed in.");
        return;
      }
      const path = `${user.id}/${submissionId}.png`;
      const { error: upErr } = await supabase.storage
        .from("homework-annotations")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) {
        setError(upErr.message);
        return;
      }
      const fin = await finalizeHomeworkSubmission({
        submissionId,
        storagePath: path,
        commentText: commentBox,
        strokesJson: strokesPayload,
      });
      if (!fin.ok) {
        setError(fin.error);
        return;
      }
      router.push("/dashboard/student");
      router.refresh();
    });
  }

  const mailto =
    tutorEmail && tutorEmail.length > 0
      ? `mailto:${tutorEmail}?subject=Homework%20help`
      : null;

  return (
    <div className="flex w-full flex-col gap-8 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
          <p className="flex items-center gap-2 text-sm font-bold text-primary">
            <StickyNote className="h-4 w-4" />
            Active task
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-sprout-on-surface md:text-4xl">
            {lessonTitle}
          </h1>
          <p className="mt-2 text-sprout-on-surface-variant">{taskPrompt}</p>
          </div>
          <Link
            href={`/lessons/${lessonId}`}
            className="text-sm font-semibold text-primary hover:underline"
          >
            Back to lesson
          </Link>
        </div>

        <div className="relative flex min-h-[320px] flex-col rounded-2xl bg-sprout-surface-container p-4 md:p-8">
          <div className="absolute left-1/2 top-6 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full border border-sprout-outline-variant/20 bg-sprout-surface-container-low/95 px-3 py-2 shadow-lg backdrop-blur-md">
            {(
              [
                { id: "pen" as const, icon: Pencil },
                { id: "highlighter" as const, icon: Highlighter },
                { id: "eraser" as const, icon: Eraser },
                { id: "comment" as const, icon: MessageSquarePlus },
              ] as const
            ).map(({ id, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTool(id)}
                className={cn(
                  "rounded-full p-3 transition active:scale-95",
                  tool === id
                    ? "bg-sprout-primary-container text-sprout-on-primary-container"
                    : "text-sprout-on-surface-variant hover:bg-sprout-surface-container-highest"
                )}
                aria-label={id}
              >
                <Icon className="h-5 w-5" />
              </button>
            ))}
          </div>

          <div
            ref={wrapRef}
            className="relative mx-auto mt-20 aspect-[3/4] w-full max-w-2xl overflow-hidden rounded-sm bg-white shadow-xl"
          >
            <div
              className="pointer-events-none absolute inset-0 z-[1] opacity-[0.07] [background-image:radial-gradient(#376b00_1px,transparent_1px)] [background-size:20px_20px]"
              aria-hidden
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt="Homework"
              className="absolute inset-0 z-0 h-full w-full object-contain"
              crossOrigin="anonymous"
              onLoad={syncCanvasSize}
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 z-[2] h-full w-full touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
            />
            {pins.map((pin, i) => (
              <div
                key={i}
                className="pointer-events-none absolute z-[3] max-w-[160px] rounded-lg border-l-4 border-primary bg-sprout-tertiary-container p-2 text-xs text-sprout-on-tertiary-container shadow-md"
                style={{
                  left: `${(pin.x / size.w) * 100}%`,
                  top: `${(pin.y / size.h) * 100}%`,
                  transform: "translate(-10%, -110%)",
                }}
              >
                {pin.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="flex w-full flex-col gap-6 lg:w-80">
        <div className="rounded-2xl bg-sprout-surface-container-low p-6 shadow-[0_12px_32px_-4px_rgba(45,52,48,0.06)]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-sprout-surface-container-highest text-lg font-bold text-primary">
              {tutorName.slice(0, 1).toUpperCase()}
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-sprout-surface-container-low bg-sprout-primary-container" />
            </div>
            <div>
              <h3 className="font-bold text-sprout-on-surface">Need help?</h3>
              <p className="text-xs text-sprout-on-surface-variant">
                Message {tutorName}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl rounded-tl-none bg-sprout-surface-container-highest p-3 text-sm text-sprout-on-surface">
            Hi there! Stuck on anything? Send me a quick note or use Reply.
          </div>
          {mailto ? (
            <a
              href={mailto}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-sprout-surface-container-highest py-3 text-sm font-bold text-sprout-on-surface transition hover:opacity-90"
            >
              Reply to {tutorName.split(" ")[0] ?? "tutor"}
            </a>
          ) : (
            <p className="mt-4 text-center text-xs text-sprout-on-surface-variant">
              Tutor email unavailable — use Settings.
            </p>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 rounded-2xl bg-sprout-surface-container-low p-6">
          <h3 className="flex items-center gap-2 font-bold text-sprout-on-surface">
            <MessageSquarePlus className="h-4 w-4" />
            Add comment
          </h3>
          <Textarea
            value={commentBox}
            onChange={(e) => setCommentBox(e.target.value)}
            placeholder="Type a note for your teacher..."
            className="min-h-32 rounded-xl border-0 bg-sprout-surface-container-highest"
          />
          {recentCommentPreview && (
            <p className="flex items-start gap-2 text-xs text-sprout-on-surface-variant">
              <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Recent: &ldquo;{recentCommentPreview}
                {recentCommentPreview.length >= 80 ? "…" : ""}&rdquo;
              </span>
            </p>
          )}
          <p className="text-xs text-sprout-on-surface-variant">
            Your teacher will see this note with your submitted image.
          </p>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur md:pb-4 lg:static lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
          {error && (
            <p className="mb-2 text-center text-sm text-destructive">{error}</p>
          )}
          <Button
            type="button"
            disabled={pending}
            onClick={onSubmit}
            className="mx-auto flex h-14 w-full max-w-lg rounded-full bg-gradient-to-br from-[var(--sprout-gradient-from)] to-[var(--sprout-gradient-to)] text-base font-extrabold text-[var(--sprout-on-primary-container)] shadow-lg hover:scale-[1.01] active:scale-[0.99] lg:max-w-none"
          >
            {pending ? "Submitting…" : "Submit my work"}
            <Send className="ml-2 h-5 w-5" />
          </Button>
          {dueAt && (
            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-widest text-sprout-on-surface-variant">
              Deadline:{" "}
              {new Date(dueAt).toLocaleString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
