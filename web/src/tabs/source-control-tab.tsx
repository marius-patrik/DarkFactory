import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Minus, Plus, RotateCcw } from "lucide-react";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { useWorkspace } from "@/workspace/context";
import type { LocalCommit, StagedFile, WorkingFile } from "@/workspace/model";

function ChangeRow({
  file,
  staged,
  onOpen,
  onToggleStage,
  onDiscard,
}: {
  file: WorkingFile | StagedFile;
  staged: boolean;
  onOpen: () => void;
  onToggleStage: () => void;
  onDiscard?: () => void;
}) {
  return (
    <div className="scm-change-row">
      <button type="button" className="scm-change-main" onClick={onOpen} title={file.path}>
        <span>{file.path}</span>
        <small className={`file-status status-${file.status}`}>{file.status}</small>
      </button>
      <div className="scm-change-actions">
        {onDiscard && (
          <button type="button" onClick={onDiscard} title="Discard working change"><RotateCcw size={12} /></button>
        )}
        <button type="button" onClick={onToggleStage} title={staged ? "Unstage" : "Stage"}>
          {staged ? <Minus size={12} /> : <Plus size={12} />}
        </button>
      </div>
    </div>
  );
}

function CommitRow({ commit }: { commit: LocalCommit }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="local-commit">
      <button type="button" className="local-commit-header" onClick={() => setOpen((value) => !value)}>
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        <span>{commit.message}</span>
        <small>{commit.files.length}</small>
      </button>
      {open && (
        <div className="local-commit-files">
          {commit.files.map((file) => <span key={file.path}>{file.status}: {file.path}</span>)}
        </div>
      )}
    </div>
  );
}

export function SourceControlTab() {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (!workspace.workspace) {
    return <div className="generic-tool-tab"><div className="tool-tab-header"><strong>Source Control</strong></div><div className="tab-empty"><strong>No workspace active</strong><span>Open a GitHub repository to create browser-local changes.</span></div></div>;
  }

  const openDiff = (path: string, compare: "working" | "staged") => {
    runtime.openTab("diff", "main", { path, compare });
  };

  const commit = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      await workspace.commitStaged(message);
      setMessage("");
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const diverged = workspace.remoteHeadSha && workspace.remoteHeadSha !== workspace.workspace.baseSha;

  return (
    <div className="generic-tool-tab source-control-tab">
      <div className="tool-tab-header">
        <strong>Source Control</strong>
        <span>{workspace.workspace.ref}</span>
      </div>
      {diverged && (
        <div className="scm-warning">
          Remote moved from {workspace.workspace.baseSha.slice(0, 7)} to {workspace.remoteHeadSha?.slice(0, 7)}. Push is blocked until explicit sync.
        </div>
      )}
      {localError && <div className="explorer-error">{localError}</div>}
      <div className="scm-commit-box">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Commit message"
          aria-label="Commit message"
          rows={3}
        />
        <button type="button" disabled={busy || !message.trim() || workspace.staged.length === 0} onClick={() => void commit()}>
          <Check size={13} /> Commit staged
        </button>
      </div>

      <section className="scm-section">
        <header>
          <strong>Staged Changes</strong>
          <span>{workspace.staged.length}</span>
          <button type="button" disabled={!workspace.staged.length} onClick={() => void workspace.unstageAll()}>Unstage all</button>
        </header>
        {workspace.staged.map((file) => (
          <ChangeRow
            key={file.key}
            file={file}
            staged
            onOpen={() => openDiff(file.path, "staged")}
            onToggleStage={() => void workspace.unstageFile(file.path)}
          />
        ))}
      </section>

      <section className="scm-section">
        <header>
          <strong>Changes</strong>
          <span>{workspace.overlays.length}</span>
          <button type="button" disabled={!workspace.overlays.length} onClick={() => void workspace.stageAll()}>Stage all</button>
        </header>
        {workspace.overlays.map((file) => (
          <ChangeRow
            key={file.key}
            file={file}
            staged={false}
            onOpen={() => openDiff(file.path, "working")}
            onToggleStage={() => void workspace.stageFile(file.path)}
            onDiscard={() => void workspace.discardFile(file.path)}
          />
        ))}
      </section>

      <section className="scm-section">
        <header>
          <strong>Local Commits</strong>
          <span>{workspace.commits.length}</span>
        </header>
        {workspace.commits.map((commit) => <CommitRow key={commit.id} commit={commit} />)}
      </section>

      {!workspace.overlays.length && !workspace.staged.length && !workspace.commits.length && (
        <div className="tab-empty"><span>No local changes.</span></div>
      )}
    </div>
  );
}
