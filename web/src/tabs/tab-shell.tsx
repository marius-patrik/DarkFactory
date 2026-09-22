import type { ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SURFACE_LABELS, type SplitDirection, type WorkbenchSurface, type WorkbenchTab } from "@/workbench/model";

export type TabActions = {
  move: (id: string, surface: WorkbenchSurface) => void;
  split: (id: string, direction: SplitDirection) => void;
  setPinned: (id: string, pinned: boolean) => void;
  close: (id: string) => void;
};

export function TabShell({
  tab,
  actions,
  toolbar,
  children,
}: {
  tab: WorkbenchTab;
  actions: TabActions;
  toolbar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="workbench-tab-shell">
      <header className="workbench-tab-toolbar">
        <div className="workbench-tab-toolbar-main">{toolbar}</div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="workbench-icon-button" aria-label={`Actions for ${tab.title}`}>
              <MoreHorizontal size={15} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => actions.setPinned(tab.id, !tab.pinned)}>
              {tab.pinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(Object.keys(SURFACE_LABELS) as WorkbenchSurface[]).map((surface) => (
                  <DropdownMenuItem key={surface} onSelect={() => actions.move(tab.id, surface)}>
                    {SURFACE_LABELS[surface]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem onSelect={() => actions.split(tab.id, "right")}>Split Right</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => actions.split(tab.id, "below")}>Split Down</DropdownMenuItem>
            <DropdownMenuItem disabled={tab.pinned} onSelect={() => actions.close(tab.id)}>
              Close
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
      <div className="workbench-tab-content">{children}</div>
    </section>
  );
}
