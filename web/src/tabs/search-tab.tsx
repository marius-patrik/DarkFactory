import type { WorkbenchTab } from "@/workbench/model";

export function SearchTab({
  tab,
  updateState,
}: {
  tab: WorkbenchTab;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const query = typeof tab.state.query === "string" ? tab.state.query : "";
  return (
    <div className="generic-tool-tab">
      <div className="tool-tab-header"><strong>Search</strong></div>
      <div className="tool-tab-form">
        <input
          value={query}
          onChange={(event) => updateState({ query: event.target.value })}
          placeholder="Search workspace"
          aria-label="Search workspace"
        />
      </div>
      <div className="tab-empty">
        <span>{query ? "Repository search is not connected until Phase 2." : "Enter a query to search the active workspace."}</span>
      </div>
    </div>
  );
}
