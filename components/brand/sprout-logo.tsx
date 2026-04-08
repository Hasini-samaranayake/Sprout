import Image from "next/image";

type SproutLogoProps = {
  className?: string;
  /** Display width/height in pixels (square). */
  size?: number;
  priority?: boolean;
};

export function SproutLogo({
  className,
  size = 64,
  priority = false,
}: SproutLogoProps) {
  return (
    <Image
      src="/brand/sprout-logo.png"
      alt="Sprout"
      width={size}
      height={size}
      className={className}
      priority={priority}
    />
  );
}
