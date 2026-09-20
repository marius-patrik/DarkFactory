import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { motion } from "motion/react";
import { AnimatedIcon } from "@/components/animated-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  type ScaleMode,
  type SidebarMode,
  type SidebarSide,
} from "./pdf-document";
import { CompiledArtifactView, RawArtifactView, type ArtifactFormat } from "./compiled-artifact";

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
    repository_url?: string;
    stack?: string[];
  };
};

type ViewerMode = "final" | "review" | "raw";
type ViewMode = "single" | "split";
type AppearanceMode = "light" | "dark" | "oled";
type ActivityPanel = "contents" | "pages" | "files" | null;
type ActiveActivityPanel = Exclude<ActivityPanel, null>;

type RepoTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
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

type CommandBinding = {
  id: string;
  key: string;
  primaryModifier?: boolean;
  enabled?: boolean;
  run: () => void;
};

function useCommand(binding: CommandBinding) {
  const { enabled = true, id, key, primaryModifier = false, run } = binding;

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
  }, [enabled, id, key, primaryModifier, run]);
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
        aria-pressed={pressed}
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
  side,
  active,
  contentsAvailable,
  pagesAvailable,
  onSelect,
  onMoveSide,
}: {
  side: SidebarSide;
  active: ActivityPanel;
  contentsAvailable: boolean;
  pagesAvailable: boolean;
  onSelect: (panel: ActivityPanel) => void;
  onMoveSide: () => void;
}) {
  const targetSide = side === "left" ? "right" : "left";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <aside className={"activitybar activitybar-" + side} aria-label="Viewer activity bar">
          <TooltipAction
            label="Contents"
            icon={["ListTreeIcon", "ListIcon"]}
            pressed={active === "contents"}
            disabled={!contentsAvailable}
            onClick={() => onSelect(active === "contents" ? null : "contents")}
            className="activity-action"
          />
          <TooltipAction
            label="Pages"
            icon={["FilesIcon"]}
            pressed={active === "pages"}
            disabled={!pagesAvailable}
            onClick={() => onSelect(active === "pages" ? null : "pages")}
            className="activity-action"
          />
          <TooltipAction
            label="Files"
            icon={["FolderTreeIcon", "FolderIcon"]}
            pressed={active === "files"}
            onClick={() => onSelect(active === "files" ? null : "files")}
            className="activity-action"
          />
        </aside>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onMoveSide}>
          <AnimatedIcon
            names={targetSide === "left" ? ["PanelLeftIcon"] : ["PanelRightIcon"]}
            size={16}
          />
          Move Activity Bar {targetSide === "left" ? "Left" : "Right"}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ContentsPanel({
  chapters,
  page,
  side,
  onSelect,
}: {
  chapters: DocumentChapter[];
  page: number;
  side: SidebarSide;
  onSelect: (page: number) => void;
}) {
  const active =
    [...chapters].reverse().find((chapter) => chapter.page <= page) || chapters[0] || null;

  return (
    <aside className={"contents-panel contents-" + side} aria-label="Document contents">
      <div className="activity-panel-header">
        <AnimatedIcon names={["ListTreeIcon", "ListIcon"]} size={15} />
        <span>Contents</span>
      </div>
      <nav className="contents-tree" aria-label="Document outline">
        {chapters.length ? (
          chapters.map((chapter, index) => (
            <button
              key={chapter.title + "-" + chapter.page + "-" + index}
              type="button"
              className={active === chapter ? "contents-item active" : "contents-item"}
              style={{ paddingLeft: 10 + Math.max(0, chapter.level - 1) * 13 }}
              onClick={() => onSelect(chapter.page)}
              title={chapter.title}
            >
              <span>{chapter.title}</span>
              <small>{chapter.page}</small>
            </button>
          ))
        ) : (
          <div className="activity-panel-empty">Loading contents…</div>
        )}
      </nav>
    </aside>
  );
}
function RepoTreeBranch({
  nodes,
  depth,
  repositoryUrl,
  commit,
}: {
  nodes: RepoTreeNode[];
  depth: number;
  repositoryUrl: string;
  commit: string;
}) {
  return (
    <div className="repo-tree-level" data-depth={depth}>
      {nodes.map((node) =>
        node.type === "directory" ? (
          <details key={node.path} className="repo-tree-directory" open={depth === 0}>
            <summary>
              <AnimatedIcon names={["FolderIcon"]} size={15} />
              <span>{node.name}</span>
            </summary>
            <RepoTreeBranch
              nodes={node.children || []}
              depth={depth + 1}
              repositoryUrl={repositoryUrl}
              commit={commit}
            />
          </details>
        ) : (
          <a
            key={node.path}
            className="repo-tree-file"
            href={
              repositoryUrl.replace(/\/$/, "") +
              "/blob/" +
              (commit || "main") +
              "/" +
              node.path.split("/").map(encodeURIComponent).join("/")
            }
            target="_blank"
            rel="noopener noreferrer"
            title={node.path}
          >
            <AnimatedIcon names={["FileIcon", "FileTextIcon"]} size={14} />
            <span>{node.name}</span>
          </a>
        ),
      )}
    </div>
  );
}

