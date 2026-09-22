import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  FolderOpen,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { GithubTreeEntry } from "@/github/client";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { CommittedFile, WorkingFile, WorkingFileStatus } from "@/workspace/model";

type ExplorerNode = {
  name: string;
  path: string;
  kind: "file" | "directory" | "submodule";
  sha?: string;
  status?: WorkingFileStatus | null;
  children: ExplorerNode[];
};

type MutableNode = Omit<ExplorerNode, "children"> & {
  children: MutableNode[];
  childrenByName: Map<string, MutableNode>;
};

function buildExplorerTree(tree: GithubTreeEntry[], committedFiles: CommittedFile[], overlays: WorkingFile[]) {
  const overlayByPath = new Map(overlays.map((file) => [file.path, file]));
  const records = new Map<string, { kind: ExplorerNode["kind"]; sha?: string; status?: WorkingFileStatus | null }>();

  for (const entry of tree) {
    records.set(entry.path, {
      kind: entry.type === "tree" ? "directory" : entry.type === "commit" ? "submodule" : "file",
      sha: entry.sha,
      status: null,
    });
  }
  for (const committed of committedFiles) {
    if (committed.deleted) records.delete(committed.path);
    else records.set(committed.path, { kind: "file", sha: committed.baseSha, status: null });
  }
  for (const overlay of overlays) {
    if (!records.has(overlay.path) || overlay.status === "renamed" || overlay.status === "added") {
      records.set(overlay.path, { kind: "file", sha: overlay.baseSha, status: overlay.status });
    } else {
      const current = records.get(overlay.path);
      if (current) current.status = overlay.status;
    }
  }

  const root: MutableNode = {
    name: "",
    path: "",
    kind: "directory",
    children: [],
    childrenByName: new Map(),
  };

  const ensureDirectory = (parent: MutableNode, name: string, path: string) => {
    let node = parent.childrenByName.get(name);
    if (!node) {
      node = { name, path, kind: "directory", children: [], childrenByName: new Map() };
      parent.childrenByName.set(name, node);
      parent.children.push(node);
    }
    return node;
  };

  for (const [path, record] of [...records.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const parts = path.split("/").filter(Boolean);
    if (!parts.length) continue;
    let parent = root;
    for (let index = 0; index < parts.length - 1; index += 1) {
      parent = ensureDirectory(parent, parts[index], parts.slice(0, index + 1).join("/"));
    }
    const name = parts.at(-1) ?? path;
    const existing = parent.childrenByName.get(name);
    if (existing) {
      existing.kind = record.kind;
      existing.sha = record.sha;
      existing.status = record.status;
      continue;
    }
    const node: MutableNode = {
      name,
      path,
      kind: record.kind,
      sha: record.sha,
      status: record.status,
      children: [],
      childrenByName: new Map(),
    };
    parent.childrenByName.set(name, node);
    parent.children.push(node);
  }

  const finalize = (node: MutableNode): ExplorerNode => ({
    name: node.name,
    path: node.path,
    kind: node.kind,
    sha: node.sha,
    status: node.status,
    children: node.children
      .sort((left, right) => {
        if (left.kind === "directory" && right.kind !== "directory") return -1;
        if (left.kind !== "directory" && right.kind === "directory") return 1;
        return left.name.localeCompare(right.name);
      })
      .map(finalize),
  });

  return root.children.map(finalize);
}

const STATUS_LABEL: Record<WorkingFileStatus, string> = {
  modified: "M",
  added: "A",
  deleted: "D",
  renamed: "R",
};

function ExplorerRow({
  node,
  depth,
  expanded,
  setExpanded,
  openFile,
  renameFile,
  deleteFile,
}: {
  node: ExplorerNode;
  depth: number;
  expanded: Set<string>;
  setExpanded: (next: Set<string>) => void;
  openFile: (node: ExplorerNode) => void;
  renameFile: (node: ExplorerNode) => void;
  deleteFile: (node: ExplorerNode) => void;
}) {
  const isDirectory = node.kind === "directory";
  const isExpanded = expanded.has(node.path);
  const deleted = node.status === "deleted";
  return (
    <li className={deleted ? "explorer-node deleted" : "explorer-node"}>
      <div className="explorer-row" style={{ paddingLeft: 6 + depth * 12 }}>
        <button
          type="button"
          className="explorer-entry-main"
          disabled={deleted || node.kind === "submodule"}
          onClick={() => {
            if (isDirectory) {
              const next = new Set(expanded);
              if (isExpanded) next.delete(node.path);
              else next.add(node.path);
              setExpanded(next);
            } else {
              openFile(node);
            }
          }}
          title={node.path}
        >
          {isDirectory ? (
            <>
              {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              {isExpanded ? <FolderOpen size={14} /> : <Folder size={14} />}
            </>
          ) : (
            <>
              <span className="explorer-chevron-spacer" />
              <File size={13} />
            </>
          )}
          <span className="explorer-name">{node.name}</span>
          {node.status && <small className={`explorer-status status-${node.status}`}>{STATUS_LABEL[node.status]}</small>}
        </button>
        {!isDirectory && node.kind !== "submodule" && !deleted && (
          <div className="explorer-row-actions">
            <button type="button" onClick={() => renameFile(node)} aria-label={`Rename ${node.path}`}><Pencil size={11} /></button>
            <button type="button" onClick={() => deleteFile(node)} aria-label={`Delete ${node.path}`}><Trash2 size={11} /></button>
          </div>
        )}
      </div>
      {isDirectory && isExpanded && node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <ExplorerRow
              key={child.path}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              setExpanded={setExpanded}
              openFile={openFile}
              renameFile={renameFile}
              deleteFile={deleteFile}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function ExplorerTab() {
  const runtime = useWorkbenchRuntime();
  const workspace = useWorkspace();
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const entries = useMemo(
    () => workspace.workspace
      ? buildExplorerTree(workspace.workspace.tree, workspace.committedFiles, workspace.overlays)
      : [],
    [workspace.committedFiles, workspace.overlays, workspace.workspace],
  );

  if (!workspace.workspace) {
    return (
      <div className="generic-tool-tab">
        <div className="tool-tab-header"><strong>Explorer</strong></div>
        <div className="tab-empty">
          <strong>No workspace active</strong>
          <span>Open a GitHub repository to browse its tree.</span>
          <button type="button" onClick={() => workspace.setDialogOpen(true)}>Open Repository</button>
        </div>
      </div>
    );
  }

  const openFile = (node: ExplorerNode) => {
    runtime.openTab("editor", "main", {
      path: node.path,
      language: languageForPath(node.path),
    });
  };

  const createFile = async () => {
    const path = window.prompt("New file path");
    if (!path) return;
    try {
      await workspace.createFile(path);
      runtime.openTab("editor", "main", { path, language: languageForPath(path) });
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const renameFile = async (node: ExplorerNode) => {
    const nextPath = window.prompt("Rename file", node.path);
    if (!nextPath || nextPath === node.path) return;
    try {
      await workspace.renamePath(node.path, nextPath);
      runtime.openTab("editor", "main", { path: nextPath, language: languageForPath(nextPath) });
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const deleteFile = async (node: ExplorerNode) => {
    if (!window.confirm(`Delete ${node.path} from the local working tree?`)) return;
    try {
      await workspace.deletePath(node.path);
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div className="generic-tool-tab">
      <div className="tool-tab-header">
        <strong>{workspace.workspace.repository.name}</strong>
        <div className="tool-tab-actions">
          <button type="button" onClick={() => void createFile()} title="New file"><Plus size={12} /></button>
          <button type="button" onClick={() => void workspace.refreshWorkspace()} title="Refresh repository"><RefreshCw size={12} /></button>
        </div>
      </div>
      {workspace.error && <div className="explorer-error">{workspace.error}</div>}
      <ul className="explorer-tree">
        {entries.map((entry) => (
          <ExplorerRow
            key={entry.path}
            node={entry}
            depth={0}
            expanded={expanded}
            setExpanded={setExpanded}
            openFile={openFile}
            renameFile={renameFile}
            deleteFile={deleteFile}
          />
        ))}
      </ul>
    </div>
  );
}
