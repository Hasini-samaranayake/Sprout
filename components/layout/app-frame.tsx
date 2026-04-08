import Link from "next/link";
import { SproutLogo } from "@/components/brand/sprout-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import type { UserRole } from "@/types/database";

export function AppFrame({
  role,
  title,
  children,
}: {
  role: UserRole;
  title: string;
  children: React.ReactNode;
}) {
  const links =
    role === "student"
      ? [
          { href: "/dashboard/student", label: "Home" },
          { href: "/settings", label: "Settings" },
        ]
      : [
          { href: "/dashboard/tutor", label: "Home" },
          { href: "/settings", label: "Settings" },
        ];

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-8">
            <Link
              href={role === "student" ? "/dashboard/student" : "/dashboard/tutor"}
              className="flex items-center gap-2 text-lg font-semibold tracking-tight text-teal-800"
            >
              <SproutLogo size={36} />
              <span>Sprout</span>
            </Link>
            <nav className="hidden gap-1 sm:flex" aria-label="Main">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-stone-500 md:inline">{title}</span>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
