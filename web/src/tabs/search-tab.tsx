import { useEffect, useState } from "react";
import { searchGithubCode, type GithubSearchItem } from "@/github/client";
import type { WorkbenchTab } from "@/workbench/model";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";

export function SearchTab({
  tab,
  updateState,
}: {
  tab: WorkbenchTab;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const query = typeof tab.state.query === "string" ? tab.state.query : "";
  const scope = tab.state.scope === "global" ? "global" : "repository";
  const [results, setResults] = useState<GithubSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!query.trim() || (scope === "repository" && !workspace.workspace)) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    let disposed = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      const fullName = scope === "repository"
        ? workspace.workspace?.repository.fullName ?? null
        : null;
      void searchGithubCode(fullName, query.trim(), workspace.token)
        .then((items) => {
          if (!disposed) setResults(items);
        })
        .catch((reason) => {
          if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
        })
        .finally(() => {
          if (!disposed) setLoading(false);
        });
    }, 300);
    return () => {
      disposed = true;
      window.clearTimeout(timer);
    };
  }, [query, scope, workspace.token, workspace.workspace]);

  const openResult = (item: GithubSearchItem) => {
    if (workspace.workspace?.repository.fullName === item.repository.full_name) {
      runtime.openTab("editor", "main", {
        path: item.path,
        language: languageForPath(item.path),
      });
      return;
    }
    runtime.openTab("browser", "main", {
      url: item.html_url,
      history: [item.html_url],
      historyIndex: 0,
    });
  };

  return (
    <div className="generic-tool-tab">
      <div className="tool-tab-header">
        <strong>Search</strong>
        <select
          value={scope}
          onChange={(event) => updateState({ scope: event.target.value })}
          aria-label="Search scope"
        >
          <option value="repository">Repository</option>
          <option value="global">GitHub</option>
        </select>
        <span>{results.length}</span>
      </div>
      <div className="tool-tab-form">
        <input
          value={query}
          onChange={(event) => updateState({ query: event.target.value })}
          placeholder={scope === "repository" ? "Search repository code" : "Search GitHub code"}
          aria-label="Search code"
        />
      </div>
      {loading ? (
        <div className="tab-empty"><span>Searching…</span></div>
      ) : error ? (
        <div className="explorer-error">{error}</div>
      ) : (
        <div className="github-list">
          {results.map((item) => (
            <button
              key={`${item.repository.full_name}:${item.path}:${item.sha}`}
              type="button"
              className="github-list-row"
              onClick={() => openResult(item)}
            >
              <span className="github-list-primary">{item.path}</span>
              <span>{item.repository.full_name}</span>
            </button>
          ))}
          {query.trim() && !results.length && (
            <div className="tab-empty"><span>No code matches.</span></div>
          )}
          {!query.trim() && (
            <div className="tab-empty"><span>Enter a query to search code.</span></div>
          )}
        </div>
      )}
    </div>
  );
}
