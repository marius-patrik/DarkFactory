import type { ComponentType, HTMLAttributes, SVGProps } from "react";
import * as AnimatedIcons from "lucide-animated";
import {
  Maximize,
  Minimize,
  PanelLeft,
  PanelRight,
} from "lucide-react";

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

type LucideStaticComponent = ComponentType<
  SVGProps<SVGSVGElement> & {
    size?: number | string;
  }
>;

const STATIC_FALLBACKS: Record<string, LucideStaticComponent> = {
  PanelLeft,
  PanelLeftIcon: PanelLeft,
  PanelRight,
  PanelRightIcon: PanelRight,
  Maximize,
  MaximizeIcon: Maximize,
  Minimize,
  MinimizeIcon: Minimize,
};

export function AnimatedIcon({
  names,
  size = 18,
  className,
  ...props
}: AnimatedIconProps) {
  const candidates = Array.isArray(names) ? names : [names];
  const animatedRegistry = AnimatedIcons as unknown as Record<string, LucideAnimatedComponent>;

  const Animated = candidates.map((name) => animatedRegistry[name]).find(Boolean);
  if (Animated) {
    return (
      <Animated
        size={size}
        animateOnHover
        className={className}
        aria-hidden="true"
        {...props}
      />
    );
  }

  const Static = candidates
    .flatMap((name) => [name, name.replace(/Icon$/, "")])
    .map((name) => STATIC_FALLBACKS[name])
    .find(Boolean);

  if (!Static) return null;

  return (
    <Static
      size={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    />
  );
}
