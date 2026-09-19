import type { ComponentType, HTMLAttributes } from "react";
import * as AnimatedIcons from "lucide-animated";

type AnimatedIconProps = HTMLAttributes<HTMLDivElement> & {
  names: string | string[];
  size?: number;
};

type LucideAnimatedComponent = ComponentType<
  HTMLAttributes<HTMLDivElement> & {
    size?: number;
    animateOnHover?: boolean;
  }
>;

export function AnimatedIcon({
  names,
  size = 18,
  className,
  ...props
}: AnimatedIconProps) {
  const candidates = Array.isArray(names) ? names : [names];
  const registry = AnimatedIcons as unknown as Record<string, LucideAnimatedComponent>;
  const Icon = candidates.map((name) => registry[name]).find(Boolean);

  if (!Icon) return null;

  return (
    <Icon
      size={size}
      animateOnHover
      className={className}
      aria-hidden="true"
      {...props}
    />
  );
}
