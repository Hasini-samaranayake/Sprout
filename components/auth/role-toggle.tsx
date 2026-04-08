"use client";

import { cn } from "@/lib/utils";

export type AccountRole = "student" | "tutor";

type RoleToggleProps = {
  value: AccountRole;
  onChange: (value: AccountRole) => void;
  id?: string;
  disabled?: boolean;
};

export function RoleToggle({
  value,
  onChange,
  id = "account-role",
  disabled,
}: RoleToggleProps) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Account type"
      className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200/90 bg-stone-50/90 p-1 shadow-inner ring-1 ring-stone-100"
    >
      {(
        [
          { id: "role-student", v: "student" as const, label: "Student" },
          { id: "role-tutor", v: "tutor" as const, label: "Tutor" },
        ] as const
      ).map(({ id: btnId, v, label }) => (
        <button
          key={v}
          type="button"
          id={btnId}
          role="radio"
          aria-checked={value === v}
          disabled={disabled}
          onClick={() => onChange(v)}
          className={cn(
            "rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
            value === v
              ? "bg-white text-teal-900 shadow-sm ring-1 ring-teal-800/10"
              : "text-stone-600 hover:text-teal-900",
            disabled && "pointer-events-none opacity-60"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
