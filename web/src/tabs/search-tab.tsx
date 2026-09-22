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
  const [results, setResults] = useState<GithubSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!workspace.workspace || !query.trim()) {
      setResults([]);
      setError("");
      setLoading(false);
      return;
    }
    let disposed = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      void searchGithubCode(
        workspace.workspace!.repository.fullName,
        query.trim(),
        workspace.token,
      )
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
  }, [query, workspace.token, workspace.workspace]);

  return (
    <div className="generic-tool-tab">
      <div className="tool-tab-header">
        <strong>Search</strong>
        <span>{results.length}</span>
      </div>
      <div className="tool-tab-form">
        <input
          value={query}
          onChange={(event) => updateState({ query: event.target.value })}
          placeholder="Search repository code"
          aria-label="Search repository"
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
              onClick={() => runtime.openTab("editor", "main", {
                path: item.path,
                language: languageForPath(item.path),
              })}
            >
              <span className="github-list-primary">{item.path}</span>
              <span>{item.repository.full_name}</span>
            </button>
          ))}
          {query.trim() && !results.length && (
            <div className="tab-empty"><span>No code matches.</span></div>
          )}
          {!query.trim() && (
            <div className="tab-empty"><span>Enter a query to search the active repository.</span></div>
          )}
        </div>
      )}
    </div>
  );
}
