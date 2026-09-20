import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  PdfDocumentView,
  type DocumentChapter,
  type DocumentControl,
  type DocumentState,
  type SemanticHeading,
  type ScaleMode,
  type SidebarMode,
  type SidebarSide,
} from "./pdf-document";
import {
  CompiledArtifactView,
  RawArtifactView,
  SourceFileView,
  type ArtifactFormat,
} from "./compiled-artifact";
import {
  ReviewWorkspace,
  type ReviewWorkspaceControl,
  type WorkspacePane,
  type WorkspacePaneKind,
  type WorkspaceSplitDirection,
} from "./workspace";

const DEFAULT_WORK_TITLE =
  "DarkFactory: Umělá inteligence v praxi - Agentické a harnessové inženýrství";

type ArtifactSet = {
  pdf: string;
  markdown: string;
  html: string;
};

type PublicationVariant = {
  profile: string;
  title: string;
  subtitle: string;
  final: string;
  review: string;
  artifacts?: {
    final: ArtifactSet;
    review: ArtifactSet;
  };
  recommended: boolean;
};

type Manifest = {
  commit: string;
  work_title: string;
  default_template: string;
  templates: string[];
  variants: PublicationVariant[];
  viewer?: {
    engine?: string;
    pdfjs_version?: string;
    formats?: ArtifactFormat[];
    modes?: string[];
    repo_tree?: string;
    content_index?: string;
    repository_url?: string;
    stack?: string[];
  };
};

type ViewerMode = "final" | "review" | "raw";
type ViewMode = "single" | "split";
type AppearanceMode = "light" | "dark" | "oled";
type ActivityPanel = "structure" | "explorer" | null;
type ActiveActivityPanel = Exclude<ActivityPanel, null>;
type ActivityBarPosition = "left" | "right" | "top" | "bottom";

type RepoTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  source?: string | null;
  children?: RepoTreeNode[];
};

function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    void fetch("variants.json?cache=" + Date.now(), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("variants.json: " + response.status);
        return response.json() as Promise<Manifest>;
      })
      .then((data) => {
        if (!disposed) setManifest(data);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason?.message || reason));
      });

    return () => {
      disposed = true;
    };
  }, []);

  return { manifest, error };
}

function safeArtifactPath(value: string | null, format: ArtifactFormat) {
  const extension = format === "pdf" ? ".pdf" : format === "markdown" ? ".md" : ".html";
  if (!value || !value.toLowerCase().endsWith(extension)) return null;
  if (value.includes("://") || value.startsWith("//") || value.startsWith("/")) return null;
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) return null;
  return parts.join("/");
}

function withRefreshToken(path: string, token: string | number) {
  if (!token) return path;
  const separator = path.includes("?") ? "&" : "?";
  return path + separator + "refresh=" + encodeURIComponent(String(token));
}

function languageDisplayName(value: string) {
  return value
    .replace(/\b(verze|version)\b/giu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function languageShortId(profile: string) {
  if (profile === "school" || profile === "cs") return "CZ";
  if (profile === "en") return "EN";
  if (profile === "merged") return "CZ+EN";
  return profile.toUpperCase();
}

function clampSidebarWidth(value: number) {
  return Math.max(190, Math.min(640, Math.round(value)));
}

type CommandBinding = {
  id: string;
  key: string;
  primaryModifier?: boolean;
  enabled?: boolean;
  run: () => void;
};

function useCommand(binding: CommandBinding) {
  const { enabled = true, key, primaryModifier = false, run } = binding;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const primaryMatches = primaryModifier
        ? event.metaKey || event.ctrlKey
        : !event.metaKey && !event.ctrlKey;
      if (!primaryMatches || event.altKey || event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }
      event.preventDefault();
      run();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, key, primaryModifier, run]);
}

function useRepoTree(path: string) {
  const [nodes, setNodes] = useState<RepoTreeNode[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    setError("");
    void fetch(path + "?cache=" + Date.now(), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(path + ": " + response.status);
        return response.json() as Promise<{ tree?: RepoTreeNode[] } | RepoTreeNode[]>;
      })
      .then((data) => {
        if (disposed) return;
        setNodes(Array.isArray(data) ? data : Array.isArray(data.tree) ? data.tree : []);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason?.message || reason));
      });

    return () => {
      disposed = true;
    };
  }, [path]);

  return { nodes, error };
}

function useContentIndex(
  path: string,
  template: string,
  profile: string,
  mode: ViewerMode,
) {
  const [entries, setEntries] = useState<SemanticHeading[]>([]);

  useEffect(() => {
    let disposed = false;
    void fetch(path + "?cache=" + Date.now(), { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(path + ": " + response.status);
        return response.json() as Promise<{
          templates?: Record<
            string,
            Record<string, Record<"final" | "review", SemanticHeading[]>>
          >;
        }>;
      })
      .then((data) => {
        if (disposed) return;
        const publicationMode = mode === "review" ? "review" : "final";
        setEntries(data.templates?.[template]?.[profile]?.[publicationMode] || []);
      })
      .catch(() => {
        if (!disposed) setEntries([]);
      });

    return () => {
      disposed = true;
    };
  }, [mode, path, profile, template]);

  return entries;
}

function artifactFilename(
  variant: PublicationVariant,
  mode: ViewerMode,
  format: ArtifactFormat,
) {
  const publicationMode = mode === "review" ? "review" : "final";
  const declared = variant.artifacts?.[publicationMode]?.[format];
  if (declared) return declared;
  const pdf = publicationMode === "review" ? variant.review : variant.final;
  if (format === "pdf") return pdf;
  return pdf.replace(/\.pdf$/i, format === "markdown" ? ".md" : ".html");
}

function hrefFor(templateName: string, defaultTemplate: string, filename: string) {
  return templateName === defaultTemplate
    ? filename
    : "templates/" + templateName + "/" + filename;
}

function viewerHref(args: {
  file: string;
  peer: string;
  template: string;
  profile: string;
  title: string;
  mode: ViewerMode;
  format?: ArtifactFormat;
  view?: ViewMode;
  split?: WorkspaceSplitDirection;
  embedded?: boolean;
}) {
  const query = new URLSearchParams();
  query.set("file", args.file);
  query.set("peer", args.peer);
  query.set("template", args.template);
  query.set("profile", args.profile);
  query.set("title", args.title);
  query.set("mode", args.mode);
  query.set("format", args.format || "pdf");
  if (args.view === "split") query.set("view", "split");
  if (args.split) query.set("split", args.split);
  if (args.embedded) query.set("embedded", "1");
  return (args.embedded ? "viewer.html?" : "./?") + query.toString();
}

