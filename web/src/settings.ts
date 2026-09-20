import { useCallback, useState } from "react";
import type { SidebarMode, SidebarSide } from "./pdf-document";

export type AppearanceMode = "light" | "dark" | "oled";
export type ActivityPanel = "structure" | "explorer" | null;
export type ActiveActivityPanel = Exclude<ActivityPanel, null>;
export type ActivityBarPosition = "left" | "right" | "top" | "bottom";

export type ViewerSettings = {
  theme: AppearanceMode;
  sidebarSide: SidebarSide;
  sidebarWidth: number;
  sidebarMode: SidebarMode;
  activityBarPosition: ActivityBarPosition;
  activityPanel: ActivityPanel;
  splitSyncScroll: boolean;
  showRefresh: boolean;
  showFullscreen: boolean;
};

const STORAGE_PREFIX = "paper-viewer-";

const storageKeys: { [K in keyof ViewerSettings]: string } = {
  theme: STORAGE_PREFIX + "theme",
  sidebarSide: STORAGE_PREFIX + "sidebar-side",
  sidebarWidth: STORAGE_PREFIX + "sidebar-width",
  sidebarMode: STORAGE_PREFIX + "sidebar-mode",
  activityBarPosition: STORAGE_PREFIX + "activitybar-position",
  activityPanel: STORAGE_PREFIX + "activity-panel",
  splitSyncScroll: STORAGE_PREFIX + "sync-scroll",
  showRefresh: STORAGE_PREFIX + "show-refresh",
  showFullscreen: STORAGE_PREFIX + "show-fullscreen",
};

export function clampSidebarWidth(value: number) {
  return Math.max(190, Math.min(640, Math.round(value)));
}

function loadSettings(): ViewerSettings {
  const storedTheme = localStorage.getItem(storageKeys.theme);
  const theme: AppearanceMode =
    storedTheme === "light" || storedTheme === "dark" || storedTheme === "oled"
      ? storedTheme
      : window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light"
        : "dark";

  const storedWidth = Number(localStorage.getItem(storageKeys.sidebarWidth));
  const storedActivityPanel = localStorage.getItem(storageKeys.activityPanel);
  const storedPosition = localStorage.getItem(storageKeys.activityBarPosition);

  return {
    theme,
    sidebarSide: localStorage.getItem(storageKeys.sidebarSide) === "right" ? "right" : "left",
    sidebarWidth: clampSidebarWidth(
      Number.isFinite(storedWidth) && storedWidth > 0 ? storedWidth : 300,
    ),
    sidebarMode:
      localStorage.getItem(storageKeys.sidebarMode) === "minimap" ? "minimap" : "thumbnails",
    activityBarPosition:
      storedPosition === "right" || storedPosition === "top" || storedPosition === "bottom"
        ? storedPosition
        : "left",
    activityPanel:
      window.innerWidth <= 760 || storedActivityPanel === "closed"
        ? null
        : storedActivityPanel === "explorer"
          ? "explorer"
          : "structure",
    splitSyncScroll: localStorage.getItem(storageKeys.splitSyncScroll) === "true",
    showRefresh: localStorage.getItem(storageKeys.showRefresh) !== "false",
    showFullscreen: localStorage.getItem(storageKeys.showFullscreen) !== "false",
  };
}

function persistSetting<K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) {
  const storageKey = storageKeys[key];
  if (key === "activityPanel") {
    localStorage.setItem(storageKey, value === null ? "closed" : String(value));
    return;
  }
  localStorage.setItem(storageKey, String(value));
}

export function useViewerSettings() {
  const [settings, setSettings] = useState<ViewerSettings>(loadSettings);

  const setSetting = useCallback(
    <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      persistSetting(key, value);
    },
    [],
  );

  const patchSettings = useCallback((patch: Partial<ViewerSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
    for (const [key, value] of Object.entries(patch)) {
      persistSetting(key as keyof ViewerSettings, value as never);
    }
  }, []);

  return { settings, setSetting, patchSettings };
}
