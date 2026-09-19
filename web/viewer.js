import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs";

const params = new URLSearchParams(location.search);
const rawFile = params.get("file") || "";
const title = params.get("title") || "DarkFactory-Paper";
const mode = params.get("mode") || "final";
const peer = params.get("peer") || "";
const peerLabel = params.get("peer_label") || "";

function safePdfPath(value) {
  if (!value || !value.toLowerCase().endsWith(".pdf")) return null;
  if (value.includes("://") || value.startsWith("//") || value.startsWith("/")) return null;
  const normalized = value.split("/").filter(Boolean);
  if (normalized.some(part => part === "..")) return null;
  return normalized.join("/");
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
  title: document.querySelector(".doc-title"),
  mobileTitle: document.querySelector(".mobile-title"),
  peer: document.querySelector("#peer-link"),
  download: document.querySelector("#download-link"),
  native: document.querySelector("#native-link"),
};

els.title.textContent = title;
els.mobileTitle.textContent = mode === "review" ? "Review" : "Final";
document.title = `${title} · ${mode === "review" ? "Review" : "Final"}`;

if (!pdfPath) {
  els.loading.className = "error";
  els.loading.innerHTML = "<div><strong>Invalid document path.</strong>The requested PDF is not available.</div>";
  throw new Error("invalid PDF path");
}

els.download.href = pdfPath;
els.native.href = pdfPath;
if (peerPath) {
  const peerParams = new URLSearchParams(params);
  peerParams.set("file", peerPath);
  peerParams.set("mode", mode === "review" ? "final" : "review");
  peerParams.set("peer", pdfPath);
  peerParams.set("peer_label", mode === "review" ? "Review" : "Final");
  els.peer.href = `viewer.html?${peerParams.toString()}`;
  els.peer.textContent = peerLabel || (mode === "review" ? "Final" : "Review");
} else {
  els.peer.hidden = true;
}

