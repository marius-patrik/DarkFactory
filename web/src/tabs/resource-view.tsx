import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getGithubBlobBytes,
  getGithubCommit,
  getGithubPullRequest,
  getGithubTree,
} from "@/github/client";
import { isTextResourcePath, mimeForPath, representationForPath } from "@/renderers/capabilities";
import { RenderedResource } from "@/renderers/registry";
import { useWorkspace } from "@/workspace/context";

export type ResourceRenderer = "editor" | "browser";
export type CompareMode =
  | "none"
  | "working"
  | "staged"
  | "commit"
  | "branch"
  | "pull-request";

export type ResourceSnapshot = {
  label: string;
  exists: boolean;
  content: string | null;
  bytes: Uint8Array | null;
  mime: string;
};

export type ResourceComparison = {
  before: ResourceSnapshot;
  after: ResourceSnapshot;
};

export { RenderedResource };

function snapshotFromBytes(path: string, label: string, bytes: Uint8Array | null): ResourceSnapshot {
  if (!bytes) {
    return { label, exists: false, content: null, bytes: null, mime: mimeForPath(path) };
  }
  return {
    label,
    exists: true,
    content: isTextResourcePath(path) ? new TextDecoder().decode(bytes) : null,
    bytes,
    mime: mimeForPath(path),
  };
}

function snapshotFromContent(path: string, label: string, content: string | undefined): ResourceSnapshot {
  if (content === undefined) {
    return { label, exists: false, content: null, bytes: null, mime: mimeForPath(path) };
  }
  return {
    label,
    exists: true,
    content,
    bytes: new TextEncoder().encode(content),
    mime: mimeForPath(path),
  };
}

async function remoteSnapshot(
  fullName: string,
  token: string | null,
  ref: string,
  path: string,
  label: string,
): Promise<ResourceSnapshot> {
  const commit = await getGithubCommit(fullName, ref, token);
  const tree = await getGithubTree(fullName, commit.commit.tree.sha, token);
  const entry = tree.tree.find((candidate) => candidate.type === "blob" && candidate.path === path);
  if (!entry) return snapshotFromBytes(path, label, null);
  return snapshotFromBytes(
    path,
    label,
    await getGithubBlobBytes(fullName, entry.sha, token),
  );
}

export function useResourceComparison(path: string, compare: CompareMode, target: string) {
  const workspace = useWorkspace();
  const [current, setCurrent] = useState<ResourceSnapshot | null>(null);
  const [comparison, setComparison] = useState<ResourceComparison | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    if (!path || !workspace.workspace) {
      setCurrent(null);
      setComparison(null);
      setLoading(false);
      setError(null);
      return;
    }

    const snapshot = workspace.workspace;
    const token = workspace.token;
    const overlays = workspace.overlays;
    const staged = workspace.staged;
    const committed = workspace.committedFiles;

    const base = async (requestedPath = path, label = "Local base") => {
      const committedFile = committed.find((candidate) => candidate.path === requestedPath);
      if (committedFile) {
        if (committedFile.deleted) return snapshotFromBytes(requestedPath, label, null);
        return snapshotFromContent(requestedPath, label, committedFile.content);
      }
      const entry = snapshot.tree.find(
        (candidate) => candidate.type === "blob" && candidate.path === requestedPath,
      );
      if (!entry) return snapshotFromBytes(requestedPath, label, null);
      return snapshotFromBytes(
        requestedPath,
        label,
        await getGithubBlobBytes(snapshot.repository.fullName, entry.sha, token),
      );
    };

    const working = async () => {
      const overlay = overlays.find((candidate) => candidate.path === path);
      if (!overlay) return base(path, "Working tree");
      if (overlay.status === "deleted") return snapshotFromBytes(path, "Working tree", null);
      return snapshotFromContent(path, "Working tree", overlay.content);
    };

    const stagedSnapshot = async () => {
      const stagedFile = staged.find((candidate) => candidate.path === path);
      if (!stagedFile) return base(path, "Staged");
      if (stagedFile.status === "deleted") return snapshotFromBytes(path, "Staged", null);
      return snapshotFromContent(path, "Staged", stagedFile.content);
    };

    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const nextCurrent = await working();
        let nextComparison: ResourceComparison | null = null;

        if (compare === "working") {
          nextComparison = {
            before: await base(path, "Local base"),
            after: nextCurrent,
          };
        } else if (compare === "staged") {
          nextComparison = {
            before: await base(path, "Local base"),
            after: await stagedSnapshot(),
          };
        } else if (compare === "commit") {
          if (!target.trim()) throw new Error("Enter a commit SHA or ref to compare.");
          const commit = await getGithubCommit(snapshot.repository.fullName, target.trim(), token);
          const parent = commit.parents[0]?.sha;
          nextComparison = {
            before: parent
              ? await remoteSnapshot(snapshot.repository.fullName, token, parent, path, `Parent ${parent.slice(0, 7)}`)
              : snapshotFromBytes(path, "Empty tree", null),
            after: await remoteSnapshot(
              snapshot.repository.fullName,
              token,
              commit.sha,
              path,
              `Commit ${commit.sha.slice(0, 7)}`,
            ),
          };
        } else if (compare === "branch") {
          if (!target.trim()) throw new Error("Select a branch to compare.");
          nextComparison = {
            before: await remoteSnapshot(
              snapshot.repository.fullName,
              token,
              snapshot.baseSha,
              path,
              `${snapshot.ref} @ ${snapshot.baseSha.slice(0, 7)}`,
            ),
            after: await remoteSnapshot(
              snapshot.repository.fullName,
              token,
              target.trim(),
              path,
              target.trim(),
            ),
          };
        } else if (compare === "pull-request") {
          const number = Number(target);
          if (!Number.isInteger(number) || number < 1) throw new Error("Enter a pull request number.");
          const pull = await getGithubPullRequest(snapshot.repository.fullName, number, token);
          const baseRepository = pull.base.repo?.full_name || snapshot.repository.fullName;
          const headRepository = pull.head.repo?.full_name || snapshot.repository.fullName;
          nextComparison = {
            before: await remoteSnapshot(
              baseRepository,
              token,
              pull.base.sha,
              path,
              `PR #${number} base`,
            ),
            after: await remoteSnapshot(
              headRepository,
              token,
              pull.head.sha,
              path,
              `PR #${number} head`,
            ),
          };
        }

        if (disposed) return;
        setCurrent(nextCurrent);
        setComparison(nextComparison);
      } catch (reason) {
        if (!disposed) {
          setCurrent(null);
          setComparison(null);
          setError(reason instanceof Error ? reason.message : String(reason));
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    })();

    return () => {
      disposed = true;
    };
  }, [
    compare,
    path,
    target,
    workspace.committedFiles,
    workspace.overlays,
    workspace.staged,
    workspace.token,
    workspace.workspace,
  ]);

  return { current, comparison, loading, error };
}

