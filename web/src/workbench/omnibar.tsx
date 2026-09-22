import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Command, Search } from "lucide-react";
import { preferredWorkbenchTabForPath } from "@/renderers/capabilities";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type OmnibarMode = "navigation" | "command";
export type OmnibarQueryKind = "command" | "symbol" | "issue" | "line" | "url" | "resource";
export type OmnibarControl = { focus: (mode: OmnibarMode) => void };

const COMMANDS: Array<{ label: string; type?: WorkbenchTabType; action?: "primary" | "secondary" | "panel" }> = [
  { label: "Open Editor", type: "editor" },
  { label: "Open Browser", type: "browser" },
  { label: "Open Explorer", type: "explorer" },
  { label: "Open Source Control", type: "source-control" },
  { label: "Open Search", type: "search" },
  { label: "Open Issues", type: "issues" },
  { label: "Open Pull Requests", type: "pull-requests" },
  { label: "Open Actions", type: "actions" },
  { label: "Open Problems", type: "problems" },
  { label: "Open Output", type: "output" },
  { label: "Open Settings", type: "settings" },
  { label: "Toggle Primary Sidebar", action: "primary" },
  { label: "Toggle Secondary Sidebar", action: "secondary" },
  { label: "Toggle Panel", action: "panel" },
];

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|about:|localhost(?::\d+)?(?:\/|$)|[\w.-]+\.[a-z]{2,}(?:\/|$))/i.test(value.trim());
}

export function classifyOmnibarQuery(value: string): OmnibarQueryKind {
  const query = value.trim();
  if (query.startsWith(">")) return "command";
  if (query.startsWith("@")) return "symbol";
  if (query.startsWith("#")) return "issue";
  if (query.startsWith(":")) return "line";
  if (looksLikeUrl(query)) return "url";
  return "resource";
}

