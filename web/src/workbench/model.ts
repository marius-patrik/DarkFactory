export type WorkbenchSurface = "primary" | "main" | "secondary" | "panel";

export type WorkbenchTabType =
  | "editor"
  | "browser"
  | "explorer"
  | "source-control"
  | "search"
  | "problems"
  | "output"
  | "settings"
  | "document"
  | "diff"
  | "issues"
  | "issue"
  | "pull-requests"
  | "pull-request"
  | "projects"
  | "project"
  | "actions"
  | "workflow-run"
  | "releases"
  | "release"
  | "branches"
  | "commits"
  | "commit";

export type SerializableTabState = Record<string, unknown>;

export type WorkbenchTab = {
  id: string;
  type: WorkbenchTabType;
  title: string;
  icon?: string;
  resource?: string;
  pinned: boolean;
  state: SerializableTabState;
};

export type WorkbenchSurfaceState = {
  visible: boolean;
  layout: unknown | null;
};

export type PersistedWorkbench = {
  version: 1;
  theme: "light" | "dark" | "oled";
  surfaces: Record<WorkbenchSurface, WorkbenchSurfaceState>;
};

export type SplitDirection = "right" | "below";

export const SURFACE_LABELS: Record<WorkbenchSurface, string> = {
  primary: "Primary Sidebar",
  main: "Main",
  secondary: "Secondary Sidebar",
  panel: "Panel",
};
