import { useEffect, useMemo, useRef, useState } from "react";
import {
  DockviewDefaultTab,
  DockviewReact,
  themeAbyss,
  themeLight,
  type BuiltInContextMenuItem,
  type GetTabContextMenuItemsParams,
  type ReactContextMenuItemConfig,
} from "dockview-react";
import { EmptyWorkbench } from "./empty-workbench";
import { LauncherButton } from "./launcher";
import type { WorkbenchDropTarget, WorkbenchSurface, WorkbenchTab } from "./model";
import { WorkbenchPanel } from "./registry";
import { useWorkbenchRuntime } from "./runtime";

function paramsOf(panel: any): WorkbenchTab | null {
  const apiParams = panel?.api?.getParameters?.();
  const params =
    apiParams && typeof apiParams.id === "string" && typeof apiParams.type === "string"
      ? apiParams
      : panel?.params;
  return params && typeof params.id === "string" && typeof params.type === "string"
    ? params as WorkbenchTab
    : null;
}

const WORKBENCH_TAB_MIME = "application/x-github-workbench-tab";

type CrossSurfaceDrag = {
  id: string;
  source: WorkbenchSurface;
};

let activeCrossSurfaceDrag: CrossSurfaceDrag | null = null;

function dragPayload(event: DragEvent): CrossSurfaceDrag | null {
  const raw = event.dataTransfer?.getData(WORKBENCH_TAB_MIME);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CrossSurfaceDrag>;
    if (
      typeof parsed.id === "string" &&
      (parsed.source === "primary" || parsed.source === "main" || parsed.source === "secondary" || parsed.source === "panel")
    ) return parsed as CrossSurfaceDrag;
  } catch {
  }
  return null;
}

