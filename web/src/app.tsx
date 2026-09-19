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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  PdfDocumentView,
  type DocumentControl,
  type DocumentState,
  type ScaleMode,
  type SidebarMode,
  type SidebarSide,
} from "./pdf-document";

const DEFAULT_WORK_TITLE =
  "Agentické inženýrství a design harnessu pro automatizovaný softwarový vývoj";

type PublicationVariant = {
  profile: string;
  title: string;
  subtitle: string;
  final: string;
  review: string;
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
    stack?: string[];
  };
};

type ViewerMode = "final" | "review";
type ViewMode = "single" | "split";

function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    void fetch("variants.json", { cache: "no-store" })
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

function safePdfPath(value: string | null) {
  if (!value || !value.toLowerCase().endsWith(".pdf")) return null;
  if (value.includes("://") || value.startsWith("//") || value.startsWith("/")) return null;
  const parts = value.split("/").filter(Boolean);
  if (parts.some((part) => part === "..")) return null;
  return parts.join("/");
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
  if (args.view === "split") query.set("view", "split");
  if (args.embedded) query.set("embedded", "1");
  return "viewer.html?" + query.toString();
}

function childHref(args: {
  file: string;
  template: string;
  profile: string;
  title: string;
  mode: ViewerMode;
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
  className = "",
}: {
  label: string;
  icon: string | string[];
  onClick?: () => void;
  href?: string;
  download?: boolean;
  target?: string;
  pressed?: boolean;
  className?: string;
}) {
  const content = href ? (
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

function SidebarToggle({
  side,
  mode,
  hidden,
  onToggle,
  onMove,
  onToggleMode,
}: {
  side: SidebarSide;
  mode: SidebarMode;
  hidden: boolean;
  onToggle: () => void;
  onMove: () => void;
  onToggleMode: () => void;
}) {
  const toggleLabel = hidden ? "Show sidebar" : "Hide sidebar";
  const moveLabel = side === "left" ? "Move sidebar right" : "Move sidebar left";
  const modeLabel = mode === "minimap" ? "Convert to thumbnails" : "Convert to minimap";

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span className={"edge-toggle edge-" + side}>
          <TooltipAction
            label={toggleLabel}
            icon={side === "left" ? ["PanelLeftIcon"] : ["PanelRightIcon"]}
            onClick={onToggle}
            pressed={!hidden}
            className="edge-toggle-button"
          />
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onSelect={onMove}>
          <AnimatedIcon
            names={side === "left" ? ["PanelRightIcon"] : ["PanelLeftIcon"]}
            size={16}
          />
          {moveLabel}
        </ContextMenuItem>
        <ContextMenuItem onSelect={onToggleMode}>
          <AnimatedIcon
            names={mode === "minimap" ? ["ListIcon"] : ["MapIcon", "MapPinnedIcon"]}
            size={16}
          />
          {modeLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function VersionPicker({
  manifest,
  templateName,
  profileName,
  mode,
  viewMode,
  versionTitle,
}: {
  manifest: Manifest;
  templateName: string;
  profileName: string;
  mode: ViewerMode;
  viewMode: ViewMode;
  versionTitle: string;
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
                aria-label="Switch publication version"
              >
                <span className="version-title">{versionTitle}</span>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={16} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Switch publication version</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="version-menu">
        {manifest.variants.map((variant) => {
          const file = hrefFor(
            templateName,
            manifest.default_template,
            mode === "review" ? variant.review : variant.final,
          );
          const peer = hrefFor(
            templateName,
            manifest.default_template,
            mode === "review" ? variant.final : variant.review,
          );
          const href = viewerHref({
            file,
            peer,
            template: templateName,
            profile: variant.profile,
            title: variant.title,
            mode,
            view: viewMode,
          });
          const active = variant.profile === profileName;

          return (
            <DropdownMenuItem
              key={variant.profile}
              className={active ? "version-item active" : "version-item"}
              onSelect={() => {
                window.location.href = href;
              }}
            >
              <span className="version-option">
                <strong>{variant.title}</strong>
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

function ModePicker({
  mode,
  viewMode,
  finalHref,
  reviewHref,
  splitHref,
}: {
  mode: ViewerMode;
  viewMode: ViewMode;
  finalHref: string;
  reviewHref: string;
  splitHref: string;
}) {
  const label = viewMode === "split" ? "Split" : mode === "review" ? "Review" : "Final";

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="mode-trigger-wrap">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="mode-select"
                aria-label="Switch Final / Review"
              >
                <span>{label}</span>
                <AnimatedIcon names={["ChevronsUpDownIcon"]} size={14} />
              </Button>
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>Switch Final / Review</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="start" className="mode-menu">
        <DropdownMenuItem
          className={viewMode === "single" && mode === "final" ? "mode-item active" : "mode-item"}
          onSelect={() => {
            window.location.href = finalHref;
          }}
        >
          <span>Final</span>
          {viewMode === "single" && mode === "final" && (
            <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={viewMode === "single" && mode === "review" ? "mode-item active" : "mode-item"}
          onSelect={() => {
            window.location.href = reviewHref;
          }}
        >
          <span>Review</span>
          {viewMode === "single" && mode === "review" && (
            <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          className={viewMode === "split" ? "mode-item active" : "mode-item"}
          onSelect={() => {
            window.location.href = splitHref;
          }}
        >
          <span className="mode-option-label">
            <AnimatedIcon names={["Columns2Icon", "PanelLeftRightIcon"]} size={15} />
            Split
          </span>
          {viewMode === "split" && (
            <AnimatedIcon names={["CheckIcon", "CircleCheckIcon"]} size={15} />
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PublicationIndex() {
  const { manifest, error } = useManifest();

  useEffect(() => {
    document.documentElement.dataset.theme =
      localStorage.getItem("paper-viewer-theme") ||
      (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
  }, []);

  if (error) {
    return <div className="landing-state">Could not load publication manifest: {error}</div>;
  }
  if (!manifest) {
    return <div className="landing-state">Loading publication variants…</div>;
  }

  return (
    <main className="landing">
      <motion.header
        className="landing-header"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="eyebrow">DarkFactory-Paper</p>
        <h1>Odborná práce / Thesis</h1>
        <p>
          All variants are generated from one manuscript. Open the exact Typst PDF in the
          React viewer, compare Raw and Review side by side, or download the canonical PDF.
        </p>
      </motion.header>

      {manifest.templates.map((templateName) => (
        <section className="template-section" key={templateName}>
          <h2>
            {templateName}
            {templateName === manifest.default_template && <span>default</span>}
          </h2>
          <div className="publication-grid">
            {manifest.variants.map((variant, index) => {
              const finalFile = hrefFor(
                templateName,
                manifest.default_template,
                variant.final,
              );
              const reviewFile = hrefFor(
                templateName,
                manifest.default_template,
                variant.review,
              );
              return (
                <motion.article
                  className="publication-card"
                  key={variant.profile}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.035 }}
                >
                  <div className="publication-card-head">
                    <h3>{variant.title}</h3>
                    {variant.recommended && templateName === manifest.default_template && (
                      <span className="badge">recommended</span>
                    )}
                  </div>
                  <p>{variant.subtitle}</p>
                  <div className="publication-actions">
                    <Button asChild size="sm">
                      <a
                        href={viewerHref({
                          file: finalFile,
                          peer: reviewFile,
                          template: templateName,
                          profile: variant.profile,
                          title: variant.title,
                          mode: "final",
                        })}
                      >
                        Raw
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={viewerHref({
                          file: reviewFile,
                          peer: finalFile,
                          template: templateName,
                          profile: variant.profile,
                          title: variant.title,
                          mode: "review",
                        })}
                      >
                        Review
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <a
                        href={viewerHref({
                          file: finalFile,
                          peer: reviewFile,
                          template: templateName,
                          profile: variant.profile,
                          title: variant.title,
                          mode: "final",
                          view: "split",
                        })}
                      >
                        Split
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={finalFile} download>
                        PDF
                      </a>
                    </Button>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      ))}

      <footer className="landing-footer">
        Build {manifest.commit ? manifest.commit.slice(0, 12) : "local"}
        {manifest.viewer?.stack?.length ? " · " + manifest.viewer.stack.join(" · ") : ""}
      </footer>
    </main>
  );
}

export function ViewerApp() {
  const { manifest } = useManifest();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const pdfPath = safePdfPath(params.get("file"));
  const peerPath = safePdfPath(params.get("peer"));
  const mode: ViewerMode = params.get("mode") === "review" ? "review" : "final";
  const viewMode: ViewMode = params.get("view") === "split" ? "split" : "single";
  const embedded = params.get("embedded") === "1";
  const versionTitle = params.get("title") || "Školní česká verze";
  const templateName =
    params.get("template") || manifest?.default_template || "gjkt-odborna-prace";
  const profileName = params.get("profile") || "school";

  const rawPath = mode === "review" ? peerPath : pdfPath;
  const reviewPath = mode === "review" ? pdfPath : peerPath;

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
  const [sidebarHidden, setSidebarHidden] = useState(() => window.innerWidth <= 760);
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = localStorage.getItem("paper-viewer-theme");
    if (stored === "dark" || stored === "light") return stored;
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
  });
  const [pageDraft, setPageDraft] = useState("1");

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
        setTheme(data.theme === "light" ? "light" : "dark");
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
    if (embedded) return;
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
  }, [embedded, goToPage, setZoom, state.page, zoomBy]);

  if (!pdfPath) {
    return (
      <div className="document-error">
        <strong>Invalid document path.</strong>
        <span>The requested PDF is not available.</span>
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="embedded-viewer">
        <PdfDocumentView
          ref={documentRef}
          pdfPath={pdfPath}
          embedded
          sidebarSide={sidebarSide}
          sidebarMode={sidebarMode}
          sidebarHidden
          onMoveSidebar={moveSidebar}
          onToggleSidebarMode={toggleSidebarMode}
          onStateChange={handleDocumentState}
        />
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
          })
        : viewerHref({
            file: rawPath,
            peer: reviewPath,
            template: templateName,
            profile: profileName,
            title: versionTitle,
            mode: "final",
            view: "split",
          })
      : "#";

  const currentDownload = viewMode === "split" ? rawPath || pdfPath : pdfPath;
  const canSplit = Boolean(rawPath && reviewPath);

  const sidebarToggle = viewMode === "single" ? (
    <SidebarToggle
      side={sidebarSide}
      mode={sidebarMode}
      hidden={sidebarHidden}
      onToggle={() => setSidebarHidden((value) => !value)}
      onMove={moveSidebar}
      onToggleMode={toggleSidebarMode}
    />
  ) : null;

  const rawChild =
    rawPath &&
    childHref({
      file: rawPath,
      template: templateName,
      profile: profileName,
      title: versionTitle,
      mode: "final",
    });
  const reviewChild =
    reviewPath &&
    childHref({
      file: reviewPath,
      template: templateName,
      profile: profileName,
      title: versionTitle,
      mode: "review",
    });

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen?.();
    else await document.documentElement.requestFullscreen?.();
  };

  const toggleTheme = () => setTheme((value) => (value === "dark" ? "light" : "dark"));

  const submitPage = () => {
    const page = Number(pageDraft);
    if (Number.isFinite(page)) goToPage(page);
    else setPageDraft(String(state.page));
  };

  return (
    <div className="viewer-shell">
      <header className="toolbar">
        {sidebarSide === "left" && sidebarToggle}
        <div className="toolbar-main">
          <div className="toolbar-left">
            <TooltipAction label="Home" icon={["HomeIcon"]} href="./" />
            <span className="identity-separator" aria-hidden="true">\</span>
            <span className="work-title" title={workTitle}>{workTitle}</span>
            <span className="identity-separator" aria-hidden="true">\</span>
            {manifest ? (
              <VersionPicker
                manifest={manifest}
                templateName={templateName}
                profileName={profileName}
                mode={mode}
                viewMode={viewMode}
                versionTitle={versionTitle}
              />
            ) : (
              <span className="version-fallback">{versionTitle}</span>
            )}
            <span className="identity-separator" aria-hidden="true">\</span>
            <ModePicker
              mode={mode}
              viewMode={viewMode}
              finalHref={finalTarget}
              reviewHref={reviewTarget}
              splitHref={canSplit ? splitTarget : "#"}
            />
          </div>

          <div className="toolbar-right">
            <TooltipAction
              label="Refresh page"
              icon={["RefreshCwIcon", "RotateCwIcon"]}
              onClick={() => window.location.reload()}
            />
            <TooltipAction
              label={viewMode === "split" ? "Exit split view" : "Split view"}
              icon={["Columns2Icon", "PanelLeftRightIcon"]}
              href={canSplit ? splitTarget : undefined}
              pressed={viewMode === "split"}
            />
            {viewMode === "split" && (
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
              label="Download PDF"
              icon={["DownloadIcon"]}
              href={currentDownload || undefined}
              download
            />
            <TooltipAction
              label="Open native PDF"
              icon={["ExternalLinkIcon", "FileTextIcon"]}
              href={currentDownload || undefined}
              target="_blank"
            />
          </div>
        </div>
        {sidebarSide === "right" && sidebarToggle}
      </header>

      <main className="viewer-main">
        {viewMode === "split" ? (
          rawChild && reviewChild ? (
            <div className="split-view">
              <motion.section
                className="split-column"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="split-label">Raw</div>
                <iframe
                  ref={(node) => {
                    splitFrames.current[0] = node;
                  }}
                  title="Raw document"
                  src={rawChild}
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
                <div className="split-label">Review</div>
                <iframe
                  ref={(node) => {
                    splitFrames.current[1] = node;
                  }}
                  title="Review document"
                  src={reviewChild}
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
              <strong>Split view unavailable.</strong>
              <span>Both Raw and Review PDFs are required.</span>
            </div>
          )
        ) : (
          <PdfDocumentView
            ref={documentRef}
            pdfPath={pdfPath}
            embedded={false}
            sidebarSide={sidebarSide}
            sidebarMode={sidebarMode}
            sidebarHidden={sidebarHidden}
            onMoveSidebar={moveSidebar}
            onToggleSidebarMode={toggleSidebarMode}
            onStateChange={handleDocumentState}
          />
        )}
      </main>

      <footer className="statusbar">
        <div className="statusbar-spacer" aria-hidden="true" />

        <div className="status-center">
          <div className="status-group">
            <TooltipAction
              label="Previous page"
              icon={["ChevronLeftIcon"]}
              onClick={() => goToPage(state.page - 1)}
              className="status-action"
            />
            <label className="page-control">
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
              className="status-action"
            />
          </div>

          <span className="status-divider" />

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
          </div>
        </div>

        <div className="status-actions">
          <TooltipAction
            label={theme === "dark" ? "Use light theme" : "Use dark theme"}
            icon={theme === "dark" ? ["SunIcon"] : ["MoonIcon"]}
            onClick={toggleTheme}
            className="status-action"
          />
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
