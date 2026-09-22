import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Command, Search } from "lucide-react";
import {
  listGithubCommits,
  listGithubIssues,
  listGithubProjects,
  listGithubPullRequests,
  listGithubReleases,
  listGithubWorkflowRuns,
  type GithubCommit,
  type GithubIssue,
  type GithubProject,
  type GithubPullRequest,
  type GithubRelease,
  type GithubWorkflowRun,
} from "@/github/client";
import { preferredWorkbenchTabForPath } from "@/renderers/capabilities";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type OmnibarMode = "navigation" | "command";
export type OmnibarQueryKind =
  | "command"
  | "symbol"
  | "issue"
  | "line"
  | "url"
  | "branch"
  | "tag"
  | "commit"
  | "run"
  | "project"
  | "release"
  | "workspace"
  | "resource";
export type OmnibarControl = { focus: (mode: OmnibarMode, value?: string) => void };

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
  if (/^branch:/i.test(query)) return "branch";
  if (/^tag:/i.test(query)) return "tag";
  if (/^commit:/i.test(query)) return "commit";
  if (/^(run|workflow):/i.test(query)) return "run";
  if (/^project:/i.test(query)) return "project";
  if (/^release:/i.test(query)) return "release";
  if (/^workspace:/i.test(query)) return "workspace";
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
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [pullRequests, setPullRequests] = useState<GithubPullRequest[]>([]);
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [runs, setRuns] = useState<GithubWorkflowRun[]>([]);
  const [projects, setProjects] = useState<GithubProject[]>([]);
  const [releases, setReleases] = useState<GithubRelease[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState("");

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
    focus(nextMode, value) {
      setMode(nextMode);
      setQuery(value ?? (nextMode === "command" ? ">" : ""));
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

  useEffect(() => {
    const current = workspace.workspace;
    if (!focused || !current) return;
    if (!["issue", "commit", "run", "project", "release"].includes(queryKind)) return;

    let disposed = false;
    const timer = window.setTimeout(() => {
      setEntityLoading(true);
      setEntityError("");
      const fullName = current.repository.fullName;
      let request: Promise<unknown>;

      if (queryKind === "issue") {
        request = Promise.all([
          listGithubIssues(fullName, workspace.token, "all"),
          listGithubPullRequests(fullName, workspace.token, "all"),
        ]).then(([nextIssues, nextPullRequests]) => {
          if (disposed) return;
          setIssues(nextIssues);
          setPullRequests(nextPullRequests);
        });
      } else if (queryKind === "commit") {
        request = listGithubCommits(fullName, workspace.token, current.ref).then((items) => {
          if (!disposed) setCommits(items);
        });
      } else if (queryKind === "run") {
        request = listGithubWorkflowRuns(fullName, workspace.token).then((result) => {
          if (!disposed) setRuns(result.workflow_runs);
        });
      } else if (queryKind === "project") {
        request = listGithubProjects(fullName, workspace.token).then((items) => {
          if (!disposed) setProjects(items);
        });
      } else {
        request = listGithubReleases(fullName, workspace.token).then((items) => {
          if (!disposed) setReleases(items);
        });
      }

      void request
        .catch((reason) => {
          if (!disposed) setEntityError(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          if (!disposed) setEntityLoading(false);
        });
    }, 120);

    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [focused, queryKind, workspace.token, workspace.workspace]);

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

  const entityQuery = query.replace(/^[^:]+:/, "").replace(/^#/, "").trim().toLowerCase();
  const refResults = (queryKind === "branch" || queryKind === "tag")
    ? workspace.refs
        .filter((ref) => ref.kind === queryKind)
        .filter((ref) => !entityQuery || ref.name.toLowerCase().includes(entityQuery))
        .slice(0, 8)
    : [];
  const workspaceResults = queryKind === "workspace"
    ? workspace.recent
        .filter((item) => {
          const value = `${item.repository.fullName} ${item.ref}`.toLowerCase();
          return !entityQuery || value.includes(entityQuery);
        })
        .slice(0, 8)
    : [];
  const issueResults = queryKind === "issue"
    ? [
        ...issues.map((item) => ({
          kind: "issue" as const,
          number: item.number,
          title: item.title,
        })),
        ...pullRequests.map((item) => ({
          kind: "pull-request" as const,
          number: item.number,
          title: item.title || `Pull Request #${item.number}`,
        })),
      ]
        .filter((item) => {
          if (!entityQuery) return true;
          return String(item.number) === entityQuery || item.title.toLowerCase().includes(entityQuery);
        })
        .slice(0, 8)
    : [];
  const commitResults = queryKind === "commit"
    ? commits
        .filter((item) => {
          const message = item.commit.message || "";
          return !entityQuery || item.sha.toLowerCase().startsWith(entityQuery) || message.toLowerCase().includes(entityQuery);
        })
        .slice(0, 8)
    : [];
  const runResults = queryKind === "run"
    ? runs
        .filter((item) => {
          const value = `${item.run_number} ${item.name || ""} ${item.display_title || ""} ${item.head_branch || ""}`.toLowerCase();
          return !entityQuery || value.includes(entityQuery);
        })
        .slice(0, 8)
    : [];
  const projectResults = queryKind === "project"
    ? projects
        .filter((item) => !entityQuery || String(item.number) === entityQuery || item.title.toLowerCase().includes(entityQuery))
        .slice(0, 8)
    : [];
  const releaseResults = queryKind === "release"
    ? releases
        .filter((item) => {
          const value = `${item.tag_name} ${item.name || ""}`.toLowerCase();
          return !entityQuery || value.includes(entityQuery);
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

  const goToLine = (value: string) => {
    const line = Number(value.replace(/^:/, ""));
    const active = runtime.activeTab;
    if (
      !active ||
      (active.type !== "editor" && active.type !== "document") ||
      !Number.isInteger(line) ||
      line < 1
    ) {
      return;
    }
    runtime.updateTabState(active.id, {
      renderer: "editor",
      goToLine: line,
      goToLineRequest: Date.now(),
    });
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
              const first = issueResults[0];
              if (first) {
                runtime.openTab(first.kind, "main", { number: first.number });
                closeResults();
              }
              return;
            }
            if (queryKind === "branch" || queryKind === "tag") {
              const first = refResults[0];
              if (first) {
                void workspace.switchRef(first.name);
                closeResults();
              }
              return;
            }
            if (queryKind === "commit") {
              const first = commitResults[0];
              if (first) {
                runtime.openTab("commit", "main", { sha: first.sha });
                closeResults();
              }
              return;
            }
            if (queryKind === "run") {
              const first = runResults[0];
              if (first) {
                runtime.openTab("workflow-run", "main", { id: first.id });
                closeResults();
              }
              return;
            }
            if (queryKind === "project") {
              const first = projectResults[0];
              if (first) {
                runtime.openTab("project", "main", { number: first.number });
                closeResults();
              }
              return;
            }
            if (queryKind === "release") {
              const first = releaseResults[0];
              if (first) {
                runtime.openTab("release", "main", { id: first.id });
                closeResults();
              }
              return;
            }
            if (queryKind === "workspace") {
              const first = workspaceResults[0];
              if (first) {
                void workspace.openRepository(first.repository.fullName, first.ref);
                closeResults();
              }
              return;
            }
            if (queryKind === "line") {
              goToLine(query);
              return;
            }
            if (queryKind === "resource" && resourceResults[0]) {
              openResource(resourceResults[0]);
            }
          }}
          placeholder={runtime.activeTab?.type === "browser" ? "Enter URL" : mode === "command" ? "Type a command" : "Search files, #issues, branch:, commit:, run:, or URL"}
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
      {focused && queryKind === "line" && (
        <div className="omnibar-results">
          {runtime.activeTab && (runtime.activeTab.type === "editor" || runtime.activeTab.type === "document") && Number.isInteger(Number(query.replace(/^:/, ""))) && Number(query.replace(/^:/, "")) > 0 ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => goToLine(query)}
            >
              Go to line {Number(query.replace(/^:/, ""))}
            </button>
          ) : <div className="omnibar-empty">Enter a line number for the active file</div>}
        </div>
      )}
      {focused && queryKind === "issue" && (
        <div className="omnibar-results">
          {entityLoading ? <div className="omnibar-empty">Loading issues and pull requests…</div> : entityError ? <div className="omnibar-empty">{entityError}</div> : issueResults.length ? issueResults.map((item) => (
            <button
              key={`${item.kind}:${item.number}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                runtime.openTab(item.kind, "main", { number: item.number });
                closeResults();
              }}
            >
              {item.kind === "issue" ? "Issue" : "PR"} #{item.number} · {item.title}
            </button>
          )) : <div className="omnibar-empty">No matching issues or pull requests</div>}
        </div>
      )}
      {focused && (queryKind === "branch" || queryKind === "tag") && (
        <div className="omnibar-results">
          {refResults.length ? refResults.map((ref) => (
            <button
              key={`${ref.kind}:${ref.name}`}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                void workspace.switchRef(ref.name);
                closeResults();
              }}
            >
              {ref.kind} · {ref.name} · {ref.sha.slice(0, 7)}
            </button>
          )) : <div className="omnibar-empty">No matching {queryKind}s</div>}
        </div>
      )}
      {focused && queryKind === "commit" && (
        <div className="omnibar-results">
          {entityLoading ? <div className="omnibar-empty">Loading commits…</div> : entityError ? <div className="omnibar-empty">{entityError}</div> : commitResults.length ? commitResults.map((item) => (
            <button
              key={item.sha}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                runtime.openTab("commit", "main", { sha: item.sha });
                closeResults();
              }}
            >
              {item.sha.slice(0, 7)} · {item.commit.message?.split("\n")[0] || "Commit"}
            </button>
          )) : <div className="omnibar-empty">No matching commits</div>}
        </div>
      )}
      {focused && queryKind === "run" && (
        <div className="omnibar-results">
          {entityLoading ? <div className="omnibar-empty">Loading workflow runs…</div> : entityError ? <div className="omnibar-empty">{entityError}</div> : runResults.length ? runResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                runtime.openTab("workflow-run", "main", { id: item.id });
                closeResults();
              }}
            >
              Run #{item.run_number} · {item.display_title || item.name || "Workflow"} · {item.status || "unknown"}
            </button>
          )) : <div className="omnibar-empty">No matching workflow runs</div>}
        </div>
      )}
      {focused && queryKind === "project" && (
        <div className="omnibar-results">
          {entityLoading ? <div className="omnibar-empty">Loading projects…</div> : entityError ? <div className="omnibar-empty">{entityError}</div> : projectResults.length ? projectResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                runtime.openTab("project", "main", { number: item.number });
                closeResults();
              }}
            >
              Project #{item.number} · {item.title}
            </button>
          )) : <div className="omnibar-empty">No matching projects</div>}
        </div>
      )}
      {focused && queryKind === "release" && (
        <div className="omnibar-results">
          {entityLoading ? <div className="omnibar-empty">Loading releases…</div> : entityError ? <div className="omnibar-empty">{entityError}</div> : releaseResults.length ? releaseResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                runtime.openTab("release", "main", { id: item.id });
                closeResults();
              }}
            >
              {item.tag_name} · {item.name || "Release"}
            </button>
          )) : <div className="omnibar-empty">No matching releases</div>}
        </div>
      )}
      {focused && queryKind === "workspace" && (
        <div className="omnibar-results">
          {workspaceResults.length ? workspaceResults.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                void workspace.openRepository(item.repository.fullName, item.ref);
                closeResults();
              }}
            >
              {item.repository.fullName} · {item.ref}
            </button>
          )) : <div className="omnibar-empty">No matching recent workspaces</div>}
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
