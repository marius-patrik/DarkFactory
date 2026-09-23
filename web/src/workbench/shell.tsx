import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { GitBranch, PanelBottom, PanelLeft, PanelRight, UserRound } from "lucide-react";
import { useWorkbenchSettings, type AppearanceMode } from "@/settings";
import { useWorkspace } from "@/workspace/context";
import { useWorkbenchShortcuts } from "./commands";
import type {
  PersistedWorkbench,
  SplitDirection,
  WorkbenchDropTarget,
  WorkbenchRootSizes,
  WorkbenchSurface,
  WorkbenchTab,
  WorkbenchTabType,
} from "./model";
import { createWorkbenchTab, tabDefinition } from "./registry";
import { loadWorkbench, saveWorkbench } from "./persistence";
import { Omnibar, type OmnibarControl } from "./omnibar";
import { WorkbenchRuntimeContext, type WorkbenchRuntime } from "./runtime";
import { WorkbenchSurfaceView } from "./surface";

const SURFACES: WorkbenchSurface[] = ["primary", "main", "secondary", "panel"];
const RESIZER_SIZE = 4;
const MAIN_MIN_WIDTH = 300;
const MAIN_MIN_HEIGHT = 180;
const SIDEBAR_MIN = 180;
const SIDEBAR_MAX = 520;
const PANEL_MIN = 110;
const PANEL_MAX = 520;

type ResizeKind = keyof WorkbenchRootSizes;

type ResizeSession = {
  kind: ResizeKind;
  pointerId: number;
  target: HTMLElement;
  startX: number;
  startY: number;
  startSize: number;
};

function clamp(value: number, minimum: number, maximum: number) {
  if (maximum <= minimum) return maximum;
  return Math.min(maximum, Math.max(minimum, value));
}

function visibleSizes(
  sizes: WorkbenchRootSizes,
  visibility: Record<WorkbenchSurface, boolean>,
  viewport: { width: number; height: number },
) {
  let primary = visibility.primary ? sizes.primary : 0;
  let secondary = visibility.secondary ? sizes.secondary : 0;
  const verticalHandles = (visibility.primary ? RESIZER_SIZE : 0) + (visibility.secondary ? RESIZER_SIZE : 0);
  const sideBudget = Math.max(0, viewport.width - MAIN_MIN_WIDTH - verticalHandles);
  if (primary + secondary > sideBudget && primary + secondary > 0) {
    const scale = sideBudget / (primary + secondary);
    primary *= scale;
    secondary *= scale;
  }
  const panelBudget = Math.max(0, viewport.height - 36 - 24 - MAIN_MIN_HEIGHT - (visibility.panel ? RESIZER_SIZE : 0));
  const panel = visibility.panel ? Math.min(sizes.panel, panelBudget) : 0;
  return { primary, secondary, panel };
}

function paramsOf(panel: any): WorkbenchTab | null {
  const apiParams = panel?.api?.getParameters?.();
  const params =
    apiParams && typeof apiParams.id === "string" && typeof apiParams.type === "string"
      ? apiParams
      : panel?.params;
  return params && typeof params.id === "string" && typeof params.type === "string" ? params as WorkbenchTab : null;
}

function tabString(tab: WorkbenchTab | null, key: string) {
  const value = tab?.state[key];
  return typeof value === "string" ? value : "";
}

