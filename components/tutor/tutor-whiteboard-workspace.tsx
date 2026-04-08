"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Eraser, Highlighter, Pencil } from "lucide-react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { insertWhiteboardLessonRecord } from "@/app/actions/whiteboard-lesson";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { Json } from "@/types/database";

type Tool = "pen" | "highlighter" | "eraser";

type Stroke = {
  tool: "pen" | "highlighter" | "eraser";
  points: [number, number][];
};

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

export function TutorWhiteboardWorkspace() {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<Stroke | null>(null);
  const [title, setTitle] = useState("Untitled lesson");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [size, setSize] = useState({ w: 800, h: 480 });

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fefffc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    const h = Math.max(400, Math.min(640, Math.round(w * 0.55)));
    if (w > 0) {
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

  const strokesPayload: Json = { strokes, v: 1 };

  function onSave() {
    setError(null);
    startTransition(async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((res) =>
        canvas.toBlob((b) => res(b), "image/png")
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

      const id = crypto.randomUUID();
      const path = `${user.id}/${id}.png`;
      const { error: upErr } = await supabase.storage
        .from("tutor-whiteboards")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (upErr) {
        setError(upErr.message);
        return;
      }

      const fin = await insertWhiteboardLessonRecord({
        id,
        title,
        image_storage_path: path,
        strokes_json: strokesPayload,
      });
      if (!fin.ok) {
        setError(fin.error);
        return;
      }
      router.push("/dashboard/tutor");
      router.refresh();
    });
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Label htmlFor="wb-title">Lesson title</Label>
          <Input
            id="wb-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="max-w-md"
            placeholder="Untitled lesson"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" asChild>
            <a href="/dashboard/tutor">Cancel</a>
          </Button>
          <Button
            type="button"
            className="bg-teal-700 hover:bg-teal-800"
            disabled={pending}
            onClick={onSave}
          >
            {pending ? "Saving…" : "End lesson & save"}
          </Button>
        </div>
      </div>

      <div className="relative flex min-h-[400px] flex-col rounded-2xl border border-sprout-outline-variant/30 bg-sprout-surface-container p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-sprout-on-surface-variant">
          <span className="font-semibold text-sprout-on-surface">Tools:</span>
          {(
            [
              { id: "pen" as const, icon: Pencil, label: "Pen" },
              { id: "highlighter" as const, icon: Highlighter, label: "Highlighter" },
              { id: "eraser" as const, icon: Eraser, label: "Eraser" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTool(id)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 font-medium transition",
                tool === id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-sprout-outline-variant/40 bg-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div ref={wrapRef} className="relative min-h-[400px] w-full flex-1">
          <canvas
            ref={canvasRef}
            className="pointer-events-auto touch-none rounded-xl border border-sprout-outline-variant/20 bg-[#fefffc]"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