let pdf = null;
let currentPage = 1;
let scaleMode = "fit";
let manualScale = 1.15;
let pageInfos = [];
let visiblePages = new Set();
let renderVersion = 0;
let scrollFrame = 0;

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("paper-viewer-theme", theme);
  document.querySelector("#theme-toggle").textContent = theme === "dark" ? "☀" : "☾";
}
setTheme(
  localStorage.getItem("paper-viewer-theme") ||
  (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
);

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

async function renderPage(info, version = renderVersion) {
  if (info.rendering || (info.renderedVersion === version && info.canvas.width)) return;
  info.rendering = true;
  try {
    const page = await pdf.getPage(info.number);
    if (version !== renderVersion) return;
    const cssScale = scaleFor(info);
    const pixelRatio = Math.min(devicePixelRatio || 1, 2);
    const viewport = page.getViewport({ scale: cssScale * pixelRatio });
    const cssViewport = page.getViewport({ scale: cssScale });
    info.canvas.width = Math.ceil(viewport.width);
    info.canvas.height = Math.ceil(viewport.height);
    info.canvas.style.width = `${Math.ceil(cssViewport.width)}px`;
    info.canvas.style.height = `${Math.ceil(cssViewport.height)}px`;
    info.shell.style.width = `${Math.ceil(cssViewport.width)}px`;
    info.shell.style.height = `${Math.ceil(cssViewport.height)}px`;
    await page.render({
      canvasContext: info.canvas.getContext("2d", { alpha: false }),
      viewport,
      intent: "display",
    }).promise;
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
  renderVersion += 1;
  for (const info of pageInfos) {
    applyPageSize(info);
    info.renderedVersion = -1;
    info.canvas.width = 0;
    info.canvas.height = 0;
    info.loading.hidden = false;
  }
  requestAnimationFrame(() => {
    for (const number of visiblePages) renderPage(pageInfos[number - 1]);
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
  if (best.number === currentPage) return;
  currentPage = best.number;
  els.pageInput.value = String(currentPage);
  document.querySelectorAll(".thumb").forEach(el =>
    el.classList.toggle("active", Number(el.dataset.page) === currentPage)
  );
  document.querySelector(`.thumb[data-page="${currentPage}"]`)?.scrollIntoView({ block: "nearest" });
  history.replaceState(null, "", `${location.pathname}${location.search}#page=${currentPage}`);
}

function scrollToPage(number) {
  if (!pdf) return;
  number = Math.max(1, Math.min(pdf.numPages, Number(number) || 1));
  pageInfos[number - 1]?.shell.scrollIntoView({ block: "start", behavior: "smooth" });
}

function buildPage(info) {
  const shell = document.createElement("section");
  shell.className = "page-shell";
  shell.dataset.page = info.number;
  shell.setAttribute("aria-label", `Page ${info.number}`);

  const canvas = document.createElement("canvas");
  const loading = document.createElement("div");
  loading.className = "page-loading";
  loading.textContent = `Page ${info.number}`;
  shell.append(canvas, loading);
  els.pages.append(shell);

  const thumb = document.createElement("button");
  thumb.className = "thumb";
  thumb.dataset.page = info.number;
  thumb.type = "button";
  thumb.setAttribute("aria-label", `Go to page ${info.number}`);
  thumb.innerHTML = `<span class="thumb-number">${info.number}</span><span class="thumb-canvas-wrap"><canvas></canvas></span>`;
  thumb.addEventListener("click", () => scrollToPage(info.number));
  els.sidebar.append(thumb);

  Object.assign(info, {
    shell,
    canvas,
    loading,
    thumb,
    thumbCanvas: thumb.querySelector("canvas"),
  });
  applyPageSize(info);
}

const pageObserver = new IntersectionObserver(entries => {
  for (const entry of entries) {
    const number = Number(entry.target.dataset.page);
    if (entry.isIntersecting) {
      visiblePages.add(number);
      renderPage(pageInfos[number - 1]);
    } else {
      visiblePages.delete(number);
    }
  }
}, { root: els.stage, rootMargin: "900px 0px", threshold: 0.01 });

async function load() {
  try {
    pdf = await pdfjsLib.getDocument({ url: pdfPath }).promise;
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
    const hashPage = Number(new URLSearchParams(location.hash.replace(/^#/, "")).get("page"));
    if (hashPage >= 1 && hashPage <= pdf.numPages) {
      currentPage = hashPage;
      requestAnimationFrame(() => scrollToPage(hashPage));
    }
    updateCurrentPage();
  } catch (error) {
    console.error(error);
    els.loading.className = "error";
    els.loading.innerHTML =
      `<div><strong>Could not open the document.</strong>${String(error.message || error)}</div>`;
  }
}

document.querySelector("#sidebar-toggle").addEventListener("click", () => {
  els.content.classList.toggle("sidebar-hidden");
  setTimeout(rerenderVisible, 170);
});
document.querySelector("#zoom-in").addEventListener("click", () => {
  if (scaleMode === "fit") manualScale = scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 });
  scaleMode = "manual";
  manualScale = Math.min(2.5, manualScale + .1);
  updateZoomLabel();
  rerenderVisible();
});
document.querySelector("#zoom-out").addEventListener("click", () => {
  if (scaleMode === "fit") manualScale = scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 });
  scaleMode = "manual";
  manualScale = Math.max(.45, manualScale - .1);
  updateZoomLabel();
  rerenderVisible();
});
document.querySelector("#fit-width").addEventListener("click", () => {
  scaleMode = "fit";
  updateZoomLabel();
  rerenderVisible();
});
document.querySelector("#prev-page").addEventListener("click", () => scrollToPage(currentPage - 1));
document.querySelector("#next-page").addEventListener("click", () => scrollToPage(currentPage + 1));
document.querySelector("#theme-toggle").addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")
);
document.querySelector("#fullscreen").addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});
els.pageInput.addEventListener("change", () => scrollToPage(els.pageInput.value));
els.pageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    scrollToPage(els.pageInput.value);
    els.pageInput.blur();
  }
});
els.stage.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateCurrentPage);
}, { passive: true });
addEventListener("resize", () => {
  if (scaleMode === "fit") rerenderVisible();
});
addEventListener("keydown", event => {
  const tag = document.activeElement?.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea") return;
  if (event.key === "ArrowLeft" || event.key === "PageUp") {
    event.preventDefault();
    scrollToPage(currentPage - 1);
  } else if (event.key === "ArrowRight" || event.key === "PageDown") {
    event.preventDefault();
    scrollToPage(currentPage + 1);
  } else if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    document.querySelector("#zoom-in").click();
  } else if (event.key === "-") {
    event.preventDefault();
    document.querySelector("#zoom-out").click();
  } else if (event.key === "0") {
    event.preventDefault();
    document.querySelector("#fit-width").click();
  }
});

load();
