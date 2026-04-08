import Image from "next/image";
import { cn } from "@/lib/utils";

type SproutLogoProps = {
  className?: string;
  /** Display width/height in pixels (square). */
  size?: number;
  priority?: boolean;
};

export function SproutLogo({
  className,
  size = 72,
  priority = false,
}: SproutLogoProps) {
  return (
    <Image
      src="/brand/sprout-logo.png"
      alt="Sprout"
      width={size}
      height={size}
      className={cn("overflow-hidden rounded-2xl shadow-sm", className)}
      priority={priority}
    />
  );
}
