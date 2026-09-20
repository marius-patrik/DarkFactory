import type { ComponentType, HTMLAttributes, SVGProps } from "react";
import * as AnimatedIcons from "lucide-animated";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Code2,
  Columns2,
  Braces,
  Eye,
  File,
  FileCode2,
  Files,
  FileText,
  Folder,
  FolderTree,
  Home,
  Languages,
  Maximize,
  Minimize,
  Minus,
  PanelLeft,
  PanelsLeftRight,
  PanelRight,
  PencilLine,
  RefreshCw,
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
  BookOpen,
  BookOpenIcon: BookOpen,
  Braces,
  BracesIcon: Braces,
  Eye,
  EyeIcon: Eye,
  File,
  FileIcon: File,
  CheckCircle2,
  CheckCircle2Icon: CheckCircle2,
  Circle,
  CircleIcon: Circle,
  Code2,
  Code2Icon: Code2,
  Columns2,
  Columns2Icon: Columns2,
  FileCode2,
  FileCode2Icon: FileCode2,
  Files,
  FilesIcon: Files,
  FileText,
  FileTextIcon: FileText,
  Folder,
  FolderIcon: Folder,
  FolderTree,
  FolderTreeIcon: FolderTree,
  Home,
  HomeIcon: Home,
  Languages,
  LanguagesIcon: Languages,
  PencilLine,
  PencilLineIcon: PencilLine,
  PanelLeft,
  PanelLeftIcon: PanelLeft,
  PanelLeftRight: PanelsLeftRight,
  PanelLeftRightIcon: PanelsLeftRight,
  PanelsLeftRight,
  PanelsLeftRightIcon: PanelsLeftRight,
  PanelRight,
  PanelRightIcon: PanelRight,
  Maximize,
  MaximizeIcon: Maximize,
  Minimize,
  MinimizeIcon: Minimize,
  Minus,
  MinusIcon: Minus,
  RefreshCw,
  RefreshCwIcon: RefreshCw,
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
