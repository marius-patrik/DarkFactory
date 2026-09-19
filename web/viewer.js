import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.mjs";

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@6.3.289/build/pdf.worker.mjs";

const params = new URLSearchParams(location.search);
const rawFile = params.get("file") || "";
const title = params.get("title") || "DarkFactory-Paper";
const mode = params.get("mode") || "final";
const peer = params.get("peer") || "";
const peerLabel = params.get("peer_label") || "";
const viewMode = params.get("view") === "split" ? "split" : "single";
const embedded = params.get("embedded") === "1";

if (embedded) document.documentElement.dataset.embedded = "true";

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
  split: document.querySelector("#split-link"),
  download: document.querySelector("#download-link"),
  native: document.querySelector("#native-link"),
};

els.title.textContent = title;
els.mobileTitle.textContent = mode === "review" ? "Review" : "Final";
document.title = `${title} · ${viewMode === "split" ? "Raw / Review" : mode === "review" ? "Review" : "Raw"}`;
if (embedded) els.content.classList.add("sidebar-hidden");

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
  peerParams.set("peer_label", mode === "review" ? "Review" : "Raw");
  peerParams.delete("view");
  peerParams.delete("embedded");
  els.peer.href = `viewer.html?${peerParams.toString()}`;
  els.peer.textContent = peerLabel || (mode === "review" ? "Raw" : "Review");
} else {
  els.peer.hidden = true;
}

const rawPath = mode === "review" ? peerPath : pdfPath;
const reviewPath = mode === "review" ? pdfPath : peerPath;
if (rawPath && reviewPath) {
  const splitParams = new URLSearchParams(params);
  splitParams.set("file", rawPath);
  splitParams.set("mode", "final");
  splitParams.set("peer", reviewPath);
  splitParams.set("peer_label", "Review");
  splitParams.set("view", "split");
  splitParams.delete("embedded");
  els.split.href = `viewer.html?${splitParams.toString()}`;
} else {
  els.split.hidden = true;
}

let pdf = null;
let currentPage = 1;
let scaleMode = "fit";
let manualScale = 1.15;
let pageInfos = [];
let visiblePages = new Set();
let renderVersion = 0;
let scrollFrame = 0;
let splitController = null;

function emitState() {
  if (!embedded || window.parent === window) return;
  window.parent.postMessage({
    source: "paper-viewer",
    kind: "state",
    page: currentPage,
    total: pdf?.numPages || 0,
    scaleMode,
    manualScale,
  }, "*");
}

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
    emitState();
  } catch (error) {
    console.error(error);
    els.loading.className = "error";
    els.loading.innerHTML =
      `<div><strong>Could not open the document.</strong>${String(error.message || error)}</div>`;
  }
}

function singleUrl(file, targetMode, other) {
  const target = new URLSearchParams(params);
  target.set("file", file);
  target.set("mode", targetMode);
  if (other) {
    target.set("peer", other);
    target.set("peer_label", targetMode === "review" ? "Raw" : "Review");
  } else {
    target.delete("peer");
    target.delete("peer_label");
  }
  target.delete("view");
  target.delete("embedded");
  return `viewer.html?${target.toString()}`;
}

function childUrl(file, childMode) {
  const target = new URLSearchParams();
  target.set("file", file);
  target.set("title", title);
  target.set("mode", childMode);
  target.set("embedded", "1");
  return `viewer.html?${target.toString()}`;
}

