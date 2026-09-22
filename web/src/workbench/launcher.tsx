import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { WorkbenchSurface, WorkbenchTabType } from "./model";
import { useWorkbenchRuntime, type WorkbenchRuntime } from "./runtime";

export type LauncherEntry = {
  group: "Files" | "Git" | "GitHub" | "Tools" | "Workspace";
  label: string;
  type?: WorkbenchTabType;
  action?: "new-file" | "open-file" | "diff" | "workspace" | "recent";
};

export const LAUNCHER_ENTRIES: LauncherEntry[] = [
  { group: "Files", label: "New File", action: "new-file" },
  { group: "Files", label: "Open File", action: "open-file" },
  { group: "Files", label: "Editor", type: "editor" },
  { group: "Files", label: "Explorer", type: "explorer" },
  { group: "Files", label: "Search", type: "search" },
  { group: "Git", label: "Source Control", type: "source-control" },
  { group: "Git", label: "Branches & Tags", type: "branches" },
  { group: "Git", label: "Commits", type: "commits" },
  { group: "Git", label: "Diff", action: "diff" },
  { group: "GitHub", label: "Issues", type: "issues" },
  { group: "GitHub", label: "Pull Requests", type: "pull-requests" },
  { group: "GitHub", label: "Projects", type: "projects" },
  { group: "GitHub", label: "Actions", type: "actions" },
  { group: "GitHub", label: "Releases", type: "releases" },
  { group: "Tools", label: "Browser", type: "browser" },
  { group: "Tools", label: "Problems", type: "problems" },
  { group: "Tools", label: "Output", type: "output" },
  { group: "Tools", label: "Settings", type: "settings" },
  { group: "Workspace", label: "Open Repository", action: "workspace" },
  { group: "Workspace", label: "Switch Workspace", action: "workspace" },
  { group: "Workspace", label: "Recent Workspaces", action: "recent" },
];

type WorkspaceRuntime = ReturnType<typeof useWorkspace>;

export function launcherEntryDisabled(
  entry: LauncherEntry,
  workspace: WorkspaceRuntime,
) {
  if (entry.action === "recent") return workspace.recent.length === 0;
  if (
    entry.action === "new-file" ||
    entry.action === "open-file" ||
    entry.action === "diff"
  ) {
    if (!workspace.workspace) return true;
  }
  if (entry.action === "diff") {
    return workspace.staged.length === 0 && workspace.overlays.length === 0;
  }
  return false;
}

export async function runLauncherEntry(
  entry: LauncherEntry,
  surface: WorkbenchSurface,
  runtime: WorkbenchRuntime,
  workspace: WorkspaceRuntime,
) {
  if (entry.type) {
    runtime.openTab(entry.type, surface);
    return;
  }

  if (entry.action === "workspace" || entry.action === "recent") {
    workspace.setDialogOpen(true);
    return;
  }

  if (entry.action === "open-file") {
    runtime.focusOmnibar("navigation");
    return;
  }

  if (entry.action === "new-file") {
    const path = window.prompt("New file path")?.trim();
    if (!path) return;
    await workspace.createFile(path);
    runtime.openTab("editor", "main", {
      path,
      language: languageForPath(path),
    });
    return;
  }

  if (entry.action === "diff") {
    const staged = workspace.staged[0];
    const working = workspace.overlays[0];
    const file = staged ?? working;
    if (!file) return;
    runtime.openTab("diff", "main", {
      path: file.path,
      compare: staged ? "staged" : "working",
    });
  }
}

export function LauncherButton({ surface }: { surface: WorkbenchSurface }) {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const groups = ["Files", "Git", "GitHub", "Tools", "Workspace"] as const;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="dock-launcher-button" aria-label="Open tab launcher">
          <Plus size={14} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="launcher-menu">
        {groups.map((group) => (
          <div className="launcher-group" key={group}>
            <div className="launcher-group-title">{group}</div>
            {LAUNCHER_ENTRIES.filter((entry) => entry.group === group).map((entry) => (
              <DropdownMenuItem
                key={entry.label}
                disabled={launcherEntryDisabled(entry, workspace)}
                onSelect={() => {
                  void runLauncherEntry(entry, surface, runtime, workspace).catch((reason) => {
                    window.alert(reason instanceof Error ? reason.message : String(reason));
                  });
                }}
              >
                {entry.label}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
