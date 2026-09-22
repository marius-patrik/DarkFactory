import { useWorkspace } from "@/workspace/context";
import {
  LAUNCHER_ENTRIES,
  launcherEntryDisabled,
  runLauncherEntry,
} from "./launcher";
import { useWorkbenchRuntime } from "./runtime";

const ACTIVE_WORKSPACE_TABS = new Set([
  "Explorer",
  "Source Control",
  "Browser",
  "Issues",
  "Pull Requests",
  "Actions",
  "Settings",
]);

export function EmptyWorkbench() {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();

  const run = (label: string) => {
    const entry = LAUNCHER_ENTRIES.find((candidate) => candidate.label === label);
    if (!entry) return;
    void runLauncherEntry(entry, "main", runtime, workspace).catch((reason) => {
      window.alert(reason instanceof Error ? reason.message : String(reason));
    });
  };

  const tabs = workspace.workspace
    ? LAUNCHER_ENTRIES.filter(
        (entry) => entry.type && ACTIVE_WORKSPACE_TABS.has(entry.label),
      )
    : LAUNCHER_ENTRIES.filter((entry) => entry.type);

  return (
    <div className="empty-workbench">
      <div className="empty-workbench-card">
        <section>
          <h2>{workspace.workspace?.repository.fullName || "Workspace"}</h2>
          {workspace.workspace ? (
            <>
              <button type="button" onClick={() => run("Open File")}>Open File</button>
              <button type="button" onClick={() => run("New File")}>New File</button>
              <button type="button" onClick={() => run("Switch Workspace")}>
                Switch Workspace
              </button>
              <button
                type="button"
                disabled={workspace.recent.length === 0}
                onClick={() => run("Recent Workspaces")}
              >
                Recent Workspaces
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => run("Open Repository")}>
                Open GitHub Repository
              </button>
              <button type="button" onClick={() => run("Open Repository")}>
                Open Repository URL
              </button>
              <button
                type="button"
                disabled={workspace.recent.length === 0}
                onClick={() => run("Recent Workspaces")}
              >
                Recent Workspaces
              </button>
            </>
          )}
        </section>
        <section>
          <h2>Tabs</h2>
          <div className="empty-tab-grid">
            {tabs.map((entry) => (
              <button
                key={entry.label}
                type="button"
                disabled={launcherEntryDisabled(entry, workspace)}
                onClick={() => {
                  void runLauncherEntry(entry, "main", runtime, workspace).catch((reason) => {
                    window.alert(reason instanceof Error ? reason.message : String(reason));
                  });
                }}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