export function WorkbenchSurfaceView({
  surface,
  restoredLayout,
  defaultTabs,
  onReady,
  onActiveTabChange,
}: {
  surface: WorkbenchSurface;
  restoredLayout: unknown | null;
  defaultTabs: WorkbenchTab[];
  onReady: (surface: WorkbenchSurface, api: any) => void;
  onActiveTabChange: (surface: WorkbenchSurface, tab: WorkbenchTab | null) => void;
}) {
  const runtime = useWorkbenchRuntime();
  const runtimeRef = useRef(runtime);
  runtimeRef.current = runtime;
  const [panelCount, setPanelCount] = useState(0);
  const initialized = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const beginPanelDrag = (event: DragEvent) => {
      if (!(event.target instanceof Element) || !root.contains(event.target)) return;
      const tabElement = event.target.closest<HTMLElement>(".dv-tab");
      const workbenchTabElement = tabElement?.querySelector<HTMLElement>("[data-workbench-tab-id]");
      const id = tabElement?.dataset.tabPanelId || workbenchTabElement?.dataset.workbenchTabId;
      if (!id) return;
      const payload = { id, source: surface } satisfies CrossSurfaceDrag;
      activeCrossSurfaceDrag = payload;
      root.dataset.workbenchDndStage = `source:${id}`;
      document.documentElement.classList.add("workbench-tab-dragging");
      if (event.dataTransfer) {
        event.dataTransfer.setData(WORKBENCH_TAB_MIME, JSON.stringify(payload));
        event.dataTransfer.effectAllowed = "move";
      }
    };

    const destinationFor = (event: DragEvent): WorkbenchDropTarget => {
      const target = event.target instanceof Element ? event.target : null;
      const tabElement = target?.closest<HTMLElement>(".dv-tab");
      const referencePanelId =
        tabElement?.dataset.tabPanelId ||
        tabElement?.querySelector<HTMLElement>("[data-workbench-tab-id]")?.dataset.workbenchTabId;
      if (referencePanelId) {
        return { referencePanelId, direction: "within" };
      }

      const dock = root.querySelector<HTMLElement>(".workbench-dockview");
      const dockRect = dock?.getBoundingClientRect();
      const rect = dockRect && dockRect.width > 0 && dockRect.height > 0
        ? dockRect
        : root.getBoundingClientRect();
      const edgeX = Math.min(36, rect.width * 0.12);
      const edgeY = Math.min(36, rect.height * 0.12);
      let direction: WorkbenchDropTarget["direction"] = "within";
      if (event.clientX <= rect.left + edgeX) direction = "left";
      else if (event.clientX >= rect.right - edgeX) direction = "right";
      else if (event.clientY <= rect.top + edgeY) direction = "above";
      else if (event.clientY >= rect.bottom - edgeY) direction = "below";

      const activeId = Array.from(root.querySelectorAll<HTMLElement>(".dv-tab.dv-active-tab"))
        .map((element) => element.dataset.tabPanelId || element.querySelector<HTMLElement>("[data-workbench-tab-id]")?.dataset.workbenchTabId)
        .find((id): id is string => Boolean(id));
      return { referencePanelId: activeId, direction };
    };

    const isCrossRootDrag = (event: DragEvent) => {
      const payload = activeCrossSurfaceDrag ?? dragPayload(event);
      return payload && payload.source !== surface ? payload : null;
    };

    const acceptCrossRootDrag = (event: DragEvent) => {
      const payload = isCrossRootDrag(event);
      if (!payload) return;
      event.preventDefault();
      event.stopPropagation();
      root.dataset.workbenchDndStage = `accepted:${payload.id}`;
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    };

    const dropCrossRootTab = (event: DragEvent) => {
      const payload = isCrossRootDrag(event);
      if (!payload) return;
      event.preventDefault();
      event.stopPropagation();
      root.dataset.workbenchDndStage = `drop:${payload.id}`;
      const moved = runtimeRef.current.transferTab(payload.id, surface, destinationFor(event));
      root.dataset.workbenchDndStage = `${moved ? "moved" : "move-failed"}:${payload.id}`;
      activeCrossSurfaceDrag = null;
      document.documentElement.classList.remove("workbench-tab-dragging");
    };

    root.addEventListener("dragstart", beginPanelDrag, true);
    root.addEventListener("dragenter", acceptCrossRootDrag, true);
    root.addEventListener("dragover", acceptCrossRootDrag, true);
    root.addEventListener("drop", dropCrossRootTab, true);
    return () => {
      root.removeEventListener("dragstart", beginPanelDrag, true);
      root.removeEventListener("dragenter", acceptCrossRootDrag, true);
      root.removeEventListener("dragover", acceptCrossRootDrag, true);
      root.removeEventListener("drop", dropCrossRootTab, true);
    };
  }, [surface]);

  useEffect(() => {
    const clearDrag = () => {
      activeCrossSurfaceDrag = null;
      document.documentElement.classList.remove("workbench-tab-dragging");
    };
    window.addEventListener("dragend", clearDrag);
    return () => window.removeEventListener("dragend", clearDrag);
  }, []);

  const components = useMemo(() => ({ workbench: (props: any) => <WorkbenchPanel props={props} /> }), []);
  const tabComponents = useMemo(() => ({
    workbenchTab: (props: any) => {
      const tab = props.params as WorkbenchTab;
      return <DockviewDefaultTab {...props} data-workbench-tab-id={tab?.id} hideClose={Boolean(tab?.pinned)} />;
    },
  }), []);
  const HeaderActions = useMemo(() => () => <LauncherButton surface={surface} />, [surface]);
  const dockTheme = runtime.settings.theme === "light" ? themeLight : themeAbyss;

  const tabContextMenuItems = (
    params: GetTabContextMenuItemsParams,
  ): (BuiltInContextMenuItem | ReactContextMenuItemConfig)[] => {
    const tab = paramsOf(params.panel);
    if (!tab) return [];

    const groupPanels = (params.api?.panels ?? []).filter(
      (candidate: any) => candidate.api?.group?.id === params.group?.id,
    );
    const hasProtectedPeer = groupPanels.some((candidate: any) => {
      if (candidate.id === params.panel.id) return false;
      return paramsOf(candidate)?.pinned === true;
    });

    const resource =
      tab.resource ||
      (typeof tab.state.path === "string" ? tab.state.path : "") ||
      (typeof tab.state.url === "string" ? tab.state.url : "");

    const items: (BuiltInContextMenuItem | ReactContextMenuItemConfig)[] = [
      {
        label: tab.pinned ? "Unpin" : "Pin",
        action: () => runtimeRef.current.setPinned(tab.id, !tab.pinned),
      },
      {
        label: "Move to Primary Sidebar",
        action: () => runtimeRef.current.moveTab(tab.id, "primary"),
      },
      {
        label: "Move to Main",
        action: () => runtimeRef.current.moveTab(tab.id, "main"),
      },
      {
        label: "Move to Secondary Sidebar",
        action: () => runtimeRef.current.moveTab(tab.id, "secondary"),
      },
      {
        label: "Move to Panel",
        action: () => runtimeRef.current.moveTab(tab.id, "panel"),
      },
      {
        label: "Split Right",
        action: () => runtimeRef.current.splitTab(tab.id, "right"),
      },
      {
        label: "Split Down",
        action: () => runtimeRef.current.splitTab(tab.id, "below"),
      },
    ];

    if (tab.type === "editor" || tab.type === "document") {
      const renderer = tab.state.renderer === "browser" ? "browser" : "editor";
      items.push({
        label: renderer === "browser" ? "Open in Editor Renderer" : "Open in Browser Renderer",
        action: () => runtimeRef.current.updateTabState(tab.id, {
          renderer: renderer === "browser" ? "editor" : "browser",
        }),
      });
    }

    if (resource) {
      items.push({
        label: tab.type === "browser" ? "Copy URL" : "Copy Resource Path",
        action: () => {
          void navigator.clipboard.writeText(resource).catch(() => {
            window.prompt(tab.type === "browser" ? "Copy URL" : "Copy resource path", resource);
          });
        },
      });
    }

    items.push("separator");

    if (!hasProtectedPeer) {
      items.push("closeOthers", "closeRight");
    }

    items.push(
      {
        label: "Close",
        disabled: tab.pinned,
        action: () => runtimeRef.current.closeTab(tab.id),
      },
      "separator",
      "maximize",
    );
    return items;
  };

  const mainEmpty = surface === "main" && panelCount === 0;

  return (
    <div
      ref={rootRef}
      className={`workbench-surface workbench-surface-${surface}${mainEmpty ? " workbench-surface-empty" : ""}`}
      data-workbench-surface={surface}
    >
      <div className={`workbench-dockview-host${mainEmpty ? " workbench-dockview-host-empty" : ""}`}>
        <DockviewReact
          className="workbench-dockview"
        theme={{ ...dockTheme, tabAnimation: "smooth" as const }}
        components={components}
        tabComponents={tabComponents}
        defaultRenderer="always"
        rightHeaderActionsComponent={HeaderActions}
        getTabContextMenuItems={tabContextMenuItems}
        onReady={(event: any) => {
          const api = event.api;
          onReady(surface, api);

          let restored = false;
          if (restoredLayout) {
            try {
              api.fromJSON(restoredLayout);
              restored = true;
            } catch {
              restored = false;
            }
          }
          if (!restored) {
            for (const tab of defaultTabs) {
              api.addPanel({ id: tab.id, component: "workbench", tabComponent: "workbenchTab", title: tab.title, params: tab, renderer: "always" });
            }
          }
          initialized.current = true;
          setPanelCount(api.panels?.length ?? 0);
          if (surface === "main") {
            onActiveTabChange(surface, paramsOf(api.activePanel));
          }
          api.onDidActivePanelChange?.((event: any) => {
            onActiveTabChange(surface, paramsOf(event?.panel));
          });
          api.onDidLayoutChange?.(() => {
            const count = api.panels?.length ?? 0;
            setPanelCount(count);
            if (initialized.current && count === 0 && surface !== "main") runtimeRef.current.setSurfaceVisible(surface, false);
            runtimeRef.current.layoutChanged();
          });
        }}
        />
      </div>
      {mainEmpty && <EmptyWorkbench />}
    </div>
  );
}
