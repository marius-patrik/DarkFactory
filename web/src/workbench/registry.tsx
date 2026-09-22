import type { ReactNode } from "react";
import { SettingsView } from "@/settings-view";
import { BrowserTab } from "@/tabs/browser-tab";
import { DocumentTab } from "@/tabs/document-tab";
import { DiffTab } from "@/tabs/diff-tab";
import { EditorTab } from "@/tabs/editor-tab";
import { ExplorerTab } from "@/tabs/explorer-tab";
import { OutputTab } from "@/tabs/output-tab";
import { ProblemsTab } from "@/tabs/problems-tab";
import { SearchTab } from "@/tabs/search-tab";
import { SourceControlTab } from "@/tabs/source-control-tab";
import { TabShell } from "@/tabs/tab-shell";
import type { WorkbenchSurface, WorkbenchTab, WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type TabDefinition = {
  type: WorkbenchTabType;
  title: string;
  icon: string;
  defaultSurface: WorkbenchSurface;
  singleton?: boolean;
  initialState?: () => Record<string, unknown>;
};

const DEFINITIONS: TabDefinition[] = [
  { type: "editor", title: "Editor", icon: "FileCode2Icon", defaultSurface: "main", initialState: () => ({ value: "", language: "plaintext", path: "Untitled", renderer: "editor", review: false, compare: "none", compareTarget: "", representation: "auto" }) },
  { type: "browser", title: "Browser", icon: "GlobeIcon", defaultSurface: "main", initialState: () => ({ url: "about:blank", history: ["about:blank"], historyIndex: 0 }) },
  { type: "explorer", title: "Explorer", icon: "FilesIcon", defaultSurface: "primary", singleton: true },
  { type: "source-control", title: "Source Control", icon: "GitBranchIcon", defaultSurface: "primary", singleton: true },
  { type: "search", title: "Search", icon: "SearchIcon", defaultSurface: "primary", singleton: true },
  { type: "problems", title: "Problems", icon: "CircleAlertIcon", defaultSurface: "panel", singleton: true },
  { type: "output", title: "Output", icon: "TerminalSquareIcon", defaultSurface: "panel", singleton: true },
  { type: "settings", title: "Settings", icon: "SettingsIcon", defaultSurface: "main", singleton: true },
  { type: "document", title: "Document", icon: "FileTextIcon", defaultSurface: "main" },
  { type: "diff", title: "Diff", icon: "Columns2Icon", defaultSurface: "main" },
  { type: "issues", title: "Issues", icon: "CircleDotIcon", defaultSurface: "main" },
  { type: "issue", title: "Issue", icon: "CircleDotIcon", defaultSurface: "main" },
  { type: "pull-requests", title: "Pull Requests", icon: "GitPullRequestIcon", defaultSurface: "main" },
  { type: "pull-request", title: "Pull Request", icon: "GitPullRequestIcon", defaultSurface: "main" },
  { type: "projects", title: "Projects", icon: "LayoutDashboardIcon", defaultSurface: "main" },
  { type: "project", title: "Project", icon: "LayoutDashboardIcon", defaultSurface: "main" },
  { type: "actions", title: "Actions", icon: "PlayIcon", defaultSurface: "main" },
  { type: "workflow-run", title: "Workflow Run", icon: "PlayIcon", defaultSurface: "main" },
  { type: "releases", title: "Releases", icon: "PackageIcon", defaultSurface: "main" },
  { type: "release", title: "Release", icon: "PackageIcon", defaultSurface: "main" },
  { type: "branches", title: "Branches", icon: "GitBranchIcon", defaultSurface: "main" },
  { type: "commits", title: "Commits", icon: "GitCommitIcon", defaultSurface: "main" },
  { type: "commit", title: "Commit", icon: "GitCommitIcon", defaultSurface: "main" },
];

export const TAB_REGISTRY = new Map(DEFINITIONS.map((definition) => [definition.type, definition]));

export function tabDefinition(type: WorkbenchTabType) {
  const definition = TAB_REGISTRY.get(type);
  if (!definition) throw new Error(`Unknown workbench tab type: ${type}`);
  return definition;
}

export function createWorkbenchTab(
  type: WorkbenchTabType,
  options: {
    id?: string;
    pinned?: boolean;
    state?: Record<string, unknown>;
    title?: string;
    resource?: string;
  } = {},
): WorkbenchTab {
  const definition = tabDefinition(type);
  return {
    id: options.id ?? `${type}-${crypto.randomUUID()}`,
    type,
    title: options.title ?? definition.title,
    icon: definition.icon,
    resource: options.resource,
    pinned: options.pinned ?? false,
    state: { ...(definition.initialState?.() ?? {}), ...(options.state ?? {}) },
  };
}

function UnavailableTab({ title }: { title: string }) {
  return <div className="tab-empty"><strong>{title}</strong><span>This capability is registered for a later IDE phase.</span></div>;
}

function RegisteredTabContent({ tab }: { tab: WorkbenchTab }): ReactNode {
  const runtime = useWorkbenchRuntime();
  const updateState = (patch: Record<string, unknown>) => runtime.updateTabState(tab.id, patch);
  switch (tab.type) {
    case "editor": return <EditorTab tab={tab} theme={runtime.settings.theme} updateState={updateState} />;
    case "browser": return <BrowserTab tab={tab} updateState={updateState} />;
    case "explorer": return <ExplorerTab />;
    case "source-control": return <SourceControlTab />;
    case "search": return <SearchTab tab={tab} updateState={updateState} />;
    case "problems": return <ProblemsTab />;
    case "output": return <OutputTab />;
    case "settings": return <SettingsView settings={runtime.settings} onThemeChange={runtime.setTheme} />;
    case "document": return <DocumentTab />;
    case "diff": return <DiffTab tab={tab} theme={runtime.settings.theme} />;
    default: return <UnavailableTab title={tab.title} />;
  }
}

export function WorkbenchPanel({ props }: { props: any }) {
  const runtime = useWorkbenchRuntime();
  const tab = props.params as WorkbenchTab;
  return (
    <TabShell
      tab={tab}
      actions={{ move: runtime.moveTab, split: runtime.splitTab, setPinned: runtime.setPinned, close: runtime.closeTab }}
    >
      <RegisteredTabContent tab={tab} />
    </TabShell>
  );
}