function tabNumber(tab: WorkbenchTab | null, key: string) {
  const value = tab?.state[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function activeStatusLabel(tab: WorkbenchTab | null) {
  if (!tab) return "";
  if (tab.type === "editor" || tab.type === "document") {
    const path = tabString(tab, "path") || tab.resource || tab.title;
    const renderer = tabString(tab, "renderer") || (tab.type === "document" ? "browser" : "editor");
    const language = tabString(tab, "language");
    const compare = tabString(tab, "compare");
    const review = tab.state.review === true ? "Review" : "";
    const viewState = tab.state.editorViewState;
    const position = viewState && typeof viewState === "object" && "position" in viewState
      ? (viewState as { position?: { lineNumber?: number; column?: number } }).position
      : undefined;
    const cursor = position?.lineNumber
      ? `Ln ${position.lineNumber}, Col ${position.column ?? 1}`
      : "";
    return [path, renderer, language, review, compare && compare !== "none" ? compare : "", cursor]
      .filter(Boolean)
      .join(" · ");
  }
  if (tab.type === "browser") return tabString(tab, "url") || "about:blank";
  if (tab.type === "issue") return `Issue #${tabNumber(tab, "number") ?? "—"}`;
  if (tab.type === "pull-request") return `Pull Request #${tabNumber(tab, "number") ?? "—"}`;
  if (tab.type === "project") return `Project #${tabNumber(tab, "number") ?? "—"}`;
  if (tab.type === "workflow-run") return `Workflow run #${tabNumber(tab, "id") ?? "—"}`;
  if (tab.type === "release") return `Release #${tabNumber(tab, "id") ?? "—"}`;
  if (tab.type === "commit") {
    const sha = tabString(tab, "sha");
    return sha ? `Commit ${sha.slice(0, 12)}` : "Commit";
  }
  return tab.title;
}

export function WorkbenchShell() {
  const { settings, setSetting } = useWorkbenchSettings();
  const workspace = useWorkspace();
  const [initial] = useState(() => loadWorkbench(settings.theme));
  const [visibility, setVisibility] = useState<Record<WorkbenchSurface, boolean>>(() => ({
    primary: initial.surfaces.primary.visible,
    main: true,
    secondary: initial.surfaces.secondary.visible,
    panel: initial.surfaces.panel.visible,
  }));
  const [sizes, setSizes] = useState<WorkbenchRootSizes>(() => ({ ...initial.sizes }));
  const sizesRef = useRef(sizes);
  sizesRef.current = sizes;
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [resizeKind, setResizeKind] = useState<ResizeKind | null>(null);
  const resizeRef = useRef<ResizeSession | null>(null);
  const apis = useRef(new Map<WorkbenchSurface, any>());
  const layoutMutationRef = useRef(false);
  const omnibarRef = useRef<OmnibarControl>(null);
  const activeSurfaceRef = useRef<WorkbenchSurface | null>(null);
  const [activeTab, setActiveTab] = useState<WorkbenchTab | null>(null);

  const persist = useCallback((theme: AppearanceMode = settings.theme, nextVisibility = visibility, nextSizes = sizesRef.current) => {
    const state: PersistedWorkbench = {
      version: 2,
      theme,
      sizes: { ...nextSizes },
      surfaces: {
        primary: { visible: nextVisibility.primary, layout: apis.current.get("primary")?.toJSON?.() ?? initial.surfaces.primary.layout },
        main: { visible: true, layout: apis.current.get("main")?.toJSON?.() ?? initial.surfaces.main.layout },
        secondary: { visible: nextVisibility.secondary, layout: apis.current.get("secondary")?.toJSON?.() ?? initial.surfaces.secondary.layout },
        panel: { visible: nextVisibility.panel, layout: apis.current.get("panel")?.toJSON?.() ?? initial.surfaces.panel.layout },
      },
    };
    saveWorkbench(state);
  }, [initial, settings.theme, visibility]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    persist(settings.theme);
  }, [persist, settings.theme]);

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const registerSurface = useCallback((surface: WorkbenchSurface, api: any) => {
    apis.current.set(surface, api);
  }, []);

  const handleActiveTabChange = useCallback((surface: WorkbenchSurface, tab: WorkbenchTab | null) => {
    if (tab) {
      activeSurfaceRef.current = surface;
      setActiveTab(tab);
      return;
    }
    if (activeSurfaceRef.current === surface) {
      activeSurfaceRef.current = null;
      setActiveTab(null);
    }
  }, []);

  const locate = useCallback((id: string) => {
    for (const surface of SURFACES) {
      const api = apis.current.get(surface);
      const panel = api?.getPanel?.(id);
      if (panel) return { surface, api, panel };
    }
    return null;
  }, []);

  const getTab = useCallback((id: string) => {
    const found = locate(id);
    return found ? paramsOf(found.panel) : null;
  }, [locate]);

  const setSurfaceVisible = useCallback((surface: Exclude<WorkbenchSurface, "main">, visible: boolean) => {
    setVisibility((current) => ({ ...current, [surface]: visible }));
  }, []);

  const toggleSurface = useCallback((surface: Exclude<WorkbenchSurface, "main">) => {
    setVisibility((current) => ({ ...current, [surface]: !current[surface] }));
  }, []);

  const openTab = useCallback((type: WorkbenchTabType, requestedSurface?: WorkbenchSurface, state?: Record<string, unknown>) => {
    const definition = tabDefinition(type);
    const resource = typeof state?.path === "string" ? state.path : undefined;
    if (definition.singleton || resource) {
      for (const surface of SURFACES) {
        const api = apis.current.get(surface);
        for (const panel of api?.panels ?? []) {
          const existing = paramsOf(panel);
          if (
            existing &&
            ((definition.singleton && existing.type === type) ||
              (resource && existing.type === type && existing.resource === resource))
          ) {
            if (surface !== "main") setSurfaceVisible(surface, true);
            panel.api?.setActive?.();
            return;
          }
        }
      }
    }
    const surface = requestedSurface ?? definition.defaultSurface;
    const api = apis.current.get(surface);
    if (!api) return;
    const title = resource ? resource.split("/").at(-1) || definition.title : undefined;
    const tab = createWorkbenchTab(type, { state, resource, title });
    if (surface !== "main") setSurfaceVisible(surface, true);
    const panel = api.addPanel({ id: tab.id, component: "workbench", tabComponent: "workbenchTab", title: tab.title, params: tab, renderer: "always" });
    panel.api?.setActive?.();
    persist();
  }, [persist, setSurfaceVisible]);

  const transferTab = useCallback((
    id: string,
    target: WorkbenchSurface,
    drop: WorkbenchDropTarget,
  ) => {
    const found = locate(id);
    if (!found || found.surface === target) return false;
    const source = found.surface;
    const sourceApi = found.api;
    const sourcePanel = found.panel;
    const targetApi = apis.current.get(target);
    const tab = paramsOf(sourcePanel);
    if (!targetApi || !tab) return false;

    const wasActive = sourceApi.activePanel?.id === id;
    const referencePanel = drop.referencePanelId && targetApi.getPanel?.(drop.referencePanelId)
      ? drop.referencePanelId
      : undefined;
    const position = referencePanel
      ? { referencePanel, direction: drop.direction }
      : drop.direction === "within"
        ? undefined
        : { direction: drop.direction };

    layoutMutationRef.current = true;
    let created: any = null;
    try {
      if (target !== "main") setSurfaceVisible(target, true);
      created = targetApi.addPanel({
        id: tab.id,
        component: "workbench",
        tabComponent: "workbenchTab",
        title: tab.title,
        params: tab,
        renderer: "always",
        inactive: !wasActive,
        ...(position ? { position } : {}),
      });
      if (!created) return false;
      if (wasActive) created.api?.setActive?.();
      sourceApi.removePanel(sourcePanel);
      if (wasActive) {
        activeSurfaceRef.current = target;
        setActiveTab(tab);
      }
      return true;
    } catch {
      if (created && sourceApi.getPanel?.(id)) {
        try {
          targetApi.removePanel(created);
        } catch {
        }
      }
      return false;
    } finally {
      layoutMutationRef.current = false;
      queueMicrotask(() => persist());
    }
  }, [locate, persist, setSurfaceVisible]);

  const moveTab = useCallback((id: string, target: WorkbenchSurface) => {
    const found = locate(id);
    if (!found) return;
    if (found.surface === target) {
      found.panel.api?.setActive?.();
      return;
    }
    const targetApi = apis.current.get(target);
    transferTab(id, target, {
      referencePanelId: targetApi?.activePanel?.id,
      direction: "within",
    });
  }, [locate, transferTab]);

  const splitTab = useCallback((id: string, direction: SplitDirection) => {
    const found = locate(id);
    const tab = found ? paramsOf(found.panel) : null;
    if (!found || !tab) return;
    const clone = { ...tab, id: `${tab.type}-${crypto.randomUUID()}`, pinned: false, state: { ...tab.state } };
    const panel = found.api.addPanel({
      id: clone.id,
      component: "workbench",
      tabComponent: "workbenchTab",
      title: clone.title,
      params: clone,
      renderer: "always",
      position: { referencePanel: found.panel.id, direction },
    });
    panel.api?.setActive?.();
    persist();
  }, [locate, persist]);

  const closeTab = useCallback((id: string) => {
    const found = locate(id);
    const tab = found ? paramsOf(found.panel) : null;
    if (!found || !tab || tab.pinned) return;
    found.api.removePanel(found.panel);
    persist();
  }, [locate, persist]);

  const setPinned = useCallback((id: string, pinned: boolean) => {
    const found = locate(id);
    const tab = found ? paramsOf(found.panel) : null;
    if (!found || !tab) return;
    found.panel.api?.updateParameters?.({ ...tab, pinned });
    persist();
  }, [locate, persist]);

  const updateTabState = useCallback((id: string, patch: Record<string, unknown>) => {
    const found = locate(id);
    const tab = found ? paramsOf(found.panel) : null;
    if (!found || !tab) return;
    const nextTab = { ...tab, state: { ...tab.state, ...patch } };
    found.panel.api?.updateParameters?.(nextTab);
    setActiveTab((current) => current?.id === id ? nextTab : current);
    persist();
  }, [locate, persist]);

  const setTheme = useCallback((theme: AppearanceMode) => {
    setSetting("theme", theme);
    persist(theme);
  }, [persist, setSetting]);

  const focusOmnibar = useCallback((mode: "navigation" | "command", value?: string) => {
    omnibarRef.current?.focus(mode, value);
  }, []);

  const runtime = useMemo<WorkbenchRuntime>(() => ({
    settings,
    activeTab,
    focusOmnibar,
    setTheme,
    openTab,
    moveTab,
    transferTab,
    splitTab,
    closeTab,
    setPinned,
    updateTabState,
    toggleSurface,
    setSurfaceVisible,
    layoutChanged: () => {
      if (!layoutMutationRef.current) persist();
    },
    getTab,
  }), [settings, activeTab, focusOmnibar, setTheme, openTab, moveTab, transferTab, splitTab, closeTab, setPinned, updateTabState, toggleSurface, setSurfaceVisible, persist, getTab]);

  const shortcutHandlers = useMemo(() => ({
    togglePrimary: () => toggleSurface("primary"),
    toggleSecondary: () => toggleSurface("secondary"),
    togglePanel: () => toggleSurface("panel"),
    focusNavigation: () => focusOmnibar("navigation"),
    focusCommands: () => focusOmnibar("command"),
    splitRight: () => {
      if (activeTab) splitTab(activeTab.id, "right");
    },
    splitDown: () => {
      if (activeTab) splitTab(activeTab.id, "below");
    },
  }), [activeTab, focusOmnibar, splitTab, toggleSurface]);
  useWorkbenchShortcuts(shortcutHandlers);

  const defaults = useMemo<Record<WorkbenchSurface, WorkbenchTab[]>>(() => ({
    primary: [
      createWorkbenchTab("explorer", { id: "explorer", pinned: true }),
      createWorkbenchTab("search", { id: "search", pinned: true }),
      createWorkbenchTab("source-control", { id: "source-control", pinned: true }),
    ],
    main: [],
    secondary: [],
    panel: [
      createWorkbenchTab("problems", { id: "problems", pinned: true }),
      createWorkbenchTab("output", { id: "output", pinned: true }),
    ],
  }), []);

  const effective = useMemo(() => visibleSizes(sizes, visibility, viewport), [sizes, visibility, viewport]);
  const shellStyle = {
    "--primary-size": `${effective.primary}px`,
    "--secondary-size": `${effective.secondary}px`,
    "--panel-size": `${effective.panel}px`,
  } as CSSProperties;

  const applyResize = useCallback((clientX: number, clientY: number) => {
    const session = resizeRef.current;
    if (!session) return;
    const handles = (visibility.primary ? RESIZER_SIZE : 0) + (visibility.secondary ? RESIZER_SIZE : 0);
    let nextSize = session.startSize;
    if (session.kind === "primary") {
      const other = visibility.secondary ? effective.secondary : 0;
      const maximum = Math.min(SIDEBAR_MAX, Math.max(0, viewport.width - MAIN_MIN_WIDTH - other - handles));
      nextSize = clamp(session.startSize + clientX - session.startX, Math.min(SIDEBAR_MIN, maximum), maximum);
    } else if (session.kind === "secondary") {
      const other = visibility.primary ? effective.primary : 0;
      const maximum = Math.min(SIDEBAR_MAX, Math.max(0, viewport.width - MAIN_MIN_WIDTH - other - handles));
      nextSize = clamp(session.startSize + session.startX - clientX, Math.min(SIDEBAR_MIN, maximum), maximum);
    } else {
      const maximum = Math.min(PANEL_MAX, Math.max(0, viewport.height - 36 - 24 - MAIN_MIN_HEIGHT - RESIZER_SIZE));
      nextSize = clamp(session.startSize + session.startY - clientY, Math.min(PANEL_MIN, maximum), maximum);
    }
    const next = { ...sizesRef.current, [session.kind]: Math.round(nextSize) };
    sizesRef.current = next;
    setSizes(next);
  }, [effective.primary, effective.secondary, viewport, visibility.primary, visibility.secondary]);

  const finishResize = useCallback(() => {
    const session = resizeRef.current;
    if (!session) return;
    if (session.pointerId >= 0 && session.target.hasPointerCapture(session.pointerId)) {
      session.target.releasePointerCapture(session.pointerId);
    }
    resizeRef.current = null;
    setResizeKind(null);
    persist(settings.theme, visibility, sizesRef.current);
  }, [persist, settings.theme, visibility]);

  const beginResize = useCallback((kind: ResizeKind, event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === "mouse") return;
    event.preventDefault();
    const target = event.currentTarget;
    const pointerId = event.pointerId;
    resizeRef.current = {
      kind,
      pointerId,
      target,
      startX: event.clientX,
      startY: event.clientY,
      startSize: sizesRef.current[kind],
    };
    setResizeKind(kind);
    target.setPointerCapture(pointerId);

    const move = (nativeEvent: PointerEvent) => {
      const session = resizeRef.current;
      if (!session || session.pointerId !== nativeEvent.pointerId) return;
      nativeEvent.preventDefault();
      applyResize(nativeEvent.clientX, nativeEvent.clientY);
    };
    const finish = (nativeEvent: PointerEvent) => {
      const session = resizeRef.current;
      if (!session || session.pointerId !== nativeEvent.pointerId) return;
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
      finishResize();
    };

    target.addEventListener("pointermove", move, { passive: false });
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  }, [applyResize, finishResize]);

  const beginMouseResize = useCallback((kind: ResizeKind, event: ReactMouseEvent<HTMLElement>) => {
    if (resizeRef.current) return;
    event.preventDefault();
    const target = event.currentTarget;
    resizeRef.current = {
      kind,
      pointerId: -1,
      target,
      startX: event.clientX,
      startY: event.clientY,
      startSize: sizesRef.current[kind],
    };
    setResizeKind(kind);

    const move = (nativeEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      nativeEvent.preventDefault();
      applyResize(nativeEvent.clientX, nativeEvent.clientY);
    };
    const finish = () => {
      target.removeEventListener("mousemove", move);
      target.removeEventListener("mouseup", finish);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", finish);
      finishResize();
    };

    target.addEventListener("mousemove", move, { passive: false });
    target.addEventListener("mouseup", finish);
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", finish);
  }, [applyResize, finishResize]);

  const resizeClass = resizeKind ? ` root-resizing root-resizing-${resizeKind === "panel" ? "row" : "column"}` : "";

  return (
    <WorkbenchRuntimeContext.Provider value={runtime}>
      <div
        className={`workbench-shell${visibility.primary ? "" : " primary-collapsed"}${visibility.secondary ? "" : " secondary-collapsed"}${visibility.panel ? "" : " panel-collapsed"}${resizeClass}`}
        style={shellStyle}
      >
        <header className="workbench-header">
          <div className="workspace-identity">
            <button type="button" className="workspace-repository-button" onClick={() => workspace.setDialogOpen(true)}>
              <GitBranch size={13} />
              <strong>{workspace.workspace?.repository.fullName || "Open Repository"}</strong>
            </button>
            {workspace.workspace ? (
              <select
                className="workspace-ref-select"
                value={workspace.workspace.ref}
                onChange={(event) => void workspace.switchRef(event.target.value)}
                aria-label="Repository ref"
              >
                {!workspace.refs.some((ref) => ref.name === workspace.workspace?.ref) && (
                  <option value={workspace.workspace.ref}>{workspace.workspace.ref}</option>
                )}
                {workspace.refs.map((ref) => (
                  <option key={`${ref.kind}:${ref.name}`} value={ref.name}>
                    {ref.kind === "tag" ? "tag: " : ""}{ref.name}
                  </option>
                ))}
              </select>
            ) : <span className="workspace-ref">ref —</span>}
          </div>
          <Omnibar ref={omnibarRef} />
          <div className="shell-actions">
            <button
              type="button"
              className="account-placeholder"
              onClick={() => workspace.user ? workspace.signOut() : workspace.setDialogOpen(true)}
              title={workspace.user ? "Sign out" : "Sign in with GitHub"}
            >
              {workspace.user ? <img src={workspace.user.avatar_url} alt="" /> : <UserRound size={14} />}
              <span>{workspace.user?.login || "Sign in"}</span>
            </button>
          </div>
        </header>
        <div className="workbench-center">
          <aside className="root-surface root-primary"><WorkbenchSurfaceView surface="primary" restoredLayout={initial.surfaces.primary.layout} defaultTabs={defaults.primary} onReady={registerSurface} onActiveTabChange={handleActiveTabChange} /></aside>
          <hr
            className="root-resizer root-resizer-column root-resizer-primary"
            aria-label="Resize Primary Sidebar"
            aria-orientation="vertical"
            aria-valuenow={Math.round(effective.primary)}
            onPointerDown={(event) => beginResize("primary", event)}
            onMouseDown={(event) => beginMouseResize("primary", event)}
          />
          <main className="root-surface root-main"><WorkbenchSurfaceView surface="main" restoredLayout={initial.surfaces.main.layout} defaultTabs={defaults.main} onReady={registerSurface} onActiveTabChange={handleActiveTabChange} /></main>
          <hr
            className="root-resizer root-resizer-column root-resizer-secondary"
            aria-label="Resize Secondary Sidebar"
            aria-orientation="vertical"
            aria-valuenow={Math.round(effective.secondary)}
            onPointerDown={(event) => beginResize("secondary", event)}
            onMouseDown={(event) => beginMouseResize("secondary", event)}
          />
          <aside className="root-surface root-secondary"><WorkbenchSurfaceView surface="secondary" restoredLayout={initial.surfaces.secondary.layout} defaultTabs={defaults.secondary} onReady={registerSurface} onActiveTabChange={handleActiveTabChange} /></aside>
        </div>
        <hr
          className="root-resizer root-resizer-row root-resizer-panel"
          aria-label="Resize Panel"
          aria-orientation="horizontal"
          aria-valuenow={Math.round(effective.panel)}
          onPointerDown={(event) => beginResize("panel", event)}
          onMouseDown={(event) => beginMouseResize("panel", event)}
        />
        <section className="root-surface root-panel"><WorkbenchSurfaceView surface="panel" restoredLayout={initial.surfaces.panel.layout} defaultTabs={defaults.panel} onReady={registerSurface} onActiveTabChange={handleActiveTabChange} /></section>
        <footer className="workbench-statusbar">
          <span className="workbench-status-workspace">
            {workspace.workspace
              ? [
                  `${workspace.workspace.repository.fullName}@${workspace.workspace.ref}`,
                  `${workspace.overlays.length} change${workspace.overlays.length === 1 ? "" : "s"}`,
                  workspace.commits.length ? `${workspace.commits.length} outgoing` : "",
                  workspace.remoteHeadSha && workspace.remoteHeadSha !== workspace.workspace.baseSha ? "remote moved" : "",
                ].filter(Boolean).join(" · ")
              : "Workbench"}
          </span>
          <span className="workbench-status-context" title={activeStatusLabel(activeTab)}>
            {activeStatusLabel(activeTab)}
          </span>
          <div className="workbench-status-layout">
            <button type="button" aria-pressed={visibility.primary} onClick={() => toggleSurface("primary")} title="Toggle Primary Sidebar (Cmd/Ctrl+B)"><PanelLeft size={13} /></button>
            <button type="button" aria-pressed={visibility.panel} onClick={() => toggleSurface("panel")} title="Toggle Panel (Cmd/Ctrl+J)"><PanelBottom size={13} /></button>
            <button type="button" aria-pressed={visibility.secondary} onClick={() => toggleSurface("secondary")} title="Toggle Secondary Sidebar (Cmd+Option/Ctrl+Alt+B)"><PanelRight size={13} /></button>
          </div>
        </footer>
      </div>
    </WorkbenchRuntimeContext.Provider>
  );
}