function childHref(args: {
  file: string;
  template: string;
  profile: string;
  title: string;
  mode: ViewerMode;
  format?: ArtifactFormat;
}) {
  return viewerHref({
    ...args,
    peer: "",
    view: "single",
    embedded: true,
  });
}

function TooltipAction({
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
}) {
  const content = href && !disabled ? (
    <Button
      asChild
      type="button"
      variant="ghost"
      size="icon"
      className={"icon-action " + className}
    >
      <a
        href={href}
        download={download || undefined}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        aria-label={label}
      >
        <AnimatedIcon names={icon} size={18} />
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
      <AnimatedIcon names={icon} size={18} />
    </Button>
  );

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ActivityBar({
  position,
  active,
  structureAvailable,
  onSelect,
  onMovePosition,
}: {
  position: ActivityBarPosition;
  active: ActivityPanel;
  structureAvailable: boolean;
  onSelect: (panel: ActivityPanel) => void;
  onMovePosition: (position: ActivityBarPosition) => void;
}) {
  const positions: Array<{ position: ActivityBarPosition; label: string; icon: string[] }> = [
    { position: "left", label: "Left", icon: ["PanelLeftIcon"] },
    { position: "right", label: "Right", icon: ["PanelRightIcon"] },
    { position: "top", label: "Top", icon: ["PanelTopIcon", "PanelTopOpenIcon"] },
    { position: "bottom", label: "Bottom", icon: ["PanelBottomIcon", "PanelBottomOpenIcon"] },
  ];

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <aside className={"activitybar activitybar-" + position} aria-label="Viewer activity bar">
          <TooltipAction
            label="Structure"
            icon={["FilesIcon"]}
            pressed={active === "structure"}
            disabled={!structureAvailable}
            onClick={() => onSelect(active === "structure" ? null : "structure")}
            className="activity-action"
          />
          <TooltipAction
            label="Explorer"
            icon={["FolderIcon"]}
            pressed={active === "explorer"}
            onClick={() => onSelect(active === "explorer" ? null : "explorer")}
            className="activity-action"
          />
        </aside>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {positions.map((option) => (
          <ContextMenuItem
            key={option.position}
            disabled={position === option.position}
            onSelect={() => onMovePosition(option.position)}
          >
            <AnimatedIcon names={option.icon} size={16} />
            Activity Bar {option.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function RepoTreeBranch({
  nodes,
  depth,
  onOpenFile,
}: {
  nodes: RepoTreeNode[];
  depth: number;
  onOpenFile: (node: RepoTreeNode) => void;
}) {
  return (
    <div className="repo-tree-level" data-depth={depth}>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <details key={node.path} className="repo-tree-directory" open={depth === 0}>
            <summary>
              <AnimatedIcon names={["FolderIcon"]} />
              <span>{node.name}</span>
            </summary>
            <RepoTreeBranch
              nodes={node.children || []}
              depth={depth + 1}
              onOpenFile={onOpenFile}
            />
          </details>
        ) : (
          <button
            key={node.path}
            type="button"
            className="repo-tree-file"
            onClick={() => onOpenFile(node)}
            disabled={!node.source}
            title={node.source ? node.path : node.path + " is not a regular tracked file"}
          >
            <AnimatedIcon names={["FileIcon", "FileTextIcon"]} />
            <span>{node.name}</span>
          </button>
        ),
      )}
    </div>
  );
}

function SidebarResizeHandle({
  side,
  width,
  onWidthChange,
}: {
  side: SidebarSide;
  width: number;
  onWidthChange: (width: number) => void;
}) {
  const beginResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const onMove = (move: PointerEvent) => {
      const delta = side === "left" ? move.clientX - startX : startX - move.clientX;
      onWidthChange(clampSidebarWidth(startWidth + delta));
    };
    const stop = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop, { once: true });
  };

  return (
    <hr
      className={"sidebar-resizer sidebar-resizer-" + side}
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      onPointerDown={beginResize}
    />
  );
}

function RepoFilesPanel({
  nodes,
  error,
  side,
  width,
  onWidthChange,
  onOpenFile,
}: {
  nodes: RepoTreeNode[];
  error: string;
  side: SidebarSide;
  width: number;
  onWidthChange: (width: number) => void;
  onOpenFile: (node: RepoTreeNode) => void;
}) {
  return (
    <aside
      className={"repo-files-panel repo-files-" + side}
      aria-label="Explorer"
      style={{ width, flexBasis: width }}
    >
      <div className="activity-panel-header">
        <AnimatedIcon names={["FolderIcon"]} />
        <span>Explorer</span>
      </div>
      <div className="repo-files-tree">
        {error ? (
          <div className="repo-files-error">{error}</div>
        ) : nodes.length ? (
          <RepoTreeBranch nodes={nodes} depth={0} onOpenFile={onOpenFile} />
        ) : (
          <div className="repo-files-loading">Loading repository tree…</div>
        )}
      </div>
      <SidebarResizeHandle side={side} width={width} onWidthChange={onWidthChange} />
    </aside>
  );
}

function LanguagePicker({
  manifest,
  templateName,
  profileName,
  mode,
  viewMode,
  format,
  versionTitle,
  onNavigate,
  onSelectProfile,
}: {
  manifest: Manifest;
  templateName: string;
  profileName: string;
  mode: ViewerMode;
  viewMode: ViewMode;
  format: ArtifactFormat;
  versionTitle: string;
  onNavigate: (href: string) => void;
  onSelectProfile?: (variant: PublicationVariant) => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="version-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="version-select" aria-label="Language">
                <AnimatedIcon names={["LanguagesIcon"]} size={15} />
                <strong className="status-short-id">{languageShortId(profileName)}</strong>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={13} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Language</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="version-menu">
        {manifest.variants.map((variant) => {
          const file = hrefFor(
            templateName,
            manifest.default_template,
            artifactFilename(variant, mode, format),
          );
          const peer = hrefFor(
            templateName,
            manifest.default_template,
            artifactFilename(variant, mode === "review" ? "final" : "review", format),
          );
          const href = viewerHref({
            file,
            peer,
            template: templateName,
            profile: variant.profile,
            title: variant.title,
            mode,
            format,
            view: viewMode,
          });
          const active = variant.profile === profileName;

          return (
            <DropdownMenuItem
              key={variant.profile}
              className={active ? "version-item active" : "version-item"}
              onSelect={() => {
                if (onSelectProfile) onSelectProfile(variant);
                else onNavigate(href);
              }}
            >
              <AnimatedIcon names={["LanguagesIcon"]} size={16} />
              <span className="version-option">
                <strong>{languageDisplayName(variant.title)}</strong>
                <small>{languageShortId(variant.profile)}</small>
              </span>
              {active && <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={16} />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RendererPicker({
  mode,
  viewerTarget,
  reviewHref,
  rawHref,
  onNavigate,
  onSelectMode,
}: {
  mode: ViewerMode;
  viewerTarget: string;
  reviewHref: string;
  rawHref: string;
  onNavigate: (href: string) => void;
  onSelectMode?: (mode: ViewerMode) => void;
}) {
  const options: Array<{ mode: ViewerMode; label: string; href: string; icon: string[] }> = [
    { mode: "final", label: "View", href: viewerTarget, icon: ["EyeIcon"] },
    { mode: "review", label: "Review", href: reviewHref, icon: ["PencilLineIcon"] },
    { mode: "raw", label: "Raw", href: rawHref, icon: ["BracesIcon", "FileCode2Icon"] },
  ];
  const active = options.find((option) => option.mode === mode) || options[0];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="renderer-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="renderer-select" aria-label="Renderer">
                <AnimatedIcon names={active.icon} size={14} />
                <span>{active.label}</span>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={13} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Renderer</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="renderer-menu">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.mode}
            className={mode === option.mode ? "renderer-item active" : "renderer-item"}
            onSelect={() => {
              if (onSelectMode) onSelectMode(option.mode);
              else onNavigate(option.href);
            }}
          >
            <AnimatedIcon names={option.icon} size={15} />
            <span>{option.label}</span>
            {mode === option.mode && <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
function FormatPicker({
  format,
  pdfHref,
  markdownHref,
  htmlHref,
  onNavigate,
  onSelectFormat,
}: {
  format: ArtifactFormat;
  pdfHref: string;
  markdownHref: string;
  htmlHref: string;
  onNavigate: (href: string) => void;
  onSelectFormat?: (format: ArtifactFormat) => void;
}) {
  const options: Array<{
    format: ArtifactFormat;
    label: string;
    short: string;
    href: string;
    icon: string[];
    extension: string;
  }> = [
    { format: "pdf", label: "PDF", short: "PDF", extension: ".pdf", href: pdfHref, icon: ["FileTextIcon"] },
    { format: "markdown", label: "Markdown", short: "MD", extension: ".md", href: markdownHref, icon: ["FileCode2Icon"] },
    { format: "html", label: "HTML", short: "HTML", extension: ".html", href: htmlHref, icon: ["Code2Icon"] },
  ];

  const active = options.find((option) => option.format === format) || options[0];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="format-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" className="format-select" aria-label="File type">
                <AnimatedIcon names={active.icon} size={14} />
                <strong className="status-short-id">{active.short}</strong>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={13} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>File type</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="format-menu">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.format}
            className={format === option.format ? "format-item active" : "format-item"}
            onSelect={() => {
              if (onSelectFormat) onSelectFormat(option.format);
              else onNavigate(option.href);
            }}
          >
            <AnimatedIcon names={option.icon} size={15} />
            <span className="version-option">
              <strong>{option.label}</strong>
              <small>{option.extension}</small>
            </span>
            {format === option.format && (
              <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ChapterPicker({
  chapters,
  page,
  onSelect,
}: {
  chapters: DocumentChapter[];
  page: number;
  onSelect: (page: number) => void;
}) {
  const active =
    [...chapters].reverse().find((chapter) => chapter.page <= page) || chapters[0] || null;

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="chapter-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="chapter-select"
                aria-label="Navigate chapters"
                disabled={!chapters.length}
              >
                <AnimatedIcon names={["BookOpenIcon"]} size={15} />
                <span className="chapter-title">{active?.title || "Kapitola"}</span>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={14} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Navigate chapters</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="chapter-menu">
        {chapters.map((chapter) => (
          <DropdownMenuItem
            key={chapter.title + "-" + chapter.page}
            className={active === chapter ? "chapter-item active" : "chapter-item"}
            onSelect={() => onSelect(chapter.page)}
          >
            <AnimatedIcon names={["BookOpenIcon"]} size={15} />
            <span
              className="chapter-option-title"
              style={{ paddingLeft: Math.max(0, chapter.level - 1) * 14 }}
            >
              {chapter.title}
            </span>
            <small>{chapter.page}</small>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function triggerDownload(path: string | null) {
  if (!path) return;
  const anchor = document.createElement("a");
  anchor.href = path;
  anchor.download = "";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

function FileMenu({
  file,
  formatLabel,
}: {
  file: string | null;
  formatLabel: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="menubar-button">File</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          disabled={!file}
          onSelect={() => file && window.open(file, "_blank", "noopener,noreferrer")}
        >
          <AnimatedIcon names={["ExternalLinkIcon", "FileTextIcon"]} size={15} />
          Open {formatLabel === "PDF" ? "native PDF" : "rendered " + formatLabel}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!file} onSelect={() => triggerDownload(file)}>
          <AnimatedIcon names={["DownloadIcon"]} size={15} />
          Download {formatLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ViewMenu({
  sidebarOpen,
  workspace,
  theme,
  onThemeChange,
  onToggleSidebar,
  onOpenSplit,
  onSingle,
}: {
  sidebarOpen: boolean;
  workspace: boolean;
  theme: AppearanceMode;
  onThemeChange: (theme: AppearanceMode) => void;
  onToggleSidebar: () => void;
  onOpenSplit: (direction: WorkspaceSplitDirection) => void;
  onSingle: () => void;
}) {
  const appearances: Array<{ theme: AppearanceMode; label: string; icon: string[] }> = [
    { theme: "light", label: "Light", icon: ["SunIcon"] },
    { theme: "dark", label: "Dark", icon: ["MoonIcon"] },
    { theme: "oled", label: "OLED", icon: ["CircleIcon"] },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className="menubar-button">View</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={onToggleSidebar}>
          <AnimatedIcon names={["PanelLeftIcon"]} />
          {sidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenSplit("right")}>
          <AnimatedIcon names={["PanelRightOpenIcon"]} />
          {workspace ? "Split Active Right" : "Open Split Right"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onOpenSplit("below")}>
          <AnimatedIcon names={["PanelBottomOpenIcon"]} />
          {workspace ? "Split Active Down" : "Open Split Down"}
        </DropdownMenuItem>
        {workspace && (
          <DropdownMenuItem onSelect={onSingle}>
            <AnimatedIcon names={["SquareIcon"]} />
            Single View
          </DropdownMenuItem>
        )}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <AnimatedIcon names={["SunMoonIcon", "MoonIcon"]} />
            Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {appearances.map((option) => (
              <DropdownMenuItem
                key={option.theme}
                onSelect={() => onThemeChange(option.theme)}
              >
                <AnimatedIcon names={option.icon} />
                <span>{option.label}</span>
                {theme === option.theme && (
                  <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SplitViewPicker({
  workspace,
  onSplit,
  onSingle,
  onReset,
}: {
  workspace: boolean;
  onSplit: (direction: WorkspaceSplitDirection) => void;
  onSingle: () => void;
  onReset: (direction: WorkspaceSplitDirection) => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="icon-action"
                aria-label="Split view"
              >
                <AnimatedIcon names={["PanelRightOpenIcon"]} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Split view</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onSplit("right")}>
          <AnimatedIcon names={["PanelRightOpenIcon"]} />
          {workspace ? "Split active right" : "Split view right"}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onSplit("below")}>
          <AnimatedIcon names={["PanelBottomOpenIcon"]} />
          {workspace ? "Split active down" : "Split view down"}
        </DropdownMenuItem>
        {workspace && (
          <>
            <DropdownMenuItem onSelect={() => onReset("right")}>
              <AnimatedIcon names={["Columns2Icon"]} />
              Reset horizontal layout
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onReset("below")}>
              <AnimatedIcon names={["Rows2Icon"]} />
              Reset vertical layout
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onSingle}>
              <AnimatedIcon names={["SquareIcon"]} />
              Single view
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewerApp() {
  const { manifest } = useManifest();
  const [routeRevision, setRouteRevision] = useState(0);
  const params = useMemo(() => {
    void routeRevision;
    return new URLSearchParams(window.location.search);
  }, [routeRevision]);
  const requestedMode = params.get("mode");
  const mode: ViewerMode =
    requestedMode === "review" ? "review" : requestedMode === "raw" ? "raw" : "final";
  const requestedFormat = params.get("format");
  const format: ArtifactFormat =
    requestedFormat === "markdown"
      ? "markdown"
      : requestedFormat === "html"
        ? "html"
        : "pdf";
  const viewMode: ViewMode = params.get("view") === "split" ? "split" : "single";
  const initialSplitDirection: WorkspaceSplitDirection =
    params.get("split") === "below" ? "below" : "right";
  const embedded = params.get("embedded") === "1";
  const profileName = params.get("profile") || "school";
  const templateName =
    params.get("template") || manifest?.default_template || "gjkt-odborna-prace";
  const activeVariant =
    manifest?.variants.find((variant) => variant.profile === profileName) ||
    manifest?.variants.find((variant) => variant.recommended) ||
    manifest?.variants[0];
  const versionTitle = params.get("title") || activeVariant?.title || "Školní česká verze";
  const defaultFile =
    manifest && activeVariant
      ? hrefFor(
          templateName,
          manifest.default_template,
          artifactFilename(activeVariant, mode, format),
        )
      : null;
  const defaultPeer =
    manifest && activeVariant
      ? hrefFor(
          templateName,
          manifest.default_template,
          artifactFilename(activeVariant, mode === "review" ? "final" : "review", format),
        )
      : null;
  const artifactPath = safeArtifactPath(params.get("file") || defaultFile, format);
  const peerPath = safeArtifactPath(params.get("peer") || defaultPeer, format);

  const rawPath = mode === "review" ? peerPath : artifactPath;
  const reviewPath = mode === "review" ? artifactPath : peerPath;

  const documentRef = useRef<DocumentControl>(null);
  const workspaceRef = useRef<ReviewWorkspaceControl>(null);
  const suppressEmbeddedState = useRef(false);
  const [activeWorkspacePane, setActiveWorkspacePane] = useState<WorkspacePane | null>(null);
  const [openRepoFile, setOpenRepoFile] = useState<RepoTreeNode | null>(null);

  const [sidebarSide, setSidebarSideState] = useState<SidebarSide>(() =>
    localStorage.getItem("paper-viewer-sidebar-side") === "right" ? "right" : "left",
  );
  const [sidebarWidth, setSidebarWidthState] = useState(() => {
    const stored = Number(localStorage.getItem("paper-viewer-sidebar-width"));
    return clampSidebarWidth(Number.isFinite(stored) && stored > 0 ? stored : 300);
  });
  const [sidebarMode, setSidebarModeState] = useState<SidebarMode>(() =>
    localStorage.getItem("paper-viewer-sidebar-mode") === "minimap"
      ? "minimap"
      : "thumbnails",
  );
  const [activityBarPosition, setActivityBarPositionState] = useState<ActivityBarPosition>(() => {
    const stored = localStorage.getItem("paper-viewer-activitybar-position");
    return stored === "right" || stored === "top" || stored === "bottom" ? stored : "left";
  });
  const storedActivityPanel = localStorage.getItem("paper-viewer-activity-panel");
  const [activityPanel, setActivityPanelState] = useState<ActivityPanel>(() => {
    if (window.innerWidth <= 760 || storedActivityPanel === "closed") return null;
    if (storedActivityPanel === "explorer" || storedActivityPanel === "structure") {
      return storedActivityPanel;
    }
    return "structure";
  });
  const lastActivityPanel = useRef<ActiveActivityPanel>(
    storedActivityPanel === "explorer" ? "explorer" : "structure",
  );
  const [theme, setTheme] = useState<AppearanceMode>(() => {
    const stored = localStorage.getItem("paper-viewer-theme");
    if (stored === "light" || stored === "dark" || stored === "oled") return stored;
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  });
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [splitSyncScroll, setSplitSyncScroll] = useState(
    () => localStorage.getItem("paper-viewer-sync-scroll") === "true",
  );
  const [state, setState] = useState<DocumentState>({
    page: 1,
    total: 0,
    scaleMode: "fit",
    manualScale: 1,
    scrollRatio: 0,
    chapters: [],
  });
  const [pageDraft, setPageDraft] = useState("1");
  const [refreshRevision, setRefreshRevision] = useState(0);
  const repoTreePath = manifest?.viewer?.repo_tree || "repo-tree.json";
  const contentIndexPath = manifest?.viewer?.content_index || "content-index.json";
  const contentIndex = useContentIndex(
    contentIndexPath,
    templateName,
    profileName,
    mode,
  );
  const { nodes: repoTree, error: repoTreeError } = useRepoTree(repoTreePath);
  const structureAvailable =
    openRepoFile === null && viewMode === "single" && mode !== "raw" && format === "pdf";
  const scopedMode: ViewerMode =
    viewMode === "split" && activeWorkspacePane ? activeWorkspacePane.kind : mode;
  const scopedFormat: ArtifactFormat =
    viewMode === "split" && activeWorkspacePane ? activeWorkspacePane.format : format;
  const scopedProfile =
    viewMode === "split" && activeWorkspacePane ? activeWorkspacePane.profile : profileName;
  const scopedVariant =
    manifest?.variants.find((variant) => variant.profile === scopedProfile) || activeVariant;
  const scopedVersionTitle = scopedVariant?.title || versionTitle;
  const pagesAvailable =
    openRepoFile === null &&
    scopedMode !== "raw" &&
    scopedFormat === "pdf" &&
    (viewMode === "single" || state.total > 0);

  const selectActivityPanel = useCallback((panel: ActivityPanel) => {
    if (panel) {
      lastActivityPanel.current = panel;
      localStorage.setItem("paper-viewer-activity-panel", panel);
    } else {
      localStorage.setItem("paper-viewer-activity-panel", "closed");
    }
    setActivityPanelState(panel);
  }, []);

  const toggleSidebar = useCallback(() => {
    setActivityPanelState((current) => {
      if (current) {
        lastActivityPanel.current = current;
        localStorage.setItem("paper-viewer-activity-panel", "closed");
        return null;
      }

      const preferred = lastActivityPanel.current;
      const next = preferred === "structure" && !structureAvailable ? "explorer" : preferred;
      localStorage.setItem("paper-viewer-activity-panel", next);
      return next;
    });
  }, [structureAvailable]);

  useCommand({
    id: "toggle-sidebar",
    key: "b",
    primaryModifier: true,
    enabled: !embedded,
    run: toggleSidebar,
  });

  useEffect(() => {
    if (activityPanel === "structure" && !structureAvailable) {
      selectActivityPanel(null);
    }
  }, [activityPanel, selectActivityPanel, structureAvailable]);

  const openRepositoryFile = useCallback((node: RepoTreeNode) => {
    if (!node.source) return;
    setOpenRepoFile(node);
  }, []);

  const navigateViewer = useCallback((href: string) => {
    if (!href || href === "#") return;
    const next = new URL(href, window.location.href);
    if (next.origin !== window.location.origin) {
      window.open(next.href, "_blank", "noopener,noreferrer");
      return;
    }
    window.history.pushState(null, "", next.pathname + next.search + next.hash);
    setRouteRevision((revision) => revision + 1);
  }, []);
  const renderArtifactPath = withRefreshToken(
    artifactPath || "",
    params.get("refresh") || refreshRevision,
  );

  const setSidebarSide = useCallback((side: SidebarSide) => {
    setSidebarSideState(side);
    localStorage.setItem("paper-viewer-sidebar-side", side);
  }, []);

  const setSidebarWidth = useCallback((width: number) => {
    const next = clampSidebarWidth(width);
    setSidebarWidthState(next);
    localStorage.setItem("paper-viewer-sidebar-width", String(next));
  }, []);

  const setSidebarMode = useCallback((next: SidebarMode) => {
    setSidebarModeState(next);
    localStorage.setItem("paper-viewer-sidebar-mode", next);
  }, []);

  const setActivityBarPosition = useCallback(
    (position: ActivityBarPosition) => {
      setActivityBarPositionState(position);
      localStorage.setItem("paper-viewer-activitybar-position", position);
      if (position === "left" || position === "right") setSidebarSide(position);
    },
    [setSidebarSide],
  );

  const moveSidebar = useCallback(() => {
    const next = sidebarSide === "left" ? "right" : "left";
    setSidebarSide(next);
    if (activityBarPosition === "left" || activityBarPosition === "right") {
      setActivityBarPositionState(next);
      localStorage.setItem("paper-viewer-activitybar-position", next);
    }
  }, [activityBarPosition, setSidebarSide, sidebarSide]);

  const toggleSidebarMode = useCallback(() => {
    setSidebarMode(sidebarMode === "minimap" ? "thumbnails" : "minimap");
  }, [setSidebarMode, sidebarMode]);

  const sendToSplit = useCallback(
    (
      command: string,
      payload: Record<string, unknown> = {},
      except: MessageEventSource | null = null,
    ) => {
      workspaceRef.current?.sendAll(command, payload, except);
    },
    [],
  );

  const sendToActiveSplit = useCallback(
    (command: string, payload: Record<string, unknown> = {}) => {
      workspaceRef.current?.sendActive(command, payload);
    },
    [],
  );

  const handleDocumentState = useCallback(
    (next: DocumentState) => {
      setState(next);
      setPageDraft(String(next.page));
      if (embedded && window.parent !== window && !suppressEmbeddedState.current) {
        window.parent.postMessage(
          { source: "paper-viewer", kind: "state", ...next },
          "*",
        );
      }
    },
    [embedded],
  );

  const goToPage = useCallback(
    (page: number) => {
      if (viewMode === "split" && !embedded) {
        const target = Math.max(1, Math.min(state.total || page, Math.round(page) || 1));
        setState((current) => ({ ...current, page: target }));
        setPageDraft(String(target));
        sendToActiveSplit("page", { page: target });
      } else {
        documentRef.current?.goToPage(page);
      }
    },
    [embedded, sendToActiveSplit, state.total, viewMode],
  );

  const setZoom = useCallback(
    (scaleMode: ScaleMode, scale?: number) => {
      if (viewMode === "split" && !embedded) {
        const nextScale = scaleMode === "manual" ? Number(scale) || state.manualScale : state.manualScale;
        setState((current) => ({
          ...current,
          scaleMode,
          manualScale: nextScale,
        }));
        sendToActiveSplit("zoom", { mode: scaleMode, scale: nextScale });
      } else {
        documentRef.current?.setZoom(scaleMode, scale);
      }
    },
    [embedded, sendToActiveSplit, state.manualScale, viewMode],
  );

  const zoomBy = useCallback(
    (delta: number) => {
      if (viewMode === "split" && !embedded) {
        const base = state.manualScale || 1;
        const next = Math.max(0.45, Math.min(2.5, base + delta));
        setZoom("manual", next);
      } else {
        documentRef.current?.zoomBy(delta);
      }
    },
    [embedded, setZoom, state.manualScale, viewMode],
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("paper-viewer-theme", theme);
    if (viewMode === "split" && !embedded) sendToSplit("theme", { theme });
  }, [embedded, sendToSplit, theme, viewMode]);

  useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onPopState = () => setRouteRevision((revision) => revision + 1);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!embedded) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.source !== "paper-split") return;

      suppressEmbeddedState.current = true;
      if (data.command === "page") {
        documentRef.current?.goToPage(Number(data.page) || 1, "auto");
      } else if (data.command === "scroll") {
        documentRef.current?.applyScrollRatio(Number(data.ratio) || 0);
      } else if (data.command === "zoom") {
        documentRef.current?.setZoom(
          data.mode === "fit" ? "fit" : "manual",
          Number(data.scale) || 1,
        );
      } else if (data.command === "theme") {
        setTheme(
          data.theme === "light" || data.theme === "oled"
            ? data.theme
            : "dark",
        );
      }
      requestAnimationFrame(() => {
        suppressEmbeddedState.current = false;
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [embedded]);

  useEffect(() => {
    if (viewMode !== "split" || embedded) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      const sourceIsActivePane = workspaceRef.current?.isActiveSource(event.source) ?? false;
      if (!sourceIsActivePane || !data || data.source !== "paper-viewer" || data.kind !== "state") {
        return;
      }

      const nextPage = Number(data.page) || 1;
      const nextTotal = Number(data.total) || state.total;
      const nextMode: ScaleMode = data.scaleMode === "manual" ? "manual" : "fit";
      const nextScale = Number(data.manualScale) || state.manualScale;

      setState((current) => ({
        ...current,
        page: nextPage,
        total: nextTotal,
        scaleMode: nextMode,
        manualScale: nextScale,
        scrollRatio: Number(data.scrollRatio) || 0,
        chapters: Array.isArray(data.chapters) ? data.chapters : current.chapters,
      }));
      setPageDraft(String(nextPage));

      sendToSplit(
        "zoom",
        { mode: nextMode, scale: nextScale },
        event.source,
      );

      if (splitSyncScroll && Number.isFinite(data.scrollRatio)) {
        sendToSplit(
          "scroll",
          { ratio: Number(data.scrollRatio) || 0 },
          event.source,
        );
      }

      const nextUrl = new URL(window.location.href);
      nextUrl.hash = "page=" + nextPage;
      window.history.replaceState(null, "", nextUrl);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [
    embedded,
    sendToSplit,
    splitSyncScroll,
    state.manualScale,
    state.total,
    viewMode,
  ]);

  useEffect(() => {
    if (embedded || mode === "raw" || format !== "pdf") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        goToPage(state.page - 1);
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        goToPage(state.page + 1);
      } else if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        zoomBy(0.1);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "-") {
        event.preventDefault();
        zoomBy(-0.1);
      } else if ((event.ctrlKey || event.metaKey) && event.key === "0") {
        event.preventDefault();
        setZoom("fit");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [embedded, format, goToPage, mode, setZoom, state.page, zoomBy]);

  if (!artifactPath && !manifest && !params.get("file")) {
    return <div className="document-loading">Loading school Viewer PDF…</div>;
  }

  if (!artifactPath) {
    return (
      <div className="document-error">
        <strong>Invalid document path.</strong>
        <span>The requested artifact is not available.</span>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="embedded-viewer">
        {mode === "raw" ? (
          <RawArtifactView path={renderArtifactPath} format={format} embedded theme={theme} />
        ) : format === "pdf" ? (
          <PdfDocumentView
            ref={documentRef}
            pdfPath={renderArtifactPath}
            contentIndex={contentIndex}
            embedded
            sidebarSide={sidebarSide}
            sidebarMode={sidebarMode}
            sidebarHidden
            sidebarWidth={sidebarWidth}
            onMoveSidebar={moveSidebar}
            onToggleSidebarMode={toggleSidebarMode}
            onSidebarWidthChange={setSidebarWidth}
            onStateChange={handleDocumentState}
          />
        ) : (
          <CompiledArtifactView path={renderArtifactPath} format={format} embedded theme={theme} />
        )}
      </div>
    );
  }

  const workTitle = manifest?.work_title || DEFAULT_WORK_TITLE;
  const finalTarget =
    rawPath && reviewPath
      ? viewerHref({
          file: rawPath,
          peer: reviewPath,
          template: templateName,
          profile: profileName,
          title: versionTitle,
          mode: "final",
          format,
        })
      : "#";

  const reviewTarget =
    rawPath && reviewPath
      ? viewerHref({
          file: reviewPath,
          peer: rawPath,
          template: templateName,
          profile: profileName,
          title: versionTitle,
          mode: "review",
          format,
        })
      : "#";

  const selectedVariant = manifest?.variants.find((variant) => variant.profile === profileName);

  const paneFor = (
    kind: WorkspacePaneKind,
    paneFormat: ArtifactFormat,
    variant: PublicationVariant | undefined,
  ): WorkspacePane | null => {
    if (!manifest || !variant) return null;
    const artifactMode: ViewerMode = kind === "review" ? "review" : "final";
    const file = hrefFor(
      templateName,
      manifest.default_template,
      artifactFilename(variant, artifactMode, paneFormat),
    );
    return {
      id: kind,
      title: kind === "final" ? "View" : kind === "review" ? "Review" : "Raw",
      kind,
      file,
      profile: variant.profile,
      format: paneFormat,
      src: childHref({
        file,
        template: templateName,
        profile: variant.profile,
        title: variant.title,
        mode: kind,
        format: paneFormat,
      }),
    };
  };

  const workspacePanes = [
    paneFor("final", format, selectedVariant),
    paneFor("review", format, selectedVariant),
  ].filter((pane): pane is WorkspacePane => Boolean(pane));

  const splitTargetFor = (direction: WorkspaceSplitDirection) =>
    rawPath && reviewPath
      ? viewerHref({
          file: rawPath,
          peer: reviewPath,
          template: templateName,
          profile: profileName,
          title: versionTitle,
          mode: "final",
          format,
          view: "split",
          split: direction,
        })
      : "#";

  const exitSplitTarget = (() => {
    if (viewMode !== "split" || !activeWorkspacePane || !manifest) return finalTarget;
    const variant =
      manifest.variants.find((candidate) => candidate.profile === activeWorkspacePane.profile) ||
      selectedVariant;
    if (!variant) return finalTarget;
    const peerMode: ViewerMode = activeWorkspacePane.kind === "review" ? "final" : "review";
    const peer = hrefFor(
      templateName,
      manifest.default_template,
      artifactFilename(variant, peerMode, activeWorkspacePane.format),
    );
    return viewerHref({
      file: activeWorkspacePane.file,
      peer,
      template: templateName,
      profile: variant.profile,
      title: variant.title,
      mode: activeWorkspacePane.kind,
      format: activeWorkspacePane.format,
    });
  })();

  const currentDownload =
    viewMode === "split" ? activeWorkspacePane?.file || rawPath || artifactPath : artifactPath;
  const canSplit = Boolean(rawPath && reviewPath);
  const formatLabel =
    scopedFormat === "markdown" ? "Markdown" : scopedFormat.toUpperCase();

  const rawTarget =
    manifest && selectedVariant
      ? viewerHref({
          file: hrefFor(
            templateName,
            manifest.default_template,
            artifactFilename(selectedVariant, "raw", format),
          ),
          peer: hrefFor(
            templateName,
            manifest.default_template,
            artifactFilename(selectedVariant, "review", format),
          ),
          template: templateName,
          profile: profileName,
          title: versionTitle,
          mode: "raw",
          format,
        })
      : "#";
  const formatTarget = (nextFormat: ArtifactFormat) => {
    if (!manifest || !selectedVariant) return "#";
    const targetMode: ViewerMode = mode;
    const peerMode: ViewerMode = targetMode === "review" ? "final" : "review";
    const file = hrefFor(
      templateName,
      manifest.default_template,
      artifactFilename(selectedVariant, targetMode, nextFormat),
    );
    const peer = hrefFor(
      templateName,
      manifest.default_template,
      artifactFilename(selectedVariant, peerMode, nextFormat),
    );
    return viewerHref({
      file,
      peer,
      template: templateName,
      profile: profileName,
      title: versionTitle,
      mode: targetMode,
      format: nextFormat,
    });
  };
  const pdfTarget = formatTarget("pdf");
  const markdownTarget = formatTarget("markdown");
  const htmlTarget = formatTarget("html");

  const updateActiveWorkspacePane = (
    nextKind: WorkspacePaneKind = scopedMode,
    nextFormat: ArtifactFormat = scopedFormat,
    variant: PublicationVariant | undefined = scopedVariant,
  ) => {
    const pane = paneFor(nextKind, nextFormat, variant);
    if (pane) workspaceRef.current?.updateActive(pane);
  };

  const openSplit = (direction: WorkspaceSplitDirection) => {
    if (!canSplit) return;
    if (viewMode === "split") {
      workspaceRef.current?.splitActive(direction);
    } else {
      navigateViewer(splitTargetFor(direction));
    }
  };

  const refreshDocument = () => {
    setRefreshRevision((revision) => revision + 1);
  };

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.documentElement.requestFullscreen?.();
  };

  const submitPage = () => {
    const page = Number(pageDraft);
    if (Number.isFinite(page)) goToPage(page);
    else setPageDraft(String(state.page));
  };

  return (
    <div className={"viewer-shell activity-position-" + activityBarPosition}>
      <nav className="menubar" aria-label="Application menu">
        <FileMenu file={currentDownload} formatLabel={formatLabel} />
        <ViewMenu
          sidebarOpen={activityPanel !== null}
          workspace={viewMode === "split"}
          theme={theme}
          onThemeChange={setTheme}
          onToggleSidebar={toggleSidebar}
          onOpenSplit={openSplit}
          onSingle={() => navigateViewer(exitSplitTarget)}
        />
      </nav>

      <header className="toolbar">
        <div className="toolbar-main">
          <div className="toolbar-left">
            {pagesAvailable && (
              <nav className="path-page-switcher" aria-label="Page navigation">
                <TooltipAction
                  label="Previous page"
                  icon={["ChevronLeftIcon"]}
                  onClick={() => goToPage(state.page - 1)}
                  className="path-page-action"
                />
                <label className="path-page-control">
                  <input
                    value={pageDraft}
                    type="number"
                    min={1}
                    max={state.total || undefined}
                    aria-label="Page number"
                    onChange={(event) => setPageDraft(event.target.value)}
                    onBlur={submitPage}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        submitPage();
                        event.currentTarget.blur();
                      }
                    }}
                  />
                  <span>/ {state.total || "–"}</span>
                </label>
                <TooltipAction
                  label="Next page"
                  icon={["ChevronRightIcon"]}
                  onClick={() => goToPage(state.page + 1)}
                  className="path-page-action"
                />
              </nav>
            )}
            <TooltipAction
              label="Refresh document"
              icon={["RefreshCwIcon", "RotateCwIcon"]}
              onClick={refreshDocument}
            />
            <span className="work-title" title={workTitle}>{workTitle}</span>
            {pagesAvailable && (
              <>
                <span className="identity-separator" aria-hidden="true">\</span>
                <ChapterPicker chapters={state.chapters} page={state.page} onSelect={goToPage} />
              </>
            )}
          </div>

          <div className="toolbar-right">
            <SplitViewPicker
              workspace={viewMode === "split"}
              onSplit={openSplit}
              onSingle={() => navigateViewer(exitSplitTarget)}
              onReset={(direction) => workspaceRef.current?.reset(direction)}
            />
            {viewMode === "split" && scopedFormat === "pdf" && (
              <TooltipAction
                label={
                  splitSyncScroll
                    ? "Disable synchronized scrolling"
                    : "Synchronize split scrolling"
                }
                icon={splitSyncScroll ? ["LinkIcon"] : ["UnlinkIcon", "LinkIcon"]}
                pressed={splitSyncScroll}
                onClick={() => {
                  const next = !splitSyncScroll;
                  setSplitSyncScroll(next);
                  localStorage.setItem("paper-viewer-sync-scroll", String(next));
                  if (next) sendToSplit("page", { page: state.page });
                }}
              />
            )}

          </div>
        </div>
      </header>

      <div className="viewer-body">
        {activityBarPosition === "top" && (
          <ActivityBar
            position="top"
            active={activityPanel}
            structureAvailable={structureAvailable}
            onSelect={selectActivityPanel}
            onMovePosition={setActivityBarPosition}
          />
        )}

        <div className="viewer-workbench">
          {activityBarPosition === "left" && (
            <ActivityBar
              position="left"
              active={activityPanel}
              structureAvailable={structureAvailable}
              onSelect={selectActivityPanel}
              onMovePosition={setActivityBarPosition}
            />
          )}

          {sidebarSide === "left" && activityPanel === "explorer" && (
            <RepoFilesPanel
              nodes={repoTree}
              error={repoTreeError}
              side="left"
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onOpenFile={openRepositoryFile}
            />
          )}

          <main className="viewer-main">
            {openRepoFile?.source ? (
              <div className="source-editor-shell">
                <div className="source-editor-header">
                  <AnimatedIcon names={["FileCode2Icon", "FileIcon"]} />
                  <span title={openRepoFile.path}>{openRepoFile.path}</span>
                  <TooltipAction
                    label="Close editor"
                    icon={["XIcon"]}
                    onClick={() => setOpenRepoFile(null)}
                    className="source-editor-close"
                  />
                </div>
                <SourceFileView
                  path={openRepoFile.source}
                  displayPath={openRepoFile.path}
                  theme={theme}
                />
              </div>
            ) : viewMode === "split" ? (
              workspacePanes.length >= 2 ? (
                <ReviewWorkspace
                  ref={workspaceRef}
                  panes={workspacePanes}
                  initialDirection={initialSplitDirection}
                  theme={theme}
                  refreshRevision={refreshRevision}
                  onActiveChange={setActiveWorkspacePane}
                />
              ) : (
                <div className="document-error">
                  <strong>Review workspace unavailable.</strong>
                  <span>Both View and Review outputs are required.</span>
                </div>
              )
            ) : mode === "raw" ? (
              <RawArtifactView path={renderArtifactPath} format={format} embedded={false} theme={theme} />
            ) : format === "pdf" ? (
              <PdfDocumentView
                ref={documentRef}
                pdfPath={renderArtifactPath}
                contentIndex={contentIndex}
                embedded={false}
                sidebarSide={sidebarSide}
                sidebarMode={sidebarMode}
                sidebarHidden={activityPanel !== "structure"}
                sidebarWidth={sidebarWidth}
                onMoveSidebar={moveSidebar}
                onToggleSidebarMode={toggleSidebarMode}
                onSidebarWidthChange={setSidebarWidth}
                onStateChange={handleDocumentState}
              />
            ) : (
              <CompiledArtifactView path={renderArtifactPath} format={format} embedded={false} theme={theme} />
            )}
          </main>

          {sidebarSide === "right" && activityPanel === "explorer" && (
            <RepoFilesPanel
              nodes={repoTree}
              error={repoTreeError}
              side="right"
              width={sidebarWidth}
              onWidthChange={setSidebarWidth}
              onOpenFile={openRepositoryFile}
            />
          )}

          {activityBarPosition === "right" && (
            <ActivityBar
              position="right"
              active={activityPanel}
              structureAvailable={structureAvailable}
              onSelect={selectActivityPanel}
              onMovePosition={setActivityBarPosition}
            />
          )}
        </div>

        {activityBarPosition === "bottom" && (
          <ActivityBar
            position="bottom"
            active={activityPanel}
            structureAvailable={structureAvailable}
            onSelect={selectActivityPanel}
            onMovePosition={setActivityBarPosition}
          />
        )}
      </div>

      <footer className="statusbar">
        <div className="status-left">
          {manifest ? (
            <LanguagePicker
              manifest={manifest}
              templateName={templateName}
              profileName={scopedProfile}
              mode={scopedMode}
              viewMode={viewMode}
              format={scopedFormat}
              versionTitle={scopedVersionTitle}
              onNavigate={navigateViewer}
              onSelectProfile={
                viewMode === "split"
                  ? (variant) => updateActiveWorkspacePane(scopedMode, scopedFormat, variant)
                  : undefined
              }
            />
          ) : (
            <span className="version-fallback">{languageShortId(scopedProfile)}</span>
          )}
          <span className="status-divider" aria-hidden="true" />
          <RendererPicker
            mode={scopedMode}
            viewerTarget={finalTarget}
            reviewHref={reviewTarget}
            rawHref={rawTarget}
            onNavigate={navigateViewer}
            onSelectMode={
              viewMode === "split"
                ? (nextMode) => updateActiveWorkspacePane(nextMode, scopedFormat, scopedVariant)
                : undefined
            }
          />
          <span className="status-divider" aria-hidden="true" />
          <FormatPicker
            format={scopedFormat}
            pdfHref={pdfTarget}
            markdownHref={markdownTarget}
            htmlHref={htmlTarget}
            onNavigate={navigateViewer}
            onSelectFormat={
              viewMode === "split"
                ? (nextFormat) => updateActiveWorkspacePane(scopedMode, nextFormat, scopedVariant)
                : undefined
            }
          />
        </div>

        <div className="status-center">
          {manifest?.commit && (
            <span className="build-revision" title={"Deployed commit " + manifest.commit}>
              {manifest.commit.slice(0, 7)}
            </span>
          )}
        </div>

        <div className="status-actions">
          {pagesAvailable && (
            <div className="status-group">
              <TooltipAction
                label="Zoom out"
                icon={["MinusIcon"]}
                onClick={() => zoomBy(-0.1)}
                className="status-action"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="zoom-value"
                    onClick={() => setZoom("fit")}
                  >
                    {state.scaleMode === "fit"
                      ? "Fit"
                      : Math.round(state.manualScale * 100) + "%"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Fit width</TooltipContent>
              </Tooltip>
              <TooltipAction
                label="Zoom in"
                icon={["PlusIcon"]}
                onClick={() => zoomBy(0.1)}
                className="status-action"
              />
              <span className="status-divider" aria-hidden="true" />
            </div>
          )}
          <TooltipAction
            label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            icon={fullscreen ? ["MinimizeIcon", "Minimize2Icon"] : ["MaximizeIcon", "Maximize2Icon"]}
            onClick={() => void toggleFullscreen()}
            className="status-action"
          />
        </div>
      </footer>
    </div>
  );
}
