import Link from "next/link";
import { cn } from "@/lib/utils";

export function SproutGradientButton({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[var(--sprout-gradient-from)] to-[var(--sprout-gradient-to)] px-8 py-4 text-base font-bold text-[var(--sprout-on-primary-container)] shadow-lg transition hover:scale-[1.02] active:scale-[0.98]",
        className
      )}
    >
      {children}
    </Link>
  );
}
