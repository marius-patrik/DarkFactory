import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type MutableRefObject,
} from "react";
import { DockviewReact, themeAbyss, themeLight } from "dockview-react";

export type WorkspacePaneKind = "final" | "review" | "raw";
export type WorkspaceSplitDirection = "right" | "below";

export type WorkspacePane = {
  id: string;
  title: string;
  kind: WorkspacePaneKind;
  src: string;
  file: string;
  format: "pdf" | "markdown" | "html";
};

export type ReviewWorkspaceControl = {
  sendActive: (command: string, payload?: Record<string, unknown>) => void;
  sendAll: (
    command: string,
    payload?: Record<string, unknown>,
    except?: MessageEventSource | null,
  ) => void;
  isActiveSource: (source: MessageEventSource | null) => boolean;
  splitActive: (direction: WorkspaceSplitDirection) => void;
  reset: (direction?: WorkspaceSplitDirection) => void;
  updateActive: (pane: WorkspacePane) => void;
};

type ReviewWorkspaceProps = {
  panes: WorkspacePane[];
  initialDirection: WorkspaceSplitDirection;
  theme: "light" | "dark" | "oled";
  refreshRevision: number;
  onActiveChange: (pane: WorkspacePane | null) => void;
};

type FrameRegistry = MutableRefObject<Map<string, HTMLIFrameElement>>;

function refreshedSource(src: string, revision: number) {
  if (!revision) return src;
  const separator = src.includes("?") ? "&" : "?";
  return src + separator + "refresh=" + encodeURIComponent(String(revision));
}

function ArtifactPane({
  props,
  frames,
  theme,
  refreshRevision,
}: {
  props: any;
  frames: FrameRegistry;
  theme: ReviewWorkspaceProps["theme"];
  refreshRevision: number;
}) {
  const pane = props.params as WorkspacePane;
  const panelId = String(props.api?.id || pane.id);

  useEffect(
    () => () => {
      frames.current.delete(panelId);
    },
    [frames, panelId],
  );

  return (
    <iframe
      className="workspace-frame"
      ref={(node) => {
        if (node) frames.current.set(panelId, node);
        else frames.current.delete(panelId);
      }}
      title={pane.title}
      src={refreshedSource(pane.src, refreshRevision)}
      onLoad={(event) => {
        event.currentTarget.contentWindow?.postMessage(
          { source: "paper-split", command: "theme", theme },
          "*",
        );
      }}
    />
  );
}