function setupSplit() {
  if (!rawPath || !reviewPath) {
    els.loading.className = "error";
    els.loading.innerHTML = "<div><strong>Split view unavailable.</strong>Both raw and review PDFs are required.</div>";
    return null;
  }

  document.querySelector("#sidebar-toggle").hidden = true;
  els.mobileTitle.textContent = "Split";
  els.peer.textContent = "Raw";
  els.peer.href = singleUrl(rawPath, "final", reviewPath);
  els.split.textContent = "Single";
  els.split.href = singleUrl(rawPath, "final", reviewPath);
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

  function send(command, payload = {}, except = null) {
    for (const frame of frames) {
      if (except && frame.contentWindow === except) continue;
      frame.contentWindow?.postMessage({ source: "paper-split", command, ...payload }, "*");
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
    if (data.page && data.page !== currentPage) {
      currentPage = data.page;
      els.pageInput.value = String(currentPage);
      send("page", { page: currentPage }, event.source);
      history.replaceState(null, "", `${location.pathname}${location.search}#page=${currentPage}`);
    }
  });

  const hashPage = Number(new URLSearchParams(location.hash.replace(/^#/, "")).get("page"));
  if (hashPage > 0) currentPage = hashPage;
  els.pageInput.value = String(currentPage);
  updateZoomLabel();

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

function zoomIn() {
  if (viewMode === "split" && splitController) {
    if (scaleMode === "fit") manualScale = 1;
    scaleMode = "manual";
    manualScale = Math.min(2.5, manualScale + .1);
    updateZoomLabel();
    splitController.send("zoom", { mode: "manual", scale: manualScale });
    return;
  }
  if (scaleMode === "fit") manualScale = scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 });
  scaleMode = "manual";
  manualScale = Math.min(2.5, manualScale + .1);
  updateZoomLabel();
  rerenderVisible();
  emitState();
}

function zoomOut() {
  if (viewMode === "split" && splitController) {
    if (scaleMode === "fit") manualScale = 1;
    scaleMode = "manual";
    manualScale = Math.max(.45, manualScale - .1);
    updateZoomLabel();
    splitController.send("zoom", { mode: "manual", scale: manualScale });
    return;
  }
  if (scaleMode === "fit") manualScale = scaleFor(pageInfos[currentPage - 1] || { baseWidth: 595 });
  scaleMode = "manual";
  manualScale = Math.max(.45, manualScale - .1);
  updateZoomLabel();
  rerenderVisible();
  emitState();
}

function fitWidth() {
  scaleMode = "fit";
  updateZoomLabel();
  if (viewMode === "split" && splitController) {
    splitController.send("zoom", { mode: "fit" });
    return;
  }
  rerenderVisible();
  emitState();
}

addEventListener("message", event => {
  if (!embedded) return;
  const data = event.data;
  if (!data || data.source !== "paper-split") return;
  if (data.command === "page") {
    scrollToPage(data.page);
  } else if (data.command === "zoom") {
    if (data.mode === "fit") {
      scaleMode = "fit";
    } else {
      scaleMode = "manual";
      manualScale = Math.max(.45, Math.min(2.5, Number(data.scale) || 1));
    }
    updateZoomLabel();
    rerenderVisible();
    emitState();
  }
});

document.querySelector("#sidebar-toggle").addEventListener("click", () => {
  els.content.classList.toggle("sidebar-hidden");
  setTimeout(rerenderVisible, 170);
});
document.querySelector("#zoom-in").addEventListener("click", zoomIn);
document.querySelector("#zoom-out").addEventListener("click", zoomOut);
document.querySelector("#fit-width").addEventListener("click", fitWidth);
document.querySelector("#prev-page").addEventListener("click", () => goToPage(currentPage - 1));
document.querySelector("#next-page").addEventListener("click", () => goToPage(currentPage + 1));
document.querySelector("#theme-toggle").addEventListener("click", () =>
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")
);
document.querySelector("#fullscreen").addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
  else await document.exitFullscreen?.();
});
els.pageInput.addEventListener("change", () => goToPage(els.pageInput.value));
els.pageInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    goToPage(els.pageInput.value);
    els.pageInput.blur();
  }
});
els.stage.addEventListener("scroll", () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateCurrentPage);
}, { passive: true });
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

if (viewMode === "split" && !embedded) {
  splitController = setupSplit();
} else {
  load();
}
