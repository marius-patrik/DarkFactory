import { useWorkspace } from "@/workspace/context";

export function SourceControlTab() {
  const workspace = useWorkspace();
  if (!workspace.workspace) {
    return <div className="generic-tool-tab"><div className="tool-tab-header"><strong>Source Control</strong></div><div className="tab-empty"><strong>No workspace active</strong><span>Open a GitHub repository to create browser-local changes.</span></div></div>;
  }
  return (
    <div className="generic-tool-tab">
      <div className="tool-tab-header"><strong>Source Control</strong><span>{workspace.overlays.length}</span></div>
      {workspace.overlays.length ? (
        <div className="working-change-list">
          {workspace.overlays.map((file) => (
            <div key={file.key} className="working-change-row">
              <span title={file.path}>{file.path}</span>
              <small className={`file-status status-${file.status}`}>{file.status}</small>
            </div>
          ))}
        </div>
      ) : <div className="tab-empty"><span>No local changes.</span></div>}
      <div className="source-control-phase-note">Staging, commits, branches, and push remain Phase 3.</div>
    </div>
  );
}
