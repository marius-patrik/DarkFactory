import { Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { WorkbenchSurface, WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type LauncherEntry = { group: "Files" | "Git" | "Tools" | "Workspace"; label: string; type?: WorkbenchTabType; disabled?: boolean };

export const LAUNCHER_ENTRIES: LauncherEntry[] = [
  { group: "Files", label: "Editor", type: "editor" },
  { group: "Files", label: "Explorer", type: "explorer" },
  { group: "Files", label: "Search", type: "search" },
  { group: "Git", label: "Source Control", type: "source-control" },
  { group: "Tools", label: "Browser", type: "browser" },
  { group: "Tools", label: "Problems", type: "problems" },
  { group: "Tools", label: "Output", type: "output" },
  { group: "Tools", label: "Settings", type: "settings" },
  { group: "Workspace", label: "Open Repository", disabled: true },
  { group: "Workspace", label: "Recent Workspaces", disabled: true },
];

export function LauncherButton({ surface }: { surface: WorkbenchSurface }) {
  const runtime = useWorkbenchRuntime();
  const groups = ["Files", "Git", "Tools", "Workspace"] as const;
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
                disabled={entry.disabled}
                onSelect={() => entry.type && runtime.openTab(entry.type, surface)}
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
