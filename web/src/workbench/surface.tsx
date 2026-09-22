import { useMemo, useRef, useState } from "react";
import {
  DockviewDefaultTab,
  DockviewReact,
  themeAbyss,
  themeLight,
  type ContextMenuItem,
} from "dockview-react";
import { EmptyWorkbench } from "./empty-workbench";
import { LauncherButton } from "./launcher";
import type { WorkbenchSurface, WorkbenchTab } from "./model";
import { WorkbenchPanel } from "./registry";
import { useWorkbenchRuntime } from "./runtime";

function paramsOf(panel: any): WorkbenchTab | null {
  const params = panel?.api?.getParameters?.() ?? panel?.params;
  return params && typeof params.id === "string" && typeof params.type === "string"
    ? params as WorkbenchTab
    : null;
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

  const components = useMemo(() => ({ workbench: (props: any) => <WorkbenchPanel props={props} /> }), []);
  const tabComponents = useMemo(() => ({
    workbenchTab: (props: any) => {
      const tab = props.params as WorkbenchTab;
      return <DockviewDefaultTab {...props} hideClose={Boolean(tab?.pinned)} />;
    },
  }), []);
  const HeaderActions = useMemo(() => () => <LauncherButton surface={surface} />, [surface]);
  const dockTheme = runtime.settings.theme === "light" ? themeLight : themeAbyss;

  const tabContextMenuItems = (params: any): ContextMenuItem[] => {
    const tab = paramsOf(params.panel);
    if (!tab) return [];

    const groupPanels = (params.api?.panels ?? []).filter(
      (candidate: any) => candidate.api?.group?.id === params.group?.id,
    );
    const hasProtectedPeer = groupPanels.some((candidate: any) => {
      if (candidate.id === params.panel.id) return false;
      return paramsOf(candidate)?.pinned === true;
    });

    const items: ContextMenuItem[] = [
      {
        label: tab.pinned ? "Unpin" : "Pin",
        action: () => runtimeRef.current.setPinned(tab.id, !tab.pinned),
      },
      "separator",
    ];

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

  return (
    <div className={`workbench-surface workbench-surface-${surface}`}>
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
      {surface === "main" && panelCount === 0 && <EmptyWorkbench />}
    </div>
  );
}
