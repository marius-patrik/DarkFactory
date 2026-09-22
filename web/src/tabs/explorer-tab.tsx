import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  File,
  Folder,
  FolderOpen,
  Link,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import type { GithubTreeEntry } from "@/github/client";
import { preferredWorkbenchTabForPath } from "@/renderers/capabilities";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type {
  CommittedFile,
  StagedFile,
  WorkingFile,
  WorkingFileStatus,
} from "@/workspace/model";

type ExplorerNode = {
  name: string;
  path: string;
  kind: "file" | "directory" | "submodule" | "symlink";
  sha?: string;
  status?: WorkingFileStatus | null;
  staged?: boolean;
  children: ExplorerNode[];
};

type MutableNode = Omit<ExplorerNode, "children"> & {
  children: MutableNode[];
  childrenByName: Map<string, MutableNode>;
};

function buildExplorerTree(
  tree: GithubTreeEntry[],
  committedFiles: CommittedFile[],
  overlays: WorkingFile[],
  stagedFiles: StagedFile[],
) {
  const records = new Map<
    string,
    {
      kind: ExplorerNode["kind"];
      sha?: string;
      status?: WorkingFileStatus | null;
      staged?: boolean;
    }
  >();

  for (const entry of tree) {
    records.set(entry.path, {
      kind:
        entry.type === "tree"
          ? "directory"
          : entry.type === "commit"
            ? "submodule"
            : entry.mode === "120000"
              ? "symlink"
              : "file",
      sha: entry.sha,
      status: null,
    });
  }

  for (const committed of committedFiles) {
    if (committed.deleted) {
      records.delete(committed.path);
      continue;
    }
    const existing = records.get(committed.path);
    records.set(committed.path, {
      kind: existing?.kind ?? "file",
      sha: committed.baseSha ?? existing?.sha,
      status: null,
    });
  }

  for (const overlay of overlays) {
    const existing = records.get(overlay.path);
    if (!existing || overlay.status === "renamed" || overlay.status === "added") {
      records.set(overlay.path, {
        kind: existing?.kind ?? "file",
        sha: overlay.baseSha ?? existing?.sha,
        status: overlay.status,
      });
    } else {
      existing.status = overlay.status;
    }
  }

  for (const staged of stagedFiles) {
    const existing = records.get(staged.path);
    if (existing) existing.staged = true;
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
      node = {
        name,
        path,
        kind: "directory",
        children: [],
        childrenByName: new Map(),
      };
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
      existing.staged = record.staged;
      continue;
    }
    const node: MutableNode = {
      name,
      path,
      kind: record.kind,
      sha: record.sha,
      status: record.status,
      staged: record.staged,
      children: [],
      childrenByName: new Map(),
    };
    parent.childrenByName.set(name, node);
    parent.children.push(node);
  }

  const finalize = (node: MutableNode): ExplorerNode => {
    const children = node.children
      .sort((left, right) => {
        if (left.kind === "directory" && right.kind !== "directory") return -1;
        if (left.kind !== "directory" && right.kind === "directory") return 1;
        return left.name.localeCompare(right.name);
      })
      .map(finalize);

    return {
      name: node.name,
      path: node.path,
      kind: node.kind,
      sha: node.sha,
      status: node.status,
      staged: Boolean(node.staged || children.some((child) => child.staged)),
      children,
    };
  };

  return root.children.map(finalize);
}

function editableFiles(node: ExplorerNode): ExplorerNode[] {
  if (node.kind === "submodule") return [];
  if (node.kind !== "directory") return [node];
  return node.children.flatMap(editableFiles);
}

