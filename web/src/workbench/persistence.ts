import type { AppearanceMode } from "@/settings";
import type { PersistedWorkbench, WorkbenchSurface } from "./model";

const STORAGE_KEY = "workbench-layout-v1";

const DEFAULT_VISIBILITY: Record<WorkbenchSurface, boolean> = {
  primary: true,
  main: true,
  secondary: false,
  panel: true,
};

export function emptyPersistedWorkbench(theme: AppearanceMode): PersistedWorkbench {
  return {
    version: 1,
    theme,
    surfaces: {
      primary: { visible: true, layout: null },
      main: { visible: true, layout: null },
      secondary: { visible: false, layout: null },
      panel: { visible: true, layout: null },
    },
  };
}

export function loadWorkbench(theme: AppearanceMode): PersistedWorkbench {
  const fallback = emptyPersistedWorkbench(theme);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PersistedWorkbench>;
    if (parsed.version !== 1 || !parsed.surfaces || typeof parsed.surfaces !== "object") {
      localStorage.removeItem(STORAGE_KEY);
      return fallback;
    }
    const surfaces = { ...fallback.surfaces };
    for (const surface of Object.keys(surfaces) as WorkbenchSurface[]) {
      const candidate = parsed.surfaces[surface];
      if (!candidate || typeof candidate !== "object") continue;
      surfaces[surface] = {
        visible: surface === "main" ? true : candidate.visible ?? DEFAULT_VISIBILITY[surface],
        layout: candidate.layout ?? null,
      };
    }
    return {
      version: 1,
      theme: parsed.theme === "light" || parsed.theme === "dark" || parsed.theme === "oled" ? parsed.theme : theme,
      surfaces,
    };
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return fallback;
  }
}

export function saveWorkbench(state: PersistedWorkbench) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Layout persistence must not make the workbench unusable.
  }
}
