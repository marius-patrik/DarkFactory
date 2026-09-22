import { useCallback, useState } from "react";

export type AppearanceMode = "light" | "dark" | "oled";

export type WorkbenchSettings = {
  theme: AppearanceMode;
};

const THEME_KEY = "workbench-theme";

function defaultTheme(): AppearanceMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "light" || stored === "dark" || stored === "oled") return stored;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function useWorkbenchSettings() {
  const [settings, setSettings] = useState<WorkbenchSettings>(() => ({ theme: defaultTheme() }));

  const setSetting = useCallback(
    <K extends keyof WorkbenchSettings>(key: K, value: WorkbenchSettings[K]) => {
      setSettings((current) => ({ ...current, [key]: value }));
      if (key === "theme") localStorage.setItem(THEME_KEY, String(value));
    },
    [],
  );

  return { settings, setSetting };
}
