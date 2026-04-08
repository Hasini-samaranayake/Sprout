"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Home, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { id: "home", href: "/dashboard/student", label: "Home", icon: Home },
  {
    id: "homework",
    href: "/dashboard/student#due-work",
    label: "Homework",
    icon: BookOpen,
  },
  {
    id: "messages",
    href: "/dashboard/student/messages",
    label: "Messages",
    icon: MessageCircle,
  },
  { id: "profile", href: "/settings", label: "Profile", icon: User },
];

export function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-6 left-1/2 z-40 flex w-[90%] max-w-md -translate-x-1/2 justify-around rounded-full border border-sprout-outline-variant/20 bg-sprout-surface-container/90 px-2 py-2 shadow-[0_12px_32px_-4px_rgba(45,52,48,0.06)] backdrop-blur-lg md:hidden"
      aria-label="Student navigation"
    >
      {items.map(({ id, href, label, icon: Icon }) => {
        const active =
          id === "home"
            ? pathname === "/dashboard/student"
            : id === "messages"
              ? pathname === "/dashboard/student/messages"
              : id === "profile"
                ? pathname === "/settings"
                : false;
        return (
          <Link
            key={id}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center rounded-full p-2 transition-colors",
              active
                ? "scale-105 bg-gradient-to-br from-[var(--sprout-gradient-from)] to-[var(--sprout-gradient-to)] text-white shadow-md"
                : "text-sprout-on-surface-variant hover:bg-white/30"
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
            <span className="mt-0.5 text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
