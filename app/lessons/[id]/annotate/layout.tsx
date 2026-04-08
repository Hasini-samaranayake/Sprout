import Link from "next/link";
import { SproutLogo } from "@/components/brand/sprout-logo";

export default function AnnotateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-card/90 px-4 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <SproutLogo size={44} />
          <div>
            <p className="text-lg font-bold tracking-tight text-sprout-on-surface">
              Sprout
            </p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-sprout-on-surface-variant">
              Workspace
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/student"
          className="text-sm font-semibold text-primary hover:underline"
        >
          Home
        </Link>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-6 pb-32 lg:pb-8">{children}</div>
    </div>
  );
}
