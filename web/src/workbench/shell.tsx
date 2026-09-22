import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GitBranch, PanelBottom, PanelLeft, PanelRight, UserRound } from "lucide-react";
import { useWorkbenchSettings, type AppearanceMode } from "@/settings";
import { useWorkspace } from "@/workspace/context";
import { useWorkbenchShortcuts } from "./commands";
import type { PersistedWorkbench, SplitDirection, WorkbenchSurface, WorkbenchTab, WorkbenchTabType } from "./model";
import { createWorkbenchTab, tabDefinition } from "./registry";
import { loadWorkbench, saveWorkbench } from "./persistence";
import { Omnibar, type OmnibarControl } from "./omnibar";
import { WorkbenchRuntimeContext, type WorkbenchRuntime } from "./runtime";
import { WorkbenchSurfaceView } from "./surface";

const SURFACES: WorkbenchSurface[] = ["primary", "main", "secondary", "panel"];

function paramsOf(panel: any): WorkbenchTab | null {
  const params = panel?.api?.getParameters?.() ?? panel?.params;
  return params && typeof params.id === "string" && typeof params.type === "string" ? params as WorkbenchTab : null;
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
  const apis = useRef(new Map<WorkbenchSurface, any>());
  const omnibarRef = useRef<OmnibarControl>(null);

  const persist = useCallback((theme: AppearanceMode = settings.theme, nextVisibility = visibility) => {
    const state: PersistedWorkbench = {
      version: 1,
      theme,
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

  const registerSurface = useCallback((surface: WorkbenchSurface, api: any) => {
    apis.current.set(surface, api);
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

  const moveTab = useCallback((id: string, target: WorkbenchSurface) => {
    const found = locate(id);
    const targetApi = apis.current.get(target);
    const tab = found ? paramsOf(found.panel) : null;
    if (!found || !targetApi || !tab) return;
    if (found.surface === target) { found.panel.api?.setActive?.(); return; }
    found.api.removePanel(found.panel);
    if (target !== "main") setSurfaceVisible(target, true);
    const panel = targetApi.addPanel({ id: tab.id, component: "workbench", tabComponent: "workbenchTab", title: tab.title, params: tab, renderer: "always" });
    panel.api?.setActive?.();
    persist();
  }, [locate, persist, setSurfaceVisible]);

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
    found.panel.api?.updateParameters?.({ ...tab, state: { ...tab.state, ...patch } });
    persist();
  }, [locate, persist]);

  const setTheme = useCallback((theme: AppearanceMode) => {
    setSetting("theme", theme);
    persist(theme);
  }, [persist, setSetting]);

  const runtime = useMemo<WorkbenchRuntime>(() => ({
    settings,
    setTheme,
    openTab,
    moveTab,
    splitTab,
    closeTab,
    setPinned,
    updateTabState,
    toggleSurface,
    setSurfaceVisible,
    layoutChanged: () => persist(),
    getTab,
  }), [settings, setTheme, openTab, moveTab, splitTab, closeTab, setPinned, updateTabState, toggleSurface, setSurfaceVisible, persist, getTab]);

  const shortcutHandlers = useMemo(() => ({
    togglePrimary: () => toggleSurface("primary"),
    toggleSecondary: () => toggleSurface("secondary"),
    togglePanel: () => toggleSurface("panel"),
    focusNavigation: () => omnibarRef.current?.focus("navigation"),
    focusCommands: () => omnibarRef.current?.focus("command"),
  }), [toggleSurface]);
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

  return (
    <WorkbenchRuntimeContext.Provider value={runtime}>
      <div className={`workbench-shell${visibility.primary ? "" : " primary-collapsed"}${visibility.secondary ? "" : " secondary-collapsed"}${visibility.panel ? "" : " panel-collapsed"}`}>
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
              title={workspace.user ? "Sign out" : "Connect GitHub account"}
            >
              {workspace.user ? <img src={workspace.user.avatar_url} alt="" /> : <UserRound size={14} />}
              <span>{workspace.user?.login || "Sign in"}</span>
            </button>
          </div>
        </header>
        <div className="workbench-center">
          <aside className="root-surface root-primary"><WorkbenchSurfaceView surface="primary" restoredLayout={initial.surfaces.primary.layout} defaultTabs={defaults.primary} onReady={registerSurface} /></aside>
          <main className="root-surface root-main"><WorkbenchSurfaceView surface="main" restoredLayout={initial.surfaces.main.layout} defaultTabs={defaults.main} onReady={registerSurface} /></main>
          <aside className="root-surface root-secondary"><WorkbenchSurfaceView surface="secondary" restoredLayout={initial.surfaces.secondary.layout} defaultTabs={defaults.secondary} onReady={registerSurface} /></aside>
        </div>
        <section className="root-surface root-panel"><WorkbenchSurfaceView surface="panel" restoredLayout={initial.surfaces.panel.layout} defaultTabs={defaults.panel} onReady={registerSurface} /></section>
        <footer className="workbench-statusbar">
          <span>{workspace.workspace ? `${workspace.workspace.repository.fullName} · ${workspace.overlays.length} local change${workspace.overlays.length === 1 ? "" : "s"}` : "Workbench"}</span>
          <div>
            <button type="button" aria-pressed={visibility.primary} onClick={() => toggleSurface("primary")} title="Toggle Primary Sidebar (Cmd/Ctrl+B)"><PanelLeft size={13} /></button>
            <button type="button" aria-pressed={visibility.panel} onClick={() => toggleSurface("panel")} title="Toggle Panel (Cmd/Ctrl+J)"><PanelBottom size={13} /></button>
            <button type="button" aria-pressed={visibility.secondary} onClick={() => toggleSurface("secondary")} title="Toggle Secondary Sidebar (Cmd+Option/Ctrl+Alt+B)"><PanelRight size={13} /></button>
          </div>
        </footer>
      </div>
    </WorkbenchRuntimeContext.Provider>
  );
}