export const Omnibar = forwardRef<OmnibarControl>(function Omnibar(_, ref) {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<OmnibarMode>("navigation");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const activeResource = useMemo(() => {
    const active = runtime.activeTab;
    if (!active) return "";
    if (active.type === "browser") {
      const url = typeof active.state.url === "string" ? active.state.url : "about:blank";
      return url === "about:blank" ? "" : url;
    }
    if (active.type === "editor" || active.type === "document") {
      return typeof active.state.path === "string" ? active.state.path : "";
    }
    return "";
  }, [runtime.activeTab]);

  useEffect(() => {
    if (!focused && mode !== "command") setQuery(activeResource);
  }, [activeResource, focused, mode]);

  useImperativeHandle(ref, () => ({
    focus(nextMode) {
      setMode(nextMode);
      setQuery(nextMode === "command" ? ">" : activeResource);
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }), [activeResource]);

  const commandQuery = query.replace(/^>/, "").trim().toLowerCase();
  const visibleCommands = COMMANDS
    .filter((command) => !commandQuery || command.label.toLowerCase().includes(commandQuery))
    .slice(0, 8);

  const resourcePaths = useMemo(() => {
    if (!workspace.workspace) return [];
    const paths = new Set(
      workspace.workspace.tree
        .filter((entry) => entry.type === "blob")
        .map((entry) => entry.path),
    );
    for (const file of workspace.committedFiles) {
      if (file.deleted) paths.delete(file.path);
      else paths.add(file.path);
    }
    for (const file of workspace.overlays) {
      if (file.status === "deleted") paths.delete(file.path);
      else paths.add(file.path);
    }
    return [...paths].sort();
  }, [workspace.committedFiles, workspace.overlays, workspace.workspace]);

  const queryKind = mode === "command" ? "command" : classifyOmnibarQuery(query);
  const resourceQuery = query.trim().toLowerCase();
  const resourceResults = queryKind === "resource" && resourceQuery
    ? resourcePaths
        .filter((path) => path.toLowerCase().includes(resourceQuery))
        .sort((left, right) => {
          const leftName = left.split("/").at(-1)?.toLowerCase() ?? left.toLowerCase();
          const rightName = right.split("/").at(-1)?.toLowerCase() ?? right.toLowerCase();
          const leftExact = leftName === resourceQuery ? 0 : 1;
          const rightExact = rightName === resourceQuery ? 0 : 1;
          return leftExact - rightExact || left.length - right.length || left.localeCompare(right);
        })
        .slice(0, 8)
    : [];

  const closeResults = () => {
    setFocused(false);
    inputRef.current?.blur();
  };

  const runCommand = (command: (typeof COMMANDS)[number]) => {
    if (command.type) runtime.openTab(command.type);
    if (command.action === "primary") runtime.toggleSurface("primary");
    if (command.action === "secondary") runtime.toggleSurface("secondary");
    if (command.action === "panel") runtime.toggleSurface("panel");
    closeResults();
  };

  const openResource = (path: string) => {
    if (preferredWorkbenchTabForPath(path) === "document") {
      runtime.openTab("document", "main", {
        path,
        renderer: "browser",
        review: false,
        compare: "none",
        compareTarget: "",
      });
    } else {
      runtime.openTab("editor", "main", { path, language: languageForPath(path) });
    }
    closeResults();
  };

  const navigateBrowser = (value: string) => {
    const url = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
    const active = runtime.activeTab;
    if (active?.type === "browser") {
      const history = Array.isArray(active.state.history)
        ? active.state.history.filter((item): item is string => typeof item === "string")
        : [];
      const currentIndex = typeof active.state.historyIndex === "number"
        ? Math.max(0, Math.min(history.length - 1, active.state.historyIndex))
        : Math.max(0, history.length - 1);
      const nextHistory = [...history.slice(0, currentIndex + 1), url];
      runtime.updateTabState(active.id, {
        url,
        history: nextHistory,
        historyIndex: nextHistory.length - 1,
      });
    } else {
      runtime.openTab("browser", "main", { url, history: [url], historyIndex: 0 });
    }
    closeResults();
  };

  return (
    <div className="omnibar-shell">
      <div className="omnibar-input-wrap">
        {mode === "command" ? <Command size={14} /> : <Search size={14} />}
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 100)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setMode(next.startsWith(">") ? "command" : "navigation");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              closeResults();
              return;
            }
            if (event.key !== "Enter") return;
            if (queryKind === "command") {
              const command = visibleCommands[0];
              if (command) runCommand(command);
              return;
            }
            if (queryKind === "url") {
              navigateBrowser(query);
              return;
            }
            if (queryKind === "issue") {
              const number = Number(query.replace(/^#/, ""));
              if (Number.isInteger(number) && number > 0) {
                runtime.openTab("issue", "main", { number });
                closeResults();
              }
              return;
            }
            if (queryKind === "resource" && resourceResults[0]) {
              openResource(resourceResults[0]);
            }
          }}
          placeholder={runtime.activeTab?.type === "browser" ? "Enter URL" : mode === "command" ? "Type a command" : "Search files, #issues, or enter URL"}
          aria-label="Workbench omnibar"
        />
        <kbd>{mode === "command" ? "⌘⇧P" : "⌘P"}</kbd>
      </div>
      {focused && queryKind === "command" && (
        <div className="omnibar-results">
          {visibleCommands.length ? visibleCommands.map((command) => (
            <button
              key={command.label}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(command)}
            >
              {command.label}
            </button>
          )) : <div className="omnibar-empty">No matching commands</div>}
        </div>
      )}
      {focused && queryKind === "resource" && query.trim() && (
        <div className="omnibar-results">
          {resourceResults.length ? resourceResults.map((path) => (
            <button
              key={path}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => openResource(path)}
            >
              {path}
            </button>
          )) : <div className="omnibar-empty">No matching files</div>}
        </div>
      )}
    </div>
  );
});
