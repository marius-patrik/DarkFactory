import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.mjs";
import { EventBus, PDFLinkService } from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/web/pdf_viewer.mjs";
import { mountAnimatedIcons, setAnimatedIcon } from "./icons.js";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs";

const DEFAULT_WORK_TITLE =
  "Agentické inženýrství a design harnessu pro automatizovaný softwarový vývoj";

const params = new URLSearchParams(location.search);
const rawFile = params.get("file") || "";
const versionTitle = params.get("title") || "Školní česká verze";
const mode = params.get("mode") === "review" ? "review" : "final";
const peer = params.get("peer") || "";
const viewMode = params.get("view") === "split" ? "split" : "single";
const embedded = params.get("embedded") === "1";
let templateName = params.get("template") || "";
let profileName = params.get("profile") || "";

if (embedded) document.documentElement.dataset.embedded = "true";

function safePdfPath(value) {
  if (!value || !value.toLowerCase().endsWith(".pdf")) return null;
  if (value.includes("://") || value.startsWith("//") || value.startsWith("/")) return null;
  const normalized = value.split("/").filter(Boolean);
  if (normalized.some(part => part === "..")) return null;
  return normalized.join("/");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const pdfPath = safePdfPath(rawFile);
const peerPath = safePdfPath(peer);

const els = {
  content: document.querySelector(".content"),
  sidebar: document.querySelector(".sidebar"),
  stage: document.querySelector(".stage"),
  pages: document.querySelector(".pages"),
  loading: document.querySelector(".loading"),
  pageInput: document.querySelector("#page-input"),
  pageTotal: document.querySelector("#page-total"),
  zoom: document.querySelector("#zoom-value"),
  workTitle: document.querySelector("#work-title"),
  versionTitle: document.querySelector("#version-title"),
  versionSelect: document.querySelector("#version-select"),
  versionMenu: document.querySelector("#version-menu"),
  peer: document.querySelector("#peer-link"),
  split: document.querySelector("#split-link"),
  syncScroll: document.querySelector("#sync-scroll"),
  download: document.querySelector("#download-link"),
  native: document.querySelector("#native-link"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarMenu: document.querySelector("#sidebar-menu"),
  sidebarMoveLabel: document.querySelector("#sidebar-move-label"),
  sidebarModeLabel: document.querySelector("#sidebar-mode-label"),
  themeToggle: document.querySelector("#theme-toggle"),
  themeIcon: document.querySelector("#theme-icon"),
};

mountAnimatedIcons();

els.versionTitle.textContent = versionTitle;
document.title = `${DEFAULT_WORK_TITLE} · ${versionTitle} · ${viewMode === "split" ? "Raw / Review" : mode === "review" ? "Review" : "Raw"}`;

if (!pdfPath) {
  els.loading.className = "error";
  els.loading.innerHTML =
    "<div><strong>Invalid document path.</strong>The requested PDF is not available.</div>";
  throw new Error("invalid PDF path");
}

els.download.href = pdfPath;
els.native.href = pdfPath;

const rawPath = mode === "review" ? peerPath : pdfPath;
const reviewPath = mode === "review" ? pdfPath : peerPath;

let manifest = null;
let pdf = null;
let linkService = null;
let currentPage = 1;
let scaleMode = "fit";
let manualScale = 1.15;
let pageInfos = [];
let visiblePages = new Set();
let renderVersion = 0;
let scrollFrame = 0;
let splitController = null;
let suppressBroadcast = false;
let splitSyncScroll = localStorage.getItem("paper-viewer-sync-scroll") === "true";

let sidebarSide = localStorage.getItem("paper-viewer-sidebar-side") || "left";
let sidebarMode = localStorage.getItem("paper-viewer-sidebar-mode") || "thumbnails";
let sidebarHidden = innerWidth <= 760;

function currentScrollRatio() {
  if (!els.stage) return 0;
  const max = els.stage.scrollHeight - els.stage.clientHeight;
  return max <= 0 ? 0 : els.stage.scrollTop / max;
}

function emitState() {
  if (!embedded || window.parent === window || suppressBroadcast) return;
  window.parent.postMessage({
    source: "paper-viewer",
    kind: "state",
    page: currentPage,
    total: pdf?.numPages || 0,
    scaleMode,
    manualScale,
    scrollRatio: currentScrollRatio(),
  }, "*");
}

function setTheme(theme, propagate = true) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("paper-viewer-theme", theme);
  setAnimatedIcon(els.themeIcon, theme === "dark" ? ["SunIcon"] : ["MoonIcon"], { size: 18 });
  if (propagate && viewMode === "split") {
    splitController?.send("theme", { theme });
  }
}

setTheme(
  localStorage.getItem("paper-viewer-theme") ||
    (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"),
  false,
);

function applySidebarState() {
  if (!els.content) return;
  sidebarSide = sidebarSide === "right" ? "right" : "left";
  sidebarMode = sidebarMode === "minimap" ? "minimap" : "thumbnails";
  els.content.dataset.sidebarSide = sidebarSide;
  els.content.dataset.sidebarMode = sidebarMode;
  els.content.classList.toggle("sidebar-hidden", sidebarHidden);

  localStorage.setItem("paper-viewer-sidebar-side", sidebarSide);
  localStorage.setItem("paper-viewer-sidebar-mode", sidebarMode);

  els.sidebarMoveLabel.textContent =
    sidebarSide === "left" ? "Move sidebar right" : "Move sidebar left";
  els.sidebarModeLabel.textContent =
    sidebarMode === "minimap" ? "Convert to thumbnails" : "Convert to minimap";

  const moveIcon = els.sidebarMenu.querySelector('[data-sidebar-action="move"] [data-icon]');
  setAnimatedIcon(
    moveIcon,
    sidebarSide === "left"
      ? ["PanelRightIcon", "PanelLeftIcon"]
      : ["PanelLeftIcon", "PanelRightIcon"],
    { size: 16 },
  );
  setAnimatedIcon(
    els.sidebarToggle.querySelector("[data-icon]"),
    sidebarSide === "left"
      ? ["PanelLeftIcon", "MenuIcon"]
      : ["PanelRightIcon", "MenuIcon"],
    { size: 18 },
  );

  if (pdf && viewMode === "single") setTimeout(rerenderVisible, 160);
}

applySidebarState();

function closeFloatingMenus() {
  els.versionMenu.hidden = true;
  els.versionSelect.setAttribute("aria-expanded", "false");
  els.sidebarMenu.hidden = true;
}

function showSidebarMenu(event) {
  if (viewMode === "split") return;
  event.preventDefault();
  applySidebarState();
  els.sidebarMenu.hidden = false;
  const width = 210;
  const height = 92;
  els.sidebarMenu.style.left = `${clamp(event.clientX, 6, innerWidth - width - 6)}px`;
  els.sidebarMenu.style.top = `${clamp(event.clientY, 6, innerHeight - height - 6)}px`;
}

els.sidebar.addEventListener("contextmenu", showSidebarMenu);
els.sidebarMenu.addEventListener("click", event => {
  const button = event.target.closest("[data-sidebar-action]");
  if (!button) return;
  if (button.dataset.sidebarAction === "move") {
    sidebarSide = sidebarSide === "left" ? "right" : "left";
  } else if (button.dataset.sidebarAction === "minimap") {
    sidebarMode = sidebarMode === "minimap" ? "thumbnails" : "minimap";
  }
  els.sidebarMenu.hidden = true;
  applySidebarState();
});

els.sidebarToggle.addEventListener("click", () => {
  sidebarHidden = !sidebarHidden;
  applySidebarState();
});

function hrefFor(template, filename, defaultTemplate) {
  return template === defaultTemplate ? filename : `templates/${template}/${filename}`;
}

function makeViewerUrl({
  file,
  other,
  targetMode,
  targetProfile,
  targetTitle,
  targetView = viewMode,
}) {
  const next = new URLSearchParams();
  next.set("file", file);
  next.set("title", targetTitle);
  next.set("mode", targetMode);
  if (other) {
    next.set("peer", other);
    next.set("peer_label", targetMode === "review" ? "Raw" : "Review");
  }
  if (targetView === "split") next.set("view", "split");
  if (templateName) next.set("template", templateName);
  if (targetProfile) next.set("profile", targetProfile);
  return `viewer.html?${next.toString()}`;
}

function configureModeLinks() {
  if (peerPath) {
    els.peer.hidden = false;
    const targetMode = mode === "review" ? "final" : "review";
    els.peer.href = makeViewerUrl({
      file: peerPath,
      other: pdfPath,
      targetMode,
      targetProfile: profileName,
      targetTitle: versionTitle,
      targetView: "single",
    });
    els.peer.title = mode === "review" ? "Open Raw" : "Open Review";
    els.peer.setAttribute("aria-label", els.peer.title);
  } else {
    els.peer.hidden = true;
  }

  if (rawPath && reviewPath) {
    els.split.hidden = false;
    if (viewMode === "split") {
      els.split.href = makeViewerUrl({
        file: rawPath,
        other: reviewPath,
        targetMode: "final",
        targetProfile: profileName,
        targetTitle: versionTitle,
        targetView: "single",
      });
      els.split.title = "Single Raw view";
      els.split.setAttribute("aria-label", "Single Raw view");
    } else {
      els.split.href = makeViewerUrl({
        file: rawPath,
        other: reviewPath,
        targetMode: "final",
        targetProfile: profileName,
        targetTitle: versionTitle,
        targetView: "split",
      });
      els.split.title = "Split Raw / Review";
      els.split.setAttribute("aria-label", "Split Raw / Review");
    }
  } else {
    els.split.hidden = true;
  }
}

configureModeLinks();

async function loadManifest() {
  try {
    const response = await fetch("variants.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`variants.json: ${response.status}`);
    manifest = await response.json();

    els.workTitle.textContent = manifest.work_title || DEFAULT_WORK_TITLE;
    document.title = `${els.workTitle.textContent} · ${versionTitle}`;

    templateName ||= manifest.default_template || "";
    if (!profileName) {
      const byTitle = manifest.variants?.find(item => item.title === versionTitle);
      profileName = byTitle?.profile || manifest.variants?.[0]?.profile || "";
    }

    renderVersionMenu();
  } catch (error) {
    console.warn("Could not load variant manifest", error);
    els.workTitle.textContent = DEFAULT_WORK_TITLE;
  }
}

function renderVersionMenu() {
  if (!manifest?.variants?.length) return;
  els.versionMenu.replaceChildren();

  for (const variant of manifest.variants) {
    const button = document.createElement("button");
    button.type = "button";
    button.role = "option";
    button.dataset.profile = variant.profile;
    button.classList.toggle("active", variant.profile === profileName);
    button.setAttribute("aria-selected", variant.profile === profileName ? "true" : "false");
    button.innerHTML = `
      <span data-icon="${variant.profile === profileName ? "CircleCheckIcon|CheckIcon" : "FileTextIcon"}" data-icon-size="16"></span>
      <span class="version-option-text">
        <strong></strong>
        <small></small>
      </span>
    `;
    button.querySelector("strong").textContent = variant.title;
    button.querySelector("small").textContent = variant.profile;
    button.addEventListener("click", () => switchVersion(variant));
    els.versionMenu.append(button);
  }

  mountAnimatedIcons(els.versionMenu);
}

function switchVersion(variant) {
  if (!manifest) return;
  const targetRaw = hrefFor(templateName, variant.final, manifest.default_template);
  const targetReview = hrefFor(templateName, variant.review, manifest.default_template);
  const targetMode = viewMode === "split" ? "final" : mode;
  const targetFile = targetMode === "review" ? targetReview : targetRaw;
  const targetPeer = targetMode === "review" ? targetRaw : targetReview;

  location.href = makeViewerUrl({
    file: targetFile,
    other: targetPeer,
    targetMode,
    targetProfile: variant.profile,
    targetTitle: variant.title,
    targetView: viewMode,
  });
}

els.versionSelect.addEventListener("click", event => {
  event.stopPropagation();
  const open = els.versionMenu.hidden;
  els.versionMenu.hidden = !open;
  els.versionSelect.setAttribute("aria-expanded", open ? "true" : "false");
});

addEventListener("click", event => {
  if (!els.versionMenu.contains(event.target) && !els.versionSelect.contains(event.target)) {
    els.versionMenu.hidden = true;
    els.versionSelect.setAttribute("aria-expanded", "false");
  }
  if (!els.sidebarMenu.contains(event.target)) {
    els.sidebarMenu.hidden = true;
  }
});

addEventListener("keydown", event => {
  if (event.key === "Escape") closeFloatingMenus();
});

function stageAvailableWidth() {
  return Math.max(260, els.stage.clientWidth - (innerWidth < 760 ? 20 : 60));
}

function scaleFor(info) {
  if (scaleMode === "fit") return Math.min(2.4, stageAvailableWidth() / info.baseWidth);
  return manualScale;
}

function updateZoomLabel() {
  els.zoom.textContent = scaleMode === "fit" ? "Fit" : `${Math.round(manualScale * 100)}%`;
}

function applyPageSize(info) {
  const scale = scaleFor(info);
  info.shell.style.width = `${Math.round(info.baseWidth * scale)}px`;
  info.shell.style.height = `${Math.round(info.baseHeight * scale)}px`;
}

async function renderInteractiveLayers(page, info, cssViewport, version) {
  if (version !== renderVersion) return;

  info.textLayer.replaceChildren();
  info.annotationLayer.replaceChildren();
  info.textLayer.style.setProperty("--total-scale-factor", String(cssViewport.scale));

  try {
    const textContent = await page.getTextContent();
    if (version !== renderVersion) return;
    const textLayer = new pdfjsLib.TextLayer({
      textContentSource: textContent,
      container: info.textLayer,
      viewport: cssViewport,
    });
    await textLayer.render();
  } catch (error) {
    console.warn("text layer failed", info.number, error);
  }

  try {
    const annotations = await page.getAnnotations({ intent: "display" });
    if (version !== renderVersion || annotations.length === 0) return;
    const annotationViewport = cssViewport.clone({ dontFlip: true });
    const annotationLayer = new pdfjsLib.AnnotationLayer({
      div: info.annotationLayer,
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
  } catch (error) {
    console.warn("annotation layer failed", info.number, error);
  }
}

async function renderPage(info, version = renderVersion) {
  if (info.rendering || (info.renderedVersion === version && info.canvas.width)) return;
  info.rendering = true;

  try {
    const page = await pdf.getPage(info.number);
    if (version !== renderVersion) return;

    const cssScale = scaleFor(info);
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const renderViewport = page.getViewport({ scale: cssScale * pixelRatio });
    const cssViewport = page.getViewport({ scale: cssScale });

    info.canvas.width = Math.ceil(renderViewport.width);
    info.canvas.height = Math.ceil(renderViewport.height);
    info.canvas.style.width = `${Math.ceil(cssViewport.width)}px`;
    info.canvas.style.height = `${Math.ceil(cssViewport.height)}px`;
    info.shell.style.width = `${Math.ceil(cssViewport.width)}px`;
    info.shell.style.height = `${Math.ceil(cssViewport.height)}px`;

    await page.render({
      canvasContext: info.canvas.getContext("2d", { alpha: false }),
      viewport: renderViewport,
      intent: "display",
    }).promise;

    if (version !== renderVersion) return;
    await renderInteractiveLayers(page, info, cssViewport, version);

    if (version === renderVersion) {
      info.renderedVersion = version;
      info.loading.hidden = true;
    }
  } catch (error) {
    console.error("page render failed", info.number, error);
  } finally {
    info.rendering = false;
  }
}

function rerenderVisible() {
  if (!pdf) return;
  renderVersion += 1;
  for (const info of pageInfos) {
    applyPageSize(info);
    info.renderedVersion = -1;
    info.canvas.width = 0;
    info.canvas.height = 0;
    info.textLayer.replaceChildren();
    info.annotationLayer.replaceChildren();
    info.loading.hidden = false;
  }

  requestAnimationFrame(() => {
    for (const number of visiblePages) {
      renderPage(pageInfos[number - 1]);
    }
  });
}

async function renderThumbnail(info) {
  try {
    const page = await pdf.getPage(info.number);
    const base = page.getViewport({ scale: 1 });
    const cssScale = 132 / base.width;
    const pixelRatio = Math.min(devicePixelRatio || 1, 1.5);
    const viewport = page.getViewport({ scale: cssScale * pixelRatio });
    info.thumbCanvas.width = Math.ceil(viewport.width);
    info.thumbCanvas.height = Math.ceil(viewport.height);
    await page.render({
      canvasContext: info.thumbCanvas.getContext("2d", { alpha: false }),
      viewport,
      intent: "display",
    }).promise;
  } catch (error) {
    console.error("thumbnail render failed", info.number, error);
  }
}

function updateCurrentPage() {
  scrollFrame = 0;
  if (!pageInfos.length) return;

  const stageTop = els.stage.getBoundingClientRect().top + 34;
  let best = pageInfos[0];
  let bestDistance = Infinity;

  for (const info of pageInfos) {
    const rect = info.shell.getBoundingClientRect();
    const distance = Math.abs(rect.top + Math.min(rect.height / 2, 180) - stageTop);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = info;
    }
  }

  if (best.number !== currentPage) {
    currentPage = best.number;
    els.pageInput.value = String(currentPage);
    document.querySelectorAll(".thumb").forEach(element => {
      element.classList.toggle("active", Number(element.dataset.page) === currentPage);
    });
    document.querySelector(`.thumb[data-page="${currentPage}"]`)?.scrollIntoView({ block: "nearest" });
    history.replaceState(null, "", `${location.pathname}${location.search}#page=${currentPage}`);
  }

  emitState();
}

function scrollToPage(number, behavior = "smooth") {
  if (!pdf) return;
  const page = clamp(Number(number) || 1, 1, pdf.numPages);
  pageInfos[page - 1]?.shell.scrollIntoView({ block: "start", behavior });
}

function buildPage(info) {
  const shell = document.createElement("section");
  shell.className = "page-shell";
  shell.dataset.page = info.number;
  shell.setAttribute("aria-label", `Page ${info.number}`);

  const canvas = document.createElement("canvas");
  const textLayer = document.createElement("div");
  textLayer.className = "textLayer";
  const annotationLayer = document.createElement("div");
  annotationLayer.className = "annotationLayer";
  const loading = document.createElement("div");
  loading.className = "page-loading";
  loading.textContent = `Page ${info.number}`;

  shell.append(canvas, textLayer, annotationLayer, loading);
  els.pages.append(shell);

  const thumb = document.createElement("button");
  thumb.className = "thumb";
  thumb.dataset.page = info.number;
  thumb.type = "button";
  thumb.setAttribute("aria-label", `Go to page ${info.number}`);
  thumb.innerHTML =
    `<span class="thumb-number">${info.number}</span><span class="thumb-canvas-wrap"><canvas></canvas></span>`;
  thumb.addEventListener("click", () => scrollToPage(info.number));
  els.sidebar.append(thumb);

  Object.assign(info, {
    shell,
    canvas,
    textLayer,
    annotationLayer,
    loading,
    thumb,
    thumbCanvas: thumb.querySelector("canvas"),
  });

  applyPageSize(info);
}

const pageObserver = new IntersectionObserver(
  entries => {
    for (const entry of entries) {
      const number = Number(entry.target.dataset.page);
      if (entry.isIntersecting) {
        visiblePages.add(number);
        renderPage(pageInfos[number - 1]);
      } else {
        visiblePages.delete(number);
      }
    }
  },
  { root: els.stage, rootMargin: "900px 0px", threshold: 0.01 },
);

function setupLinkService() {
  const eventBus = new EventBus();
  linkService = new PDFLinkService({
    eventBus,
    externalLinkTarget: 2,
    externalLinkRel: "noopener noreferrer",
  });
  linkService.setDocument(pdf);
  linkService.setViewer({
    get currentPageNumber() {
      return currentPage;
    },
    set currentPageNumber(value) {
      scrollToPage(value);
    },
    get pagesCount() {
      return pdf?.numPages || 0;
    },
    get isInPresentationMode() {
      return false;
    },
    scrollPageIntoView({ pageNumber }) {
      scrollToPage(pageNumber);
    },
  });
}

async function load() {
  try {
    pdf = await pdfjsLib.getDocument({ url: pdfPath }).promise;
    setupLinkService();

    els.pageTotal.textContent = `/ ${pdf.numPages}`;
    els.pageInput.max = String(pdf.numPages);

    for (let number = 1; number <= pdf.numPages; number += 1) {
      const page = await pdf.getPage(number);
      const viewport = page.getViewport({ scale: 1 });
      const info = {
        number,
        baseWidth: viewport.width,
        baseHeight: viewport.height,
        renderedVersion: -1,
        rendering: false,
      };
      pageInfos.push(info);
      buildPage(info);
      pageObserver.observe(info.shell);
      renderThumbnail(info);
    }

    els.loading.remove();
    updateZoomLabel();

    const hashPage = Number(
      new URLSearchParams(location.hash.replace(/^#/, "")).get("page"),
    );
    if (hashPage >= 1 && hashPage <= pdf.numPages) {
      currentPage = hashPage;
      requestAnimationFrame(() => scrollToPage(hashPage, "auto"));
    }

    updateCurrentPage();
    emitState();
  } catch (error) {
    console.error(error);
    els.loading.className = "error";
    els.loading.innerHTML =
      `<div><strong>Could not open the document.</strong>${String(error.message || error)}</div>`;
  }
}

function singleUrl(file, targetMode, other) {
  return makeViewerUrl({
    file,
    other,
    targetMode,
    targetProfile: profileName,
    targetTitle: versionTitle,
    targetView: "single",
  });
}

function childUrl(file, childMode) {
  const target = new URLSearchParams();
  target.set("file", file);
  target.set("title", versionTitle);
  target.set("mode", childMode);
  target.set("embedded", "1");
  if (templateName) target.set("template", templateName);
  if (profileName) target.set("profile", profileName);
  return `viewer.html?${target.toString()}`;
}

function updateSyncButton() {
  if (viewMode !== "split") {
    els.syncScroll.hidden = true;
    return;
  }
  els.syncScroll.hidden = false;
  els.syncScroll.setAttribute("aria-pressed", splitSyncScroll ? "true" : "false");
  els.syncScroll.title = splitSyncScroll
    ? "Disable synchronized split scrolling"
    : "Synchronize split scrolling";
  els.syncScroll.setAttribute("aria-label", els.syncScroll.title);
  setAnimatedIcon(
    els.syncScroll.querySelector("[data-icon]"),
    splitSyncScroll ? ["LinkIcon"] : ["UnlinkIcon", "LinkIcon"],
    { size: 18 },
  );
}

function setupSplit() {
  if (!rawPath || !reviewPath) {
    els.loading.className = "error";
    els.loading.innerHTML =
      "<div><strong>Split view unavailable.</strong>Both raw and review PDFs are required.</div>";
    return null;
  }

  els.sidebarToggle.hidden = true;
  els.peer.href = singleUrl(reviewPath, "review", rawPath);
  els.peer.title = "Open Review only";
  els.peer.setAttribute("aria-label", els.peer.title);
  els.split.href = singleUrl(rawPath, "final", reviewPath);
  els.split.title = "Open Raw only";
  els.split.setAttribute("aria-label", els.split.title);
  els.download.href = rawPath;
  els.native.href = rawPath;

  els.content.className = "content split-view";
  els.content.innerHTML = `
    <section class="split-column">
      <div class="split-label">Raw</div>
      <iframe title="Raw document" src="${childUrl(rawPath, "final")}"></iframe>
    </section>
    <section class="split-column">
      <div class="split-label">Review</div>
      <iframe title="Review document" src="${childUrl(reviewPath, "review")}"></iframe>
    </section>
  `;

  const frames = [...els.content.querySelectorAll("iframe")];
  let lastZoomMode = "fit";
  let lastZoomScale = 1.15;

  function send(command, payload = {}, except = null) {
    for (const frame of frames) {
      if (except && frame.contentWindow === except) continue;
      frame.contentWindow?.postMessage(
        { source: "paper-split", command, ...payload },
        "*",
      );
    }
  }

  addEventListener("message", event => {
    if (!frames.some(frame => frame.contentWindow === event.source)) return;
    const data = event.data;
    if (!data || data.source !== "paper-viewer" || data.kind !== "state") return;

    if (data.total) {
      els.pageTotal.textContent = `/ ${data.total}`;
      els.pageInput.max = String(data.total);
    }

    if (data.page) {
      currentPage = data.page;
      els.pageInput.value = String(currentPage);
    }

    if (
      data.scaleMode &&
      (data.scaleMode !== lastZoomMode ||
        Math.abs((data.manualScale || 0) - lastZoomScale) > 0.001)
    ) {
      lastZoomMode = data.scaleMode;
      lastZoomScale = data.manualScale || lastZoomScale;
      scaleMode = lastZoomMode;
      manualScale = lastZoomScale;
      updateZoomLabel();
      send(
        "zoom",
        { mode: scaleMode, scale: manualScale },
        event.source,
      );
    }

    if (splitSyncScroll && Number.isFinite(data.scrollRatio)) {
      send("scroll", { ratio: data.scrollRatio }, event.source);
    }

    history.replaceState(
      null,
      "",
      `${location.pathname}${location.search}#page=${currentPage}`,
    );
  });

  const hashPage = Number(
    new URLSearchParams(location.hash.replace(/^#/, "")).get("page"),
  );
  if (hashPage > 0) currentPage = hashPage;
  els.pageInput.value = String(currentPage);
  updateZoomLabel();
  updateSyncButton();

  return { send };
}

function goToPage(number) {
  if (viewMode === "split" && splitController) {
    currentPage = Math.max(1, Number(number) || 1);
    els.pageInput.value = String(currentPage);
    splitController.send("page", { page: currentPage });
    return;
  }
  scrollToPage(number);
}

function setManualScale(scale, broadcast = true) {
  manualScale = clamp(scale, .45, 2.5);
  scaleMode = "manual";
  updateZoomLabel();

  if (viewMode === "split" && splitController) {
    if (broadcast) {
      splitController.send("zoom", { mode: "manual", scale: manualScale });
    }
  } else {
    rerenderVisible();
    if (broadcast) emitState();
  }
}

function zoomBy(step) {
  if (scaleMode === "fit") {
    if (viewMode === "split") {
      manualScale = 1;
    } else {
      manualScale = scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 });
    }
  }
  setManualScale(manualScale + step);
}

function fitWidth(broadcast = true) {
  scaleMode = "fit";
  updateZoomLabel();
  if (viewMode === "split" && splitController) {
    if (broadcast) splitController.send("zoom", { mode: "fit" });
  } else {
    rerenderVisible();
    if (broadcast) emitState();
  }
}

addEventListener("message", event => {
  if (!embedded) return;
  const data = event.data;
  if (!data || data.source !== "paper-split") return;

  suppressBroadcast = true;
  try {
    if (data.command === "page") {
      scrollToPage(data.page, "auto");
    } else if (data.command === "scroll") {
      const max = els.stage.scrollHeight - els.stage.clientHeight;
      els.stage.scrollTop = clamp(Number(data.ratio) || 0, 0, 1) * Math.max(0, max);
    } else if (data.command === "zoom") {
      if (data.mode === "fit") {
        fitWidth(false);
      } else {
        setManualScale(Number(data.scale) || 1, false);
      }
    } else if (data.command === "theme") {
      setTheme(data.theme === "light" ? "light" : "dark", false);
    }
  } finally {
    requestAnimationFrame(() => {
      suppressBroadcast = false;
    });
  }
});

els.syncScroll.addEventListener("click", () => {
  splitSyncScroll = !splitSyncScroll;
  localStorage.setItem("paper-viewer-sync-scroll", String(splitSyncScroll));
  updateSyncButton();
  if (splitSyncScroll) {
    splitController?.send("page", { page: currentPage });
  }
});

document.querySelector("#zoom-in").addEventListener("click", () => zoomBy(.1));
document.querySelector("#zoom-out").addEventListener("click", () => zoomBy(-.1));
document.querySelector("#fit-width").addEventListener("click", () => fitWidth());
els.zoom.addEventListener("click", () => fitWidth());
document.querySelector("#prev-page").addEventListener("click", () => goToPage(currentPage - 1));
document.querySelector("#next-page").addEventListener("click", () => goToPage(currentPage + 1));

els.themeToggle.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});

document.querySelector("#fullscreen").addEventListener("click", async () => {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen?.();
  } else {
    await document.exitFullscreen?.();
  }
});

els.pageInput.addEventListener("change", () => goToPage(els.pageInput.value));
els.pageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    goToPage(els.pageInput.value);
    els.pageInput.blur();
  }
});