export const ReviewWorkspace = forwardRef<ReviewWorkspaceControl, ReviewWorkspaceProps>(
  function ReviewWorkspace(
    { panes, initialDirection, theme, refreshRevision, onActiveChange },
    ref,
  ) {
    const apiRef = useRef<any>(null);
    const frames = useRef<Map<string, HTMLIFrameElement>>(new Map());
    const activePanelId = useRef<string | null>(null);
    const copyIndex = useRef(0);
    const persistenceKey = "paper-viewer-workspace-layout";

    const paneById = useMemo(
      () => new Map(panes.map((pane) => [pane.id, pane])),
      [panes],
    );

    const resolvePane = useCallback((panel: any): WorkspacePane | null => {
      const params = panel?.api?.getParameters?.() ?? panel?.params;
      return params && typeof params.src === "string" ? (params as WorkspacePane) : null;
    }, []);

    const emitActive = useCallback(
      (panel: any) => {
        activePanelId.current = panel?.id || null;
        onActiveChange(resolvePane(panel));
      },
      [onActiveChange, resolvePane],
    );

    const addDefaultPanels = useCallback(
      (api: any, direction: WorkspaceSplitDirection = initialDirection) => {
        api.clear?.();
        const first = panes[0];
        if (!first) return;
        const firstPanel = api.addPanel({
          id: first.id,
          component: "artifact",
          title: first.title,
          params: first,
          renderer: "always",
        });
        const second = panes[1];
        if (second) {
          api.addPanel({
            id: second.id,
            component: "artifact",
            title: second.title,
            params: second,
            renderer: "always",
            position: {
              referencePanel: firstPanel,
              direction,
            },
          });
        }
        firstPanel.api?.setActive?.();
        emitActive(firstPanel);
      },
      [emitActive, initialDirection, panes],
    );

    const components = useMemo(
      () => ({
        artifact: (props: any) => (
          <ArtifactPane
            props={props}
            frames={frames}
            theme={theme}
            refreshRevision={refreshRevision}
          />
        ),
      }),
      [refreshRevision, theme],
    );

    const dockTheme = useMemo(
      () => ({
        ...(theme === "light" ? themeLight : themeAbyss),
        tabAnimation: "smooth" as const,
      }),
      [theme],
    );

    useEffect(() => {
      const api = apiRef.current;
      if (!api) return;
      for (const pane of panes) {
        const panel = api.getPanel?.(pane.id);
        if (panel) {
          panel.api?.updateParameters?.(pane);
          panel.api?.setTitle?.(pane.title);
        }
      }
      const active = activePanelId.current ? api.getPanel?.(activePanelId.current) : api.activePanel;
      if (active) emitActive(active);
    }, [emitActive, panes]);

    useEffect(() => {
      for (const frame of frames.current.values()) {
        frame.contentWindow?.postMessage(
          { source: "paper-split", command: "theme", theme },
          "*",
        );
      }
    }, [theme]);

    useImperativeHandle(
      ref,
      () => ({
        sendActive(command, payload = {}) {
          const frame = activePanelId.current
            ? frames.current.get(activePanelId.current)
            : undefined;
          frame?.contentWindow?.postMessage({ source: "paper-split", command, ...payload }, "*");
        },
        sendAll(command, payload = {}, except = null) {
          for (const frame of frames.current.values()) {
            if (!frame.contentWindow || frame.contentWindow === except) continue;
            frame.contentWindow.postMessage({ source: "paper-split", command, ...payload }, "*");
          }
        },
        isActiveSource(source) {
          if (!source || !activePanelId.current) return false;
          return frames.current.get(activePanelId.current)?.contentWindow === source;
        },
        splitActive(direction) {
          const api = apiRef.current;
          const active = activePanelId.current ? api?.getPanel?.(activePanelId.current) : null;
          const pane = resolvePane(active);
          if (!api || !active || !pane) return;
          copyIndex.current += 1;
          const id = pane.id + "-split-" + copyIndex.current;
          const clone = { ...pane, id, title: pane.title };
          const panel = api.addPanel({
            id,
            component: "artifact",
            title: clone.title,
            params: clone,
            renderer: "always",
            position: { referencePanel: active, direction },
          });
          panel.api?.setActive?.();
        },
        reset(direction = initialDirection) {
          const api = apiRef.current;
          if (api) addDefaultPanels(api, direction);
        },
        updateActive(pane) {
          const api = apiRef.current;
          const active = activePanelId.current ? api?.getPanel?.(activePanelId.current) : null;
          if (!active) return;
          active.api?.updateParameters?.({ ...pane, id: active.id });
          active.api?.setTitle?.(pane.title);
          emitActive(active);
        },
      }),
      [addDefaultPanels, emitActive, initialDirection, resolvePane],
    );

    return (
      <div className="review-workspace">
        <DockviewReact
          className="review-dockview"
          theme={dockTheme}
          components={components}
          defaultRenderer="always"
          onReady={(event: any) => {
            const api = event.api;
            apiRef.current = api;

            let restored = false;
            const saved = localStorage.getItem(persistenceKey);
            if (saved) {
              try {
                api.fromJSON(JSON.parse(saved));
                restored = api.panels?.length > 0;
              } catch {
                localStorage.removeItem(persistenceKey);
              }
            }

            if (!restored) addDefaultPanels(api);

            for (const pane of panes) {
              const panel = api.getPanel?.(pane.id);
              if (panel) {
                panel.api?.updateParameters?.(pane);
                panel.api?.setTitle?.(pane.title);
              }
            }

            emitActive(api.activePanel || api.panels?.[0]);

            api.onDidActivePanelChange?.((change: any) => {
              emitActive(change?.panel);
            });
            api.onDidLayoutChange?.(() => {
              try {
                localStorage.setItem(persistenceKey, JSON.stringify(api.toJSON()));
              } catch {
                // Layout persistence is an enhancement; a storage failure must not break viewing.
              }
            });
          }}
        />
      </div>
    );
  },
);