function allPaths(nodes: ExplorerNode[]) {
  const paths = new Set<string>();
  const visit = (node: ExplorerNode) => {
    paths.add(node.path);
    for (const child of node.children) visit(child);
  };
  for (const node of nodes) visit(node);
  return paths;
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
  copyPath,
  renameNode,
  deleteNode,
}: {
  node: ExplorerNode;
  depth: number;
  expanded: Set<string>;
  setExpanded: (next: Set<string>) => void;
  openFile: (node: ExplorerNode) => void;
  copyPath: (node: ExplorerNode) => void;
  renameNode: (node: ExplorerNode) => void;
  deleteNode: (node: ExplorerNode) => void;
}) {
  const isDirectory = node.kind === "directory";
  const isExpanded = expanded.has(node.path);
  const deleted = node.status === "deleted";
  const editable = node.kind !== "submodule";

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
              {node.kind === "symlink" ? <Link size={13} /> : <File size={13} />}
            </>
          )}
          <span className="explorer-name">{node.name}</span>
          {node.staged && <small className="explorer-staged" title="Staged">S</small>}
          {node.status && (
            <small className={`explorer-status status-${node.status}`}>
              {STATUS_LABEL[node.status]}
            </small>
          )}
        </button>
        <div className="explorer-row-actions">
          <button type="button" onClick={() => copyPath(node)} aria-label={`Copy path ${node.path}`}>
            <Copy size={11} />
          </button>
          {editable && !deleted && (
            <>
              <button type="button" onClick={() => renameNode(node)} aria-label={`Rename ${node.path}`}>
                <Pencil size={11} />
              </button>
              <button type="button" onClick={() => deleteNode(node)} aria-label={`Delete ${node.path}`}>
                <Trash2 size={11} />
              </button>
            </>
          )}
        </div>
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
              copyPath={copyPath}
              renameNode={renameNode}
              deleteNode={deleteNode}
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
      ? buildExplorerTree(
          workspace.workspace.tree,
          workspace.committedFiles,
          workspace.overlays,
          workspace.staged,
        )
      : [],
    [
      workspace.committedFiles,
      workspace.overlays,
      workspace.staged,
      workspace.workspace,
    ],
  );
  const paths = useMemo(() => allPaths(entries), [entries]);

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
    const target = preferredWorkbenchTabForPath(node.path);
    if (target === "document") {
      runtime.openTab("document", "main", { path: node.path });
      return;
    }
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

  const copyPath = async (node: ExplorerNode) => {
    try {
      await navigator.clipboard.writeText(node.path);
    } catch {
      window.prompt("Copy path", node.path);
    }
  };

  const renameNode = async (node: ExplorerNode) => {
    const nextPath = window.prompt(
      node.kind === "directory" ? "Rename/move directory" : "Rename file",
      node.path,
    );
    if (!nextPath || nextPath === node.path) return;

    try {
      if (node.kind !== "directory") {
        await workspace.renamePath(node.path, nextPath);
        runtime.openTab("editor", "main", {
          path: nextPath,
          language: languageForPath(nextPath),
        });
        return;
      }

      const normalized = nextPath.trim().replace(/^\/+|\/+$/g, "");
      if (!normalized) throw new Error("Directory path cannot be empty.");
      if (normalized.startsWith(`${node.path}/`)) {
        throw new Error("A directory cannot be moved inside itself.");
      }

      const files = editableFiles(node);
      if (!files.length) throw new Error("This directory has no editable Git files.");
      const sourcePaths = new Set(files.map((file) => file.path));
      const moves = files.map((file) => ({
        from: file.path,
        to: `${normalized}${file.path.slice(node.path.length)}`,
      }));

      for (const move of moves) {
        if (paths.has(move.to) && !sourcePaths.has(move.to)) {
          throw new Error(`Path already exists: ${move.to}`);
        }
      }
      for (const move of moves) await workspace.renamePath(move.from, move.to);

      setExpanded((current) => {
        const next = new Set(current);
        next.delete(node.path);
        next.add(normalized);
        return next;
      });
    } catch (reason) {
      window.alert(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const deleteNode = async (node: ExplorerNode) => {
    if (!window.confirm(`Delete ${node.path} from the local working tree?`)) return;
    try {
      const files = editableFiles(node);
      if (!files.length) throw new Error("This path has no editable Git files.");
      for (const file of files) await workspace.deletePath(file.path);
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
            copyPath={(node) => void copyPath(node)}
            renameNode={(node) => void renameNode(node)}
            deleteNode={(node) => void deleteNode(node)}
          />
        ))}
      </ul>
    </div>
  );
}
