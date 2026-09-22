import type { AppearanceMode, WorkbenchSettings } from "./settings";

export function SettingsView({
  settings,
  onThemeChange,
}: {
  settings: WorkbenchSettings;
  onThemeChange: (theme: AppearanceMode) => void;
}) {
  return (
    <section className="workbench-settings" aria-label="Workbench settings">
      <header>
        <h2>Settings</h2>
        <p>Workbench appearance and shell preferences.</p>
      </header>
      <label className="workbench-setting-row">
        <span>
          <strong>Appearance</strong>
          <small>Applied to every workbench surface.</small>
        </span>
        <select
          value={settings.theme}
          onChange={(event) => onThemeChange(event.target.value as AppearanceMode)}
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="oled">OLED</option>
        </select>
      </label>
    </section>
  );
}
