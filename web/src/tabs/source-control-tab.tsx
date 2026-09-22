import { useState } from "react";
import {
  Archive,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  GitBranch,
  GitMerge,
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  Upload,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

function CommitRow({
  commit,
  onExport,
}: {
  commit: LocalCommit;
  onExport: () => void;
}) {
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
          <button type="button" className="local-commit-export" onClick={onExport}>
            <Download size={11} /> Export commit patch
          </button>
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

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setLocalError(null);
    try {
      await action();
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };

  const openDiff = (path: string, compare: "working" | "staged") => {
    runtime.openTab("diff", "main", { path, compare });
  };

  const commit = async () => {
    await workspace.commitStaged(message);
    setMessage("");
  };

  const createBranch = async () => {
    const name = window.prompt("New branch name");
    if (!name) return;
    await workspace.createBranch(name);
  };

  const diverged = workspace.remoteHeadSha && workspace.remoteHeadSha !== workspace.workspace.baseSha;
  const branchWorkspace = workspace.refs.some(
    (candidate) => candidate.kind === "branch" && candidate.name === workspace.workspace?.ref,
  );

  return (
    <div className="generic-tool-tab source-control-tab">
      <div className="tool-tab-header">
        <strong>Source Control</strong>
        <div className="tool-tab-actions">
          <button type="button" disabled={busy} onClick={() => void run(workspace.refreshWorkspace)} title="Fetch remote"><RefreshCw size={12} /></button>
          {diverged && <button type="button" disabled={busy} onClick={() => void run(workspace.syncWorkspace)} title="Sync onto remote head when touched paths do not conflict"><GitMerge size={12} /></button>}
          <button type="button" disabled={busy || !workspace.token} onClick={() => void run(createBranch)} title="Create branch"><GitBranch size={12} /></button>
          <button type="button" disabled={busy || !workspace.commits.length || !workspace.token || !branchWorkspace || Boolean(diverged)} onClick={() => void run(workspace.pushLocalCommits)} title="Push local commits"><Upload size={12} /></button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={busy || (!workspace.overlays.length && !workspace.staged.length && !workspace.commits.length)}
                title="Export patch"
              >
                <Download size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void run(() => workspace.exportPatch("all"))}>
                All local changes
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!workspace.overlays.length}
                onSelect={() => void run(() => workspace.exportPatch("working"))}
              >
                Working tree
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!workspace.staged.length}
                onSelect={() => void run(() => workspace.exportPatch("staged"))}
              >
                Staged changes
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!workspace.commits.length}
                onSelect={() => void run(() => workspace.exportPatch("commits"))}
              >
                All local commits
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button type="button" disabled={busy} onClick={() => void run(workspace.exportWorkspaceZip)} title="Export current workspace ZIP"><Archive size={12} /></button>
          <button type="button" disabled={busy} onClick={() => void run(workspace.exportRemoteArchive)} title="Download remote ref ZIP"><Archive size={12} /></button>
        </div>
      </div>
      <div className="scm-ref-row">
        <span>{workspace.workspace.ref}</span>
        <code>{workspace.workspace.baseSha.slice(0, 7)}</code>
        {workspace.commits.length > 0 && <span>{workspace.commits.length} outgoing</span>}
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
        <button type="button" disabled={busy || !message.trim() || workspace.staged.length === 0} onClick={() => void run(commit)}>
          <Check size={13} /> Commit staged
        </button>
      </div>

      <section className="scm-section">
        <header>
          <strong>Staged Changes</strong>
          <span>{workspace.staged.length}</span>
          <button type="button" disabled={!workspace.staged.length || busy} onClick={() => void run(workspace.unstageAll)}>Unstage all</button>
        </header>
        {workspace.staged.map((file) => (
          <ChangeRow
            key={file.key}
            file={file}
            staged
            onOpen={() => openDiff(file.path, "staged")}
            onToggleStage={() => void run(() => workspace.unstageFile(file.path))}
          />
        ))}
      </section>

      <section className="scm-section">
        <header>
          <strong>Changes</strong>
          <span>{workspace.overlays.length}</span>
          <button type="button" disabled={!workspace.overlays.length || busy} onClick={() => void run(workspace.stageAll)}>Stage all</button>
        </header>
        {workspace.overlays.map((file) => (
          <ChangeRow
            key={file.key}
            file={file}
            staged={false}
            onOpen={() => openDiff(file.path, "working")}
            onToggleStage={() => void run(() => workspace.stageFile(file.path))}
            onDiscard={() => void run(() => workspace.discardFile(file.path))}
          />
        ))}
      </section>

      <section className="scm-section">
        <header>
          <strong>Local Commits</strong>
          <span>{workspace.commits.length}</span>
        </header>
        {workspace.commits.map((commit) => (
          <CommitRow
            key={commit.id}
            commit={commit}
            onExport={() => void run(() => workspace.exportPatch("commit", commit.id))}
          />
        ))}
      </section>

      {!workspace.overlays.length && !workspace.staged.length && !workspace.commits.length && (
        <div className="tab-empty"><span>No local changes.</span></div>
      )}
    </div>
  );
}
