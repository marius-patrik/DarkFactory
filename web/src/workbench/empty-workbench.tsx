import { useWorkspace } from "@/workspace/context";
import { LAUNCHER_ENTRIES } from "./launcher";
import { useWorkbenchRuntime } from "./runtime";

export function EmptyWorkbench() {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  return (
    <div className="empty-workbench">
      <div className="empty-workbench-card">
        <section>
          <h2>Workspace</h2>
          <button type="button" onClick={() => workspace.setDialogOpen(true)}>Open GitHub Repository</button>
          <button type="button" onClick={() => workspace.setDialogOpen(true)}>Open Repository URL</button>
          <button type="button" disabled={workspace.recent.length === 0} onClick={() => workspace.setDialogOpen(true)}>Recent Workspaces</button>
        </section>
        <section>
          <h2>Tabs</h2>
          <div className="empty-tab-grid">
            {LAUNCHER_ENTRIES.filter((entry) => entry.type).map((entry) => (
              <button key={entry.label} type="button" onClick={() => { if (entry.type) runtime.openTab(entry.type, "main"); }}>{entry.label}</button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