function RepoFilesPanel({
  nodes,
  error,
  side,
  repositoryUrl,
  commit,
}: {
  nodes: RepoTreeNode[];
  error: string;
  side: SidebarSide;
  repositoryUrl: string;
  commit: string;
}) {
  return (
    <aside className={"repo-files-panel repo-files-" + side} aria-label="Repository files">
      <div className="activity-panel-header">
        <AnimatedIcon names={["FolderTreeIcon", "FolderIcon"]} size={16} />
        <span>Files</span>
      </div>
      <div className="repo-files-tree">
        {error ? (
          <div className="repo-files-error">{error}</div>
        ) : nodes.length ? (
          <RepoTreeBranch
            nodes={nodes}
            depth={0}
            repositoryUrl={repositoryUrl}
            commit={commit}
          />
        ) : (
          <div className="repo-files-loading">Loading repository tree…</div>
        )}
      </div>
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
}: {
  manifest: Manifest;
  templateName: string;
  profileName: string;
  mode: ViewerMode;
  viewMode: ViewMode;
  format: ArtifactFormat;
  versionTitle: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="version-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="version-select"
                aria-label="Language"
              >
                <AnimatedIcon names={["LanguagesIcon"]} size={16} />
                <span className="status-select-copy">\n                  <strong>{languageDisplayName(versionTitle)}</strong>\n                  <small>{profileName}</small>\n                </span>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={16} />
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
              onSelect={() => onNavigate(href)}
            >
              <AnimatedIcon names={["LanguagesIcon"]} size={16} />
              <span className="version-option">
                <strong>{languageDisplayName(variant.title)}</strong>
                <small>{variant.profile}</small>
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
  viewerHref,
  editHref,
  rawHref,
  onNavigate,
}: {
  mode: ViewerMode;
  viewerHref: string;
  editHref: string;
  rawHref: string;
  onNavigate: (href: string) => void;
}) {
  const options: Array<{
    mode: ViewerMode;
    label: string;
    href: string;
    icon: string[];
  }> = [
    { mode: "final", label: "View", href: viewerHref, icon: ["EyeIcon"] },
    { mode: "review", label: "Edit", href: editHref, icon: ["PencilLineIcon"] },
    { mode: "raw", label: "Raw", href: rawHref, icon: ["BracesIcon", "FileCode2Icon"] },
  ];

  return (
    <div className="renderer-picker" role="group" aria-label="Renderer">
      {options.map((option) => (
        <Tooltip key={option.mode}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className={mode === option.mode ? "renderer-option active" : "renderer-option"}
              aria-label={"Renderer: " + option.label}
              aria-pressed={mode === option.mode}
              onClick={() => onNavigate(option.href)}
            >
              <AnimatedIcon names={option.icon} size={13} />
              <span>{option.label}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Renderer</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
function FormatPicker({
  format,
  pdfHref,
  markdownHref,
  htmlHref,
  onNavigate,
}: {
  format: ArtifactFormat;
  pdfHref: string;
  markdownHref: string;
  htmlHref: string;
  onNavigate: (href: string) => void;
}) {
  const options: Array<{
    format: ArtifactFormat;
    label: string;
    href: string;
    icon: string[];
    extension: string;
  }> = [
    { format: "pdf", label: "PDF", extension: ".pdf", href: pdfHref, icon: ["FileTextIcon"] },
    { format: "markdown", label: "Markdown", extension: ".md", href: markdownHref, icon: ["FileCode2Icon"] },
    { format: "html", label: "HTML", extension: ".html", href: htmlHref, icon: ["Code2Icon"] },
  ];

  const active = options.find((option) => option.format === format) || options[0];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="format-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="format-select"
                aria-label="File type"
              >
                <AnimatedIcon names={active.icon} size={14} />
                <span className="status-select-copy">
                  <strong>{active.label}</strong>
                  <small>{active.extension}</small>
                </span>
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
            onSelect={() => onNavigate(option.href)}
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

function AppearancePicker({
  theme,
  onChange,
}: {
  theme: AppearanceMode;
  onChange: (theme: AppearanceMode) => void;
}) {
  const options: Array<{
    theme: AppearanceMode;
    label: string;
    icon: string[];
  }> = [
    { theme: "light", label: "Light", icon: ["SunIcon"] },
    { theme: "dark", label: "Dark", icon: ["MoonIcon"] },
    { theme: "oled", label: "OLED", icon: ["CircleIcon"] },
  ];
  const active = options.find((option) => option.theme === theme) || options[1];

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="appearance-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="icon-action status-action appearance-select"
                aria-label={"Appearance: " + active.label}
              >
                <AnimatedIcon names={active.icon} size={18} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Appearance: {active.label}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="appearance-menu">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.theme}
            className={theme === option.theme ? "appearance-item active" : "appearance-item"}
            onSelect={() => onChange(option.theme)}
          >
            <span className="mode-option-label">
              <AnimatedIcon names={option.icon} size={16} />
              {option.label}
            </span>
            {theme === option.theme && (
              <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ViewerApp() {
  const { manifest } = useManifest();
  const [routeRevision, setRouteRevision] = useState(0);
  const params = useMemo(() => new URLSearchParams(window.location.search), [routeRevision]);
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
  const splitFrames = useRef<Array<HTMLIFrameElement | null>>([null, null]);
  const suppressEmbeddedState = useRef(false);

  const [sidebarSide, setSidebarSideState] = useState<SidebarSide>(() =>
    localStorage.getItem("paper-viewer-sidebar-side") === "right" ? "right" : "left",
  );
  const [sidebarMode, setSidebarModeState] = useState<SidebarMode>(() =>
    localStorage.getItem("paper-viewer-sidebar-mode") === "minimap"
      ? "minimap"
      : "thumbnails",
  );
  const [activityPanel, setActivityPanel] = useState<ActivityPanel>(
    () => (window.innerWidth <= 760 ? null : "contents"),
  );
  const lastActivityPanel = useRef<ActiveActivityPanel>("contents");
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
  const repositoryUrl =
    manifest?.viewer?.repository_url || "https://github.com/marius-patrik/DarkFactory-Paper";
  const { nodes: repoTree, error: repoTreeError } = useRepoTree(repoTreePath);
  const pagesAvailable = viewMode === "single" && mode !== "raw" && format === "pdf";
  const contentsAvailable = pagesAvailable;

  const selectActivityPanel = useCallback((panel: ActivityPanel) => {
    if (panel) lastActivityPanel.current = panel;
    setActivityPanel(panel);
  }, []);

  const toggleSidebar = useCallback(() => {
    setActivityPanel((current) => {
      if (current) {
        lastActivityPanel.current = current;
        return null;
      }

      const preferred = lastActivityPanel.current;
      if (preferred === "files") return "files";
      if (preferred === "contents" && contentsAvailable) return "contents";
      if (preferred === "pages" && pagesAvailable) return "pages";
      if (contentsAvailable) return "contents";
      if (pagesAvailable) return "pages";
      return "files";
    });
  }, [contentsAvailable, pagesAvailable]);

  useCommand({
    id: "toggle-sidebar",
    key: "b",
    primaryModifier: true,
    enabled: viewMode === "single" && !embedded,
    run: toggleSidebar,
  });

  useEffect(() => {
    if (
      (activityPanel === "pages" && !pagesAvailable) ||
      (activityPanel === "contents" && !contentsAvailable)
    ) {
      setActivityPanel(null);
    }
  }, [activityPanel, contentsAvailable, pagesAvailable]);

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

  const setSidebarMode = useCallback((next: SidebarMode) => {
    setSidebarModeState(next);
    localStorage.setItem("paper-viewer-sidebar-mode", next);
  }, []);

  const moveSidebar = useCallback(() => {
    setSidebarSide(sidebarSide === "left" ? "right" : "left");
  }, [setSidebarSide, sidebarSide]);

  const toggleSidebarMode = useCallback(() => {
    setSidebarMode(sidebarMode === "minimap" ? "thumbnails" : "minimap");
  }, [setSidebarMode, sidebarMode]);

  const sendToSplit = useCallback(
    (
      command: string,
      payload: Record<string, unknown> = {},
      except: MessageEventSource | null = null,
    ) => {
      for (const frame of splitFrames.current) {
        if (!frame?.contentWindow || frame.contentWindow === except) continue;
        frame.contentWindow.postMessage(
          { source: "paper-split", command, ...payload },
          "*",
        );
      }
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
        sendToSplit("page", { page: target });
      } else {
        documentRef.current?.goToPage(page);
      }
    },
    [embedded, sendToSplit, state.total, viewMode],
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
        sendToSplit("zoom", { mode: scaleMode, scale: nextScale });
      } else {
        documentRef.current?.setZoom(scaleMode, scale);
      }
    },
    [embedded, sendToSplit, state.manualScale, viewMode],
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
      const sourceIsChild = splitFrames.current.some(
        (frame) => frame?.contentWindow === event.source,
      );
      const data = event.data;
      if (!sourceIsChild || !data || data.source !== "paper-viewer" || data.kind !== "state") {
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
            embedded
            sidebarSide={sidebarSide}
            sidebarMode={sidebarMode}
            sidebarHidden
            onMoveSidebar={moveSidebar}
            onToggleSidebarMode={toggleSidebarMode}
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

  const splitTarget =
    rawPath && reviewPath
      ? viewMode === "split"
        ? viewerHref({
            file: rawPath,
            peer: reviewPath,
            template: templateName,
            profile: profileName,
            title: versionTitle,
            mode: "final",
            format,
          })
        : viewerHref({
            file: rawPath,
            peer: reviewPath,
            template: templateName,
            profile: profileName,
            title: versionTitle,
            mode: "final",
            format,
            view: "split",
          })
      : "#";

  const currentDownload = viewMode === "split" ? rawPath || artifactPath : artifactPath;
  const canSplit = Boolean(rawPath && reviewPath);
  const formatLabel = format === "markdown" ? "Markdown" : format.toUpperCase();

  const selectedVariant = manifest?.variants.find((variant) => variant.profile === profileName);
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
    const targetMode: ViewerMode = viewMode === "split" ? "final" : mode;
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
      view: viewMode,
    });
  };
  const pdfTarget = formatTarget("pdf");
  const markdownTarget = formatTarget("markdown");
  const htmlTarget = formatTarget("html");

  const rawChild =
    rawPath &&
    childHref({
      file: rawPath,
      template: templateName,
      profile: profileName,
      title: versionTitle,
      mode: "final",
      format,
    });
  const reviewChild =
    reviewPath &&
    childHref({
      file: reviewPath,
      template: templateName,
      profile: profileName,
      title: versionTitle,
      mode: "review",
      format,
    });
  const refreshedRawChild = rawChild ? withRefreshToken(rawChild, refreshRevision) : null;
  const refreshedReviewChild = reviewChild ? withRefreshToken(reviewChild, refreshRevision) : null;

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
    <div className="viewer-shell">
      <header className="toolbar">
        <div className="toolbar-main">
          <div className="toolbar-left">
            {pagesAvailable && (
              <div className="path-page-switcher" aria-label="Page navigation">
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
              </div>
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
            <TooltipAction
              label={viewMode === "split" ? "Exit Review" : "Review"}
              icon={["PanelLeftRightIcon"]}
              onClick={canSplit ? () => navigateViewer(splitTarget) : undefined}
              pressed={viewMode === "split"}
            />
            {viewMode === "split" && format === "pdf" && (
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
            <TooltipAction
              label={"Download " + formatLabel}
              icon={["DownloadIcon"]}
              href={currentDownload || undefined}
              download
            />
            <TooltipAction
              label={format === "pdf" ? "Open native PDF" : "Open rendered " + formatLabel}
              icon={["ExternalLinkIcon", "FileTextIcon"]}
              href={currentDownload || undefined}
              target="_blank"
            />
          </div>
        </div>
      </header>

      <div className={"viewer-workbench activity-" + sidebarSide}>
        {viewMode === "single" && sidebarSide === "left" && (
          <ActivityBar
            side="left"
            active={activityPanel}
            contentsAvailable={contentsAvailable}
            pagesAvailable={pagesAvailable}
            onSelect={selectActivityPanel}
            onMoveSide={moveSidebar}
          />
        )}
        {viewMode === "single" && sidebarSide === "left" && activityPanel === "contents" && (
          <ContentsPanel
            chapters={state.chapters}
            page={state.page}
            side="left"
            onSelect={goToPage}
          />
        )}
        {viewMode === "single" && sidebarSide === "left" && activityPanel === "files" && (
          <RepoFilesPanel
            nodes={repoTree}
            error={repoTreeError}
            side="left"
            repositoryUrl={repositoryUrl}
            commit={manifest?.commit || ""}
          />
        )}
        <main className="viewer-main">
        {viewMode === "split" ? (
          rawChild && reviewChild ? (
            <div className="split-view">
              <motion.section
                className="split-column"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="split-label">Viewer</div>
                <iframe
                  ref={(node) => {
                    splitFrames.current[0] = node;
                  }}
                  title="Viewer document"
                  src={refreshedRawChild || rawChild}
                  onLoad={(event) => {
                    event.currentTarget.contentWindow?.postMessage(
                      { source: "paper-split", command: "theme", theme },
                      "*",
                    );
                  }}
                />
              </motion.section>
              <motion.section
                className="split-column"
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="split-label">Edit</div>
                <iframe
                  ref={(node) => {
                    splitFrames.current[1] = node;
                  }}
                  title="Edit document"
                  src={refreshedReviewChild || reviewChild}
                  onLoad={(event) => {
                    event.currentTarget.contentWindow?.postMessage(
                      { source: "paper-split", command: "theme", theme },
                      "*",
                    );
                  }}
                />
              </motion.section>
            </div>
          ) : (
            <div className="document-error">
              <strong>Review comparison unavailable.</strong>
              <span>Both Viewer and Edit {formatLabel} outputs are required.</span>
            </div>
          )
        ) : mode === "raw" ? (
          <RawArtifactView path={renderArtifactPath} format={format} embedded={false} theme={theme} />
        ) : format === "pdf" ? (
          <PdfDocumentView
            ref={documentRef}
            pdfPath={renderArtifactPath}
            embedded={false}
            sidebarSide={sidebarSide}
            sidebarMode={sidebarMode}
            sidebarHidden={activityPanel !== "pages"}
            onMoveSidebar={moveSidebar}
            onToggleSidebarMode={toggleSidebarMode}
            onStateChange={handleDocumentState}
          />
        ) : (
          <CompiledArtifactView path={renderArtifactPath} format={format} embedded={false} theme={theme} />
        )}
        </main>
        {viewMode === "single" && sidebarSide === "right" && activityPanel === "contents" && (
          <ContentsPanel
            chapters={state.chapters}
            page={state.page}
            side="right"
            onSelect={goToPage}
          />
        )}
        {viewMode === "single" && sidebarSide === "right" && activityPanel === "files" && (
          <RepoFilesPanel
            nodes={repoTree}
            error={repoTreeError}
            side="right"
            repositoryUrl={repositoryUrl}
            commit={manifest?.commit || ""}
          />
        )}
        {viewMode === "single" && sidebarSide === "right" && (
          <ActivityBar
            side="right"
            active={activityPanel}
            contentsAvailable={contentsAvailable}
            pagesAvailable={pagesAvailable}
            onSelect={selectActivityPanel}
            onMoveSide={moveSidebar}
          />
        )}
      </div>

      <footer className="statusbar">
        <div className="status-left">
          {manifest ? (
            <LanguagePicker
              manifest={manifest}
              templateName={templateName}
              profileName={profileName}
              mode={mode}
              viewMode={viewMode}
              format={format}
              versionTitle={versionTitle}
              onNavigate={navigateViewer}
            />
          ) : (
            <span className="version-fallback">{languageDisplayName(versionTitle)}</span>
          )}
          <span className="status-divider" aria-hidden="true" />
          <RendererPicker
            mode={mode}
            viewerHref={finalTarget}
            editHref={reviewTarget}
            rawHref={rawTarget}
            onNavigate={navigateViewer}
          />
          <span className="status-divider" aria-hidden="true" />
          <FormatPicker
            format={format}
            pdfHref={pdfTarget}
            markdownHref={markdownTarget}
            htmlHref={htmlTarget}
            onNavigate={navigateViewer}
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
              <TooltipAction
                label="Fit width"
                icon={["ScanIcon", "Maximize2Icon"]}
                onClick={() => setZoom("fit")}
                className="status-action"
              />
              <span className="status-divider" aria-hidden="true" />
            </div>
          )}
          <AppearancePicker theme={theme} onChange={(nextTheme) => setTheme(nextTheme)} />
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
