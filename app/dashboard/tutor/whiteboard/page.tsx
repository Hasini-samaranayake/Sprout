import Link from "next/link";
import { TutorWhiteboardWorkspace } from "@/components/tutor/tutor-whiteboard-workspace";

export default function TutorWhiteboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tutor"
          className="text-sm font-medium text-primary hover:underline"
        >
          ← Tutor home
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-sprout-on-surface md:text-3xl">
          New lesson (whiteboard)
        </h1>
        <p className="mt-1 text-sm text-sprout-on-surface-variant">
          Draw on the board, then save. Linked students will see it on their home
          page.
        </p>
      </div>
      <TutorWhiteboardWorkspace />
    </div>
  );
}
