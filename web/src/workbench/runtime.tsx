import { createContext, useContext } from "react";
import type { AppearanceMode, WorkbenchSettings } from "@/settings";
import type { SplitDirection, WorkbenchSurface, WorkbenchTab, WorkbenchTabType } from "./model";

export type WorkbenchRuntime = {
  settings: WorkbenchSettings;
  setTheme: (theme: AppearanceMode) => void;
  openTab: (type: WorkbenchTabType, surface?: WorkbenchSurface, state?: Record<string, unknown>) => void;
  moveTab: (id: string, surface: WorkbenchSurface) => void;
  splitTab: (id: string, direction: SplitDirection) => void;
  closeTab: (id: string) => void;
  setPinned: (id: string, pinned: boolean) => void;
  updateTabState: (id: string, patch: Record<string, unknown>) => void;
  toggleSurface: (surface: Exclude<WorkbenchSurface, "main">) => void;
  setSurfaceVisible: (surface: Exclude<WorkbenchSurface, "main">, visible: boolean) => void;
  layoutChanged: () => void;
  getTab: (id: string) => WorkbenchTab | null;
};

export const WorkbenchRuntimeContext = createContext<WorkbenchRuntime | null>(null);

export function useWorkbenchRuntime() {
  const value = useContext(WorkbenchRuntimeContext);
  if (!value) throw new Error("Workbench runtime is not available");
  return value;
}
