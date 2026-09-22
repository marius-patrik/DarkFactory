import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/workspace/context";
import type { WorkbenchSurface, WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type LauncherEntry = {
  group: "Files" | "Git" | "GitHub" | "Tools" | "Workspace";
  label: string;
  type?: WorkbenchTabType;
  workspaceAction?: "open" | "recent";
};

export const LAUNCHER_ENTRIES: LauncherEntry[] = [
  { group: "Files", label: "Editor", type: "editor" },
  { group: "Files", label: "Explorer", type: "explorer" },
  { group: "Files", label: "Search", type: "search" },
  { group: "Git", label: "Source Control", type: "source-control" },
  { group: "Git", label: "Branches & Tags", type: "branches" },
  { group: "Git", label: "Commits", type: "commits" },
  { group: "GitHub", label: "Issues", type: "issues" },
  { group: "GitHub", label: "Pull Requests", type: "pull-requests" },
  { group: "GitHub", label: "Projects", type: "projects" },
  { group: "GitHub", label: "Actions", type: "actions" },
  { group: "GitHub", label: "Releases", type: "releases" },
  { group: "Tools", label: "Browser", type: "browser" },
  { group: "Tools", label: "Problems", type: "problems" },
  { group: "Tools", label: "Output", type: "output" },
  { group: "Tools", label: "Settings", type: "settings" },
  { group: "Workspace", label: "Open Repository", workspaceAction: "open" },
  { group: "Workspace", label: "Recent Workspaces", workspaceAction: "recent" },
];

export function LauncherButton({ surface }: { surface: WorkbenchSurface }) {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const groups = ["Files", "Git", "GitHub", "Tools", "Workspace"] as const;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="dock-launcher-button" aria-label="Open tab launcher"><Plus size={14} /></button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="launcher-menu">
        {groups.map((group) => (
          <div className="launcher-group" key={group}>
            <div className="launcher-group-title">{group}</div>
            {LAUNCHER_ENTRIES.filter((entry) => entry.group === group).map((entry) => (
              <DropdownMenuItem
                key={entry.label}
                disabled={entry.workspaceAction === "recent" && workspace.recent.length === 0}
                onSelect={() => {
                  if (entry.type) runtime.openTab(entry.type, surface);
                  if (entry.workspaceAction) workspace.setDialogOpen(true);
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
