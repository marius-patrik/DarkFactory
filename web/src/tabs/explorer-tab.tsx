export type ExplorerEntry = { path: string; type: "file" | "directory"; children?: ExplorerEntry[] };

function Tree({ entries }: { entries: ExplorerEntry[] }) {
  if (!entries.length) return null;
  return <ul className="explorer-tree">{entries.map((entry) => <li key={entry.path}><span>{entry.type === "directory" ? "▸" : ""} {entry.path.split("/").at(-1)}</span>{entry.children?.length ? <Tree entries={entry.children} /> : null}</li>)}</ul>;
}

export function ExplorerTab({ entries = [] }: { entries?: ExplorerEntry[] }) {
  return <div className="generic-tool-tab"><div className="tool-tab-header"><strong>Explorer</strong><button type="button" disabled title="Workspace refresh is available in Phase 2">Refresh</button></div>{entries.length ? <Tree entries={entries} /> : <div className="tab-empty"><strong>No workspace active</strong><span>Repository data will be provided by the workspace adapter in Phase 2.</span></div>}</div>;
}