export function ResourceControls({
  path,
  renderer,
  review,
  compare,
  target,
  onChange,
}: {
  path: string;
  renderer: ResourceRenderer;
  review: boolean;
  compare: CompareMode;
  target: string;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const workspace = useWorkspace();
  const branches = useMemo(
    () => workspace.refs.filter((candidate) => candidate.kind === "branch"),
    [workspace.refs],
  );

  const updateCompare = useCallback((value: CompareMode) => {
    const patch: Record<string, unknown> = { compare: value };
    if (value === "branch") {
      patch.compareTarget = branches.find((branch) => branch.name !== workspace.workspace?.ref)?.name ?? "";
    } else if (value === "none" || value === "working" || value === "staged") {
      patch.compareTarget = "";
    }
    onChange(patch);
  }, [branches, onChange, workspace.workspace?.ref]);

  return (
    <div className="resource-controls">
      <span className="resource-path" title={path}>{path}</span>
      <select
        value={renderer}
        onChange={(event) => onChange({ renderer: event.target.value as ResourceRenderer })}
        aria-label="Renderer"
        title="Renderer"
      >
        <option value="editor">Editor</option>
        <option value="browser">Browser</option>
      </select>
      <button
        type="button"
        aria-pressed={review}
        onClick={() => onChange({ review: !review })}
        title="Review"
      >
        Review
      </button>
      <select
        value={compare}
        onChange={(event) => updateCompare(event.target.value as CompareMode)}
        aria-label="Compare"
        title="Compare"
      >
        <option value="none">Compare: None</option>
        <option value="working">Working Tree</option>
        <option value="staged">Staged</option>
        <option value="commit">Commit</option>
        <option value="branch">Branch</option>
        <option value="pull-request">Pull Request</option>
      </select>
      {compare === "branch" && (
        <select
          value={target}
          onChange={(event) => onChange({ compareTarget: event.target.value })}
          aria-label="Compare branch"
        >
          <option value="">Select branch</option>
          {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
        </select>
      )}
      {(compare === "commit" || compare === "pull-request") && (
        <input
          value={target}
          onChange={(event) => onChange({ compareTarget: event.target.value })}
          placeholder={compare === "commit" ? "commit SHA/ref" : "PR #"}
          aria-label={compare === "commit" ? "Compare commit" : "Pull request number"}
        />
      )}
      <span className="resource-representation">{representationForPath(path)}</span>
    </div>
  );
}

export function ReviewOverlay({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;
  return (
    <div className="resource-review-overlay">
      <strong>Review</strong>
      <span>No review provider is attached to this resource.</span>
    </div>
  );
}