function installSingleViewGestures() {
  els.stage.addEventListener(
    "wheel",
    event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      zoomBy(event.deltaY < 0 ? .1 : -.1);
    },
    { passive: false },
  );

  let pinchStartDistance = 0;
  let pinchStartScale = 1;

  function touchDistance(touches) {
    const [a, b] = touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  els.stage.addEventListener(
    "touchstart",
    event => {
      if (event.touches.length !== 2) return;
      pinchStartDistance = touchDistance(event.touches);
      pinchStartScale =
        scaleMode === "fit"
          ? scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 })
          : manualScale;
    },
    { passive: true },
  );

  els.stage.addEventListener(
    "touchmove",
    event => {
      if (event.touches.length !== 2 || !pinchStartDistance) return;
      event.preventDefault();
      const factor = touchDistance(event.touches) / pinchStartDistance;
      setManualScale(pinchStartScale * factor);
    },
    { passive: false },
  );

  els.stage.addEventListener(
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateCurrentPage);
    },
    { passive: true },
  );
}

addEventListener("resize", () => {
  if (viewMode === "split") {
    splitController?.send("zoom", { mode: scaleMode, scale: manualScale });
  } else if (scaleMode === "fit") {
    rerenderVisible();
  }
});

addEventListener("keydown", event => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return;

  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    goToPage(currentPage - 1);
  } else if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault();
    goToPage(currentPage + 1);
  } else if ((event.ctrlKey || event.metaKey) && (event.key === "+" || event.key === "=")) {
    event.preventDefault();
    zoomBy(.1);
  } else if ((event.ctrlKey || event.metaKey) && event.key === "-") {
    event.preventDefault();
    zoomBy(-.1);
  } else if ((event.ctrlKey || event.metaKey) && event.key === "0") {
    event.preventDefault();
    fitWidth();
  }
});

loadManifest();

if (viewMode === "split" && !embedded) {
  splitController = setupSplit();
} else {
  installSingleViewGestures();
  load();
}
