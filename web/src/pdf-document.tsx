import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";
import { EventBus, PDFLinkService } from "pdfjs-dist/web/pdf_viewer.mjs";
import * as dagre from "@dagrejs/dagre";
import { motion } from "motion/react";
import { AnimatedIcon } from "@/components/animated-icon";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export type ScaleMode = "fit" | "manual";
export type SidebarSide = "left" | "right";
export type SidebarMode = "thumbnails" | "minimap";

export type DocumentState = {
  page: number;
  total: number;
  scaleMode: ScaleMode;
  manualScale: number;
  scrollRatio: number;
};

export type DocumentControl = {
  goToPage: (page: number, behavior?: ScrollBehavior) => void;
  zoomBy: (delta: number) => void;
  setZoom: (mode: ScaleMode, scale?: number) => void;
  applyScrollRatio: (ratio: number) => void;
};

type PageInfo = {
  number: number;
  baseWidth: number;
  baseHeight: number;
};

type ViewerProps = {
  pdfPath: string;
  embedded: boolean;
  sidebarSide: SidebarSide;
  sidebarMode: SidebarMode;
  sidebarHidden: boolean;
  onMoveSidebar: () => void;
  onToggleSidebarMode: () => void;
  onStateChange: (state: DocumentState) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function Minimap({
  pages,
  activePage,
  onSelect,
}: {
  pages: PageInfo[];
  activePage: number;
  onSelect: (page: number) => void;
}) {
  const layout = useMemo(() => {
    const graph = new dagre.graphlib.Graph()
      .setGraph({
        rankdir: "TB",
        ranksep: 6,
        nodesep: 0,
        marginx: 4,
        marginy: 5,
      })
      .setDefaultEdgeLabel(() => ({}));

    for (const page of pages) {
      const width = 48;
      const height = clamp((page.baseHeight / page.baseWidth) * width, 52, 74);
      graph.setNode(String(page.number), { width, height });
      if (page.number > 1) {
        graph.setEdge(String(page.number - 1), String(page.number));
      }
    }

    dagre.layout(graph);
    const graphMeta = graph.graph();
    return {
      height: Number(graphMeta.height || 0),
      nodes: pages.map((page) => {
        const node = graph.node(String(page.number));
        return {
          page: page.number,
          left: Number(node.x) - Number(node.width) / 2,
          top: Number(node.y) - Number(node.height) / 2,
          width: Number(node.width),
          height: Number(node.height),
        };
      }),
    };
  }, [pages]);

  return (
    <div className="minimap-track" style={{ height: Math.max(layout.height, 1) }}>
      {layout.nodes.map((node) => (
        <button
          key={node.page}
          type="button"
          className={"minimap-page" + (node.page === activePage ? " active" : "")}
          style={{
            left: node.left,
            top: node.top,
            width: node.width,
            height: node.height,
          }}
          aria-label={"Go to page " + node.page}
          onClick={() => onSelect(node.page)}
        >
          <span>{node.page}</span>
        </button>
      ))}
    </div>
  );
}

const Thumbnail = memo(function Thumbnail({
  pdf,
  page,
  active,
  onSelect,
}: {
  pdf: any;
  page: PageInfo;
  active: boolean;
  onSelect: (page: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let disposed = false;
    let renderTask: any = null;

    void (async () => {
      try {
        const proxy = await pdf.getPage(page.number);
        if (disposed || !canvasRef.current) return;
        const base = proxy.getViewport({ scale: 1 });
        const cssScale = 128 / base.width;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
        const viewport = proxy.getViewport({ scale: cssScale * pixelRatio });
        const canvas = canvasRef.current;
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        renderTask = proxy.render({
          canvasContext: canvas.getContext("2d", { alpha: false }),
          viewport,
          intent: "display",
        });
        await renderTask.promise;
      } catch (error) {
        if (!disposed) console.warn("thumbnail render failed", page.number, error);
      }
    })();

    return () => {
      disposed = true;
      renderTask?.cancel?.();
    };
  }, [pdf, page.number]);

  return (
    <button
      type="button"
      data-page={page.number}
      className={"thumb" + (active ? " active" : "")}
      onClick={() => onSelect(page.number)}
      aria-label={"Go to page " + page.number}
    >
      <span className="thumb-number">{page.number}</span>
      <span className="thumb-canvas-wrap">
        <canvas ref={canvasRef} />
      </span>
    </button>
  );
});

function SidebarPanel({
  pdf,
  pages,
  activePage,
  side,
  mode,
  hidden,
  onSelect,
  onMove,
  onToggleMode,
}: {
  pdf: any;
  pages: PageInfo[];
  activePage: number;
  side: SidebarSide;
  mode: SidebarMode;
  hidden: boolean;
  onSelect: (page: number) => void;
  onMove: () => void;
  onToggleMode: () => void;
}) {
  const moveLabel = side === "left" ? "Move sidebar right" : "Move sidebar left";
  const modeLabel = mode === "minimap" ? "Convert to thumbnails" : "Convert to minimap";
  const width = hidden ? 0 : mode === "minimap" ? 78 : 190;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <motion.aside
          className={"sidebar sidebar-" + side + " sidebar-" + mode}
          aria-label="Page navigation"
          initial={false}
          animate={{ width, opacity: hidden ? 0 : 1 }}
          transition={{ type: "spring", stiffness: 480, damping: 42 }}
          style={{ pointerEvents: hidden ? "none" : "auto" }}
        >
          {mode === "minimap" ? (
            <Minimap pages={pages} activePage={activePage} onSelect={onSelect} />
          ) : (
            <div className="thumbnail-list">
              {pages.map((page) => (
                <Thumbnail
                  key={page.number}
                  pdf={pdf}
                  page={page}
                  active={page.number === activePage}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )}
        </motion.aside>
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

const PdfPage = memo(function PdfPage({
  pdf,
  info,
  scale,
  linkService,
  stageRef,
  register,
}: {
  pdf: any;
  info: PageInfo;
  scale: number;
  linkService: any;
  stageRef: RefObject<HTMLElement | null>;
  register: (page: number, node: HTMLElement | null) => void;
}) {
  const shellRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const annotationLayerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    const shell = shellRef.current;
    const root = stageRef.current;
    if (!shell || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible(true);
      },
      { root, rootMargin: "1000px 0px", threshold: 0.01 },
    );
    observer.observe(shell);
    return () => observer.disconnect();
  }, [stageRef]);

  useEffect(() => {
    register(info.number, shellRef.current);
    return () => register(info.number, null);
  }, [info.number, register]);

  useEffect(() => {
    if (!visible || !canvasRef.current || !textLayerRef.current || !annotationLayerRef.current) {
      return;
    }

    let disposed = false;
    let renderTask: any = null;
    setRendered(false);

    void (async () => {
      try {
        const page = await pdf.getPage(info.number);
        if (disposed || !canvasRef.current || !textLayerRef.current || !annotationLayerRef.current) {
          return;
        }

        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const renderViewport = page.getViewport({ scale: scale * pixelRatio });
        const cssViewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        canvas.width = Math.ceil(renderViewport.width);
        canvas.height = Math.ceil(renderViewport.height);
        canvas.style.width = Math.ceil(cssViewport.width) + "px";
        canvas.style.height = Math.ceil(cssViewport.height) + "px";

        renderTask = page.render({
          canvasContext: canvas.getContext("2d", { alpha: false }),
          viewport: renderViewport,
          intent: "display",
        });
        await renderTask.promise;
        if (disposed) return;

        const textLayerNode = textLayerRef.current;
        const annotationLayerNode = annotationLayerRef.current;
        textLayerNode.replaceChildren();
        annotationLayerNode.replaceChildren();
        textLayerNode.style.setProperty("--total-scale-factor", String(cssViewport.scale));
        textLayerNode.style.setProperty("--scale-factor", String(cssViewport.scale));

        try {
          const textContent = await page.getTextContent();
          if (!disposed) {
            const textLayer = new (pdfjsLib as any).TextLayer({
              textContentSource: textContent,
              container: textLayerNode,
              viewport: cssViewport,
            });
            await textLayer.render();
          }
        } catch (error) {
          if (!disposed) console.warn("text layer failed", info.number, error);
        }

        try {
          const annotations = await page.getAnnotations({ intent: "display" });
          if (!disposed && annotations.length > 0 && linkService) {
            const annotationViewport = cssViewport.clone({ dontFlip: true });
            const annotationLayer = new (pdfjsLib as any).AnnotationLayer({
              div: annotationLayerNode,
              accessibilityManager: null,
              annotationCanvasMap: null,
              page,
              viewport: annotationViewport,
            });
            await annotationLayer.render({
              annotations,
              viewport: annotationViewport,
              page,
              linkService,
              downloadManager: null,
              renderForms: false,
              annotationStorage: pdf.annotationStorage,
            });
          }
        } catch (error) {
          if (!disposed) console.warn("annotation layer failed", info.number, error);
        }

        if (!disposed) setRendered(true);
      } catch (error) {
        if (!disposed) console.error("page render failed", info.number, error);
      }
    })();

    return () => {
      disposed = true;
      renderTask?.cancel?.();
    };
  }, [info.number, linkService, pdf, scale, visible]);

  return (
    <section
      ref={shellRef}
      data-page={info.number}
      className="page-shell"
      aria-label={"Page " + info.number}
      style={{
        width: Math.round(info.baseWidth * scale),
        height: Math.round(info.baseHeight * scale),
      }}
    >
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="textLayer" />
      <div ref={annotationLayerRef} className="annotationLayer" />
      {!rendered && <div className="page-loading">Page {info.number}</div>}
    </section>
  );
});

export const PdfDocumentView = forwardRef<DocumentControl, ViewerProps>(
  function PdfDocumentView(
    {
      pdfPath,
      embedded,
      sidebarSide,
      sidebarMode,
      sidebarHidden,
      onMoveSidebar,
      onToggleSidebarMode,
      onStateChange,
    },
    ref,
  ) {
    const [pdf, setPdf] = useState<any>(null);
    const [pages, setPages] = useState<PageInfo[]>([]);
    const [error, setError] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [scaleMode, setScaleMode] = useState<ScaleMode>("fit");
    const [manualScale, setManualScale] = useState(1.15);
    const [stageWidth, setStageWidth] = useState(900);
    const [scrollRatio, setScrollRatio] = useState(0);
    const [linkService, setLinkService] = useState<any>(null);
    const stageRef = useRef<HTMLElement>(null);
    const pageRefs = useRef(new Map<number, HTMLElement>());
    const scrollFrame = useRef(0);
    const pinch = useRef({ distance: 0, scale: 1 });

    const registerPage = useCallback((page: number, node: HTMLElement | null) => {
      if (node) pageRefs.current.set(page, node);
      else pageRefs.current.delete(page);
    }, []);

    const maxPageWidth = useMemo(
      () => Math.max(595, ...pages.map((page) => page.baseWidth)),
      [pages],
    );
    const fitScale = useMemo(
      () => clamp((stageWidth - (embedded ? 34 : 64)) / maxPageWidth, 0.45, 2.5),
      [embedded, maxPageWidth, stageWidth],
    );
    const effectiveScale = scaleMode === "fit" ? fitScale : manualScale;

    const goToPage = useCallback(
      (page: number, behavior: ScrollBehavior = "smooth") => {
        if (!pages.length) return;
        const target = clamp(Math.round(Number(page) || 1), 1, pages.length);
        pageRefs.current.get(target)?.scrollIntoView({ block: "start", behavior });
      },
      [pages.length],
    );

    const zoomBy = useCallback(
      (delta: number) => {
        const base = scaleMode === "fit" ? fitScale : manualScale;
        setManualScale(clamp(base + delta, 0.45, 2.5));
        setScaleMode("manual");
      },
      [fitScale, manualScale, scaleMode],
    );

    const setZoom = useCallback(
      (mode: ScaleMode, scale?: number) => {
        if (mode === "fit") {
          setScaleMode("fit");
          return;
        }
        setManualScale(clamp(Number(scale) || manualScale, 0.45, 2.5));
        setScaleMode("manual");
      },
      [manualScale],
    );

    const applyScrollRatio = useCallback((ratio: number) => {
      const stage = stageRef.current;
      if (!stage) return;
      const max = stage.scrollHeight - stage.clientHeight;
      stage.scrollTop = clamp(Number(ratio) || 0, 0, 1) * Math.max(0, max);
    }, []);

    useImperativeHandle(
      ref,
      () => ({ goToPage, zoomBy, setZoom, applyScrollRatio }),
      [applyScrollRatio, goToPage, setZoom, zoomBy],
    );

    useEffect(() => {
      let disposed = false;
      const task = pdfjsLib.getDocument({ url: pdfPath });
      setError("");
      setPdf(null);
      setPages([]);

      void task.promise
        .then(async (document) => {
          if (disposed) return;
          const nextPages: PageInfo[] = [];
          for (let number = 1; number <= document.numPages; number += 1) {
            const page = await document.getPage(number);
            const viewport = page.getViewport({ scale: 1 });
            nextPages.push({
              number,
              baseWidth: viewport.width,
              baseHeight: viewport.height,
            });
          }
          if (disposed) return;
          setPdf(document);
          setPages(nextPages);
        })
        .catch((reason) => {
          if (!disposed) setError(String(reason?.message || reason));
        });

      return () => {
        disposed = true;
        void task.destroy();
      };
    }, [pdfPath]);

    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width) setStageWidth(width);
      });
      observer.observe(stage);
      setStageWidth(stage.clientWidth || 900);
      return () => observer.disconnect();
    }, []);

    useEffect(() => {
      if (!pdf) return;
      const eventBus = new EventBus();
      const service = new PDFLinkService({
        eventBus,
        externalLinkTarget: 2,
        externalLinkRel: "noopener noreferrer",
      } as any);
      service.setDocument(pdf);
      (service as any).setViewer({
        get currentPageNumber() {
          return currentPage;
        },
        set currentPageNumber(value: number) {
          goToPage(value);
        },
        get pagesCount() {
          return pdf.numPages;
        },
        get isInPresentationMode() {
          return false;
        },
        scrollPageIntoView({ pageNumber }: { pageNumber: number }) {
          goToPage(pageNumber);
        },
      });
      setLinkService(service);
    }, [currentPage, goToPage, pdf]);

    useEffect(() => {
      onStateChange({
        page: currentPage,
        total: pages.length,
        scaleMode,
        manualScale: scaleMode === "fit" ? fitScale : manualScale,
        scrollRatio,
      });
    }, [
      currentPage,
      fitScale,
      manualScale,
      onStateChange,
      pages.length,
      scaleMode,
      scrollRatio,
    ]);

    useEffect(() => {
      if (!pages.length) return;
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const page = Number(hash.get("page"));
      if (page >= 1 && page <= pages.length) {
        requestAnimationFrame(() => goToPage(page, "auto"));
      }
    }, [goToPage, pages.length]);

    useEffect(() => {
      const stage = stageRef.current;
      if (!stage) return;

      const onWheel = (event: WheelEvent) => {
        if (!event.ctrlKey && !event.metaKey) return;
        event.preventDefault();
        zoomBy(event.deltaY < 0 ? 0.1 : -0.1);
      };

      const distance = (touches: TouchList) => {
        const a = touches[0];
        const b = touches[1];
        return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      };

      const onTouchStart = (event: TouchEvent) => {
        if (event.touches.length !== 2) return;
        pinch.current.distance = distance(event.touches);
        pinch.current.scale = effectiveScale;
      };

      const onTouchMove = (event: TouchEvent) => {
        if (event.touches.length !== 2 || !pinch.current.distance) return;
        event.preventDefault();
        const factor = distance(event.touches) / pinch.current.distance;
        setManualScale(clamp(pinch.current.scale * factor, 0.45, 2.5));
        setScaleMode("manual");
      };

      stage.addEventListener("wheel", onWheel, { passive: false });
      stage.addEventListener("touchstart", onTouchStart, { passive: true });
      stage.addEventListener("touchmove", onTouchMove, { passive: false });
      return () => {
        stage.removeEventListener("wheel", onWheel);
        stage.removeEventListener("touchstart", onTouchStart);
        stage.removeEventListener("touchmove", onTouchMove);
      };
    }, [effectiveScale, zoomBy]);

    const updateScrollState = useCallback(() => {
      scrollFrame.current = 0;
      const stage = stageRef.current;
      if (!stage || !pages.length) return;

      const stageTop = stage.getBoundingClientRect().top + 34;
      let bestPage = currentPage;
      let bestDistance = Number.POSITIVE_INFINITY;

      for (const page of pages) {
        const node = pageRefs.current.get(page.number);
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        const distance = Math.abs(rect.top + Math.min(rect.height / 2, 180) - stageTop);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestPage = page.number;
        }
      }

      if (bestPage !== currentPage) setCurrentPage(bestPage);
      const max = stage.scrollHeight - stage.clientHeight;
      setScrollRatio(max <= 0 ? 0 : stage.scrollTop / max);
    }, [currentPage, pages]);

    const onScroll = useCallback(() => {
      if (!scrollFrame.current) {
        scrollFrame.current = requestAnimationFrame(updateScrollState);
      }
    }, [updateScrollState]);

    useEffect(() => {
      if (embedded || !currentPage) return;
      const next = new URL(window.location.href);
      next.hash = "page=" + currentPage;
      window.history.replaceState(null, "", next);
    }, [currentPage, embedded]);

    useEffect(() => {
      if (sidebarMode !== "thumbnails") return;
      const node = document.querySelector(
        '.thumbnail-list [data-page="' + currentPage + '"]',
      );
      node?.scrollIntoView({ block: "nearest" });
    }, [currentPage, sidebarMode]);

    if (error) {
      return (
        <div className="document-error">
          <strong>Could not open the document.</strong>
          <span>{error}</span>
        </div>
      );
    }

    if (!pdf || !pages.length) {
      return <div className="document-loading">Loading document…</div>;
    }

    const sidebar = !embedded ? (
      <SidebarPanel
        pdf={pdf}
        pages={pages}
        activePage={currentPage}
        side={sidebarSide}
        mode={sidebarMode}
        hidden={sidebarHidden}
        onSelect={goToPage}
        onMove={onMoveSidebar}
        onToggleMode={onToggleSidebarMode}
      />
    ) : null;

    return (
      <div className={"document-content side-" + sidebarSide + (embedded ? " embedded" : "")}>
        {sidebarSide === "left" && sidebar}
        <section
          ref={stageRef}
          className="stage"
          aria-label="Document"
          onScroll={onScroll}
        >
          <div className="pages">
            {pages.map((info) => (
              <PdfPage
                key={info.number}
                pdf={pdf}
                info={info}
                scale={effectiveScale}
                linkService={linkService}
                stageRef={stageRef}
                register={registerPage}
              />
            ))}
          </div>
        </section>
        {sidebarSide === "right" && sidebar}
      </div>
    );
  },
);
