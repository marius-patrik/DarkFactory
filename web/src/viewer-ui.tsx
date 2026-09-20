import type { ReactElement } from "react";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function TooltipAction({
  label,
  icon,
  onClick,
  href,
  download,
  target,
  pressed,
  disabled = false,
  className = "",
}: {
  label: string;
  icon: string | string[];
  onClick?: () => void;
  href?: string;
  download?: boolean;
  target?: string;
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
}): ReactElement {
  const content = href && !disabled ? (
    <Button asChild type="button" variant="ghost" size="icon" className={"icon-action " + className}>
      <a
        href={href}
        download={download || undefined}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        aria-label={label}
      >
        <AnimatedIcon names={icon} />
      </a>
    </Button>
  ) : (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={"icon-action " + className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
    >
      <AnimatedIcon names={icon} />
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
