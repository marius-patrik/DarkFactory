import type { SidebarMode, SidebarSide } from "./pdf-document";
import {
  type ActivityBarPosition,
  type AppearanceMode,
  type ViewerSettings,
} from "./settings";
import { AnimatedIcon } from "@/components/animated-icon";

export function SettingsView({
  settings,
  onChange,
}: {
  settings: ViewerSettings;
  onChange: <K extends keyof ViewerSettings>(key: K, value: ViewerSettings[K]) => void;
}) {
  return (
    <section className="settings-view" aria-label="Viewer settings">
      <header className="settings-heading">
        <AnimatedIcon names={["SettingsIcon"]} />
        <span>Settings</span>
      </header>
      <div className="settings-grid">
        <label>
          <span>Appearance</span>
          <select
            value={settings.theme}
            onChange={(event) => onChange("theme", event.target.value as AppearanceMode)}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="oled">OLED</option>
          </select>
        </label>
        <label>
          <span>Activity bar</span>
          <select
            value={settings.activityBarPosition}
            onChange={(event) =>
              onChange("activityBarPosition", event.target.value as ActivityBarPosition)
            }
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="top">Top</option>
            <option value="bottom">Bottom</option>
          </select>
        </label>
        <label>
          <span>Sidebar</span>
          <select
            value={settings.sidebarSide}
            onChange={(event) => onChange("sidebarSide", event.target.value as SidebarSide)}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label>
          <span>Page navigator</span>
          <select
            value={settings.sidebarMode}
            onChange={(event) => onChange("sidebarMode", event.target.value as SidebarMode)}
          >
            <option value="thumbnails">Thumbnails</option>
            <option value="minimap">Minimap</option>
          </select>
        </label>
        <label className="settings-toggle">
          <span>Refresh button</span>
          <input
            type="checkbox"
            checked={settings.showRefresh}
            onChange={(event) => onChange("showRefresh", event.target.checked)}
          />
        </label>
        <label className="settings-toggle">
          <span>Fullscreen button</span>
          <input
            type="checkbox"
            checked={settings.showFullscreen}
            onChange={(event) => onChange("showFullscreen", event.target.checked)}
          />
        </label>
        <label className="settings-toggle">
          <span>Synchronize split scrolling</span>
          <input
            type="checkbox"
            checked={settings.splitSyncScroll}
            onChange={(event) => onChange("splitSyncScroll", event.target.checked)}
          />
        </label>
      </div>
    </section>
  );
}
