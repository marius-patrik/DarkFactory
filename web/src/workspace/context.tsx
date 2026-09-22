import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createGithubBlob,
  createGithubBranchRef,
  createGithubCommit,
  createGithubTree,
  getGithubBlob,
  getGithubBlobBytes,
  getGithubBranchRef,
  getGithubCommit,
  getGithubRepository,
  getGithubTree,
  getGithubUser,
  listGithubRefs,
  listGithubRepositories,
  updateGithubBranchRef,
  type GithubRepository,
  type GithubUser,
} from "@/github/client";
import { clearGithubToken, getGithubToken, setGithubToken } from "@/github/auth";
import {
  parseRepositoryInput,
  repositoryFromGithub,
  workspaceId,
  type CommittedFile,
  type LocalCommit,
  type StagedFile,
  type WorkspaceSnapshot,
  type WorkingFile,
  type WorkingFileStatus,
} from "./model";
import {
  clearLocalGitState,
  clearStaged,
  loadBlob,
  loadCommittedFiles,
  loadLocalCommits,
  loadOverlays,
  loadRecentWorkspaces,
  loadStaged,
  loadWorkspace,
  rememberWorkspace,
  removeOverlay,
  removeStaged,
  saveBlob,
  saveCommittedFile,
  saveLocalCommit,
  saveOverlay,
  saveStaged,
  saveWorkspace,
} from "./storage";
import {
  createStoredZip,
  downloadBytes,
  downloadText,
  virtualFiles,
  wholeFilePatch,
} from "./export";

type WorkspaceContextValue = {
  token: string | null;
  user: GithubUser | null;
  repositories: GithubRepository[];
  workspace: WorkspaceSnapshot | null;
  refs: Awaited<ReturnType<typeof listGithubRefs>>;
  overlays: WorkingFile[];
  staged: StagedFile[];
  committedFiles: CommittedFile[];
  commits: LocalCommit[];
  recent: WorkspaceSnapshot[];
  remoteHeadSha: string | null;
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  connectToken: (token: string) => Promise<void>;
  signOut: () => void;
  setDialogOpen: (open: boolean) => void;
  openRepository: (input: string, ref?: string) => Promise<void>;
  switchRef: (ref: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  readBaseFile: (path: string, sha?: string) => Promise<string>;
  readBaselineFile: (path: string) => Promise<string>;
  readFile: (path: string, sha?: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  deletePath: (path: string) => Promise<void>;
  renamePath: (path: string, nextPath: string) => Promise<void>;
  fileStatus: (path: string) => WorkingFileStatus | null;
  stageFile: (path: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (path: string) => Promise<void>;
  unstageAll: () => Promise<void>;
  discardFile: (path: string) => Promise<void>;
  commitStaged: (message: string) => Promise<LocalCommit>;
  createBranch: (branch: string) => Promise<void>;
  pushLocalCommits: () => Promise<string>;
  exportPatch: () => Promise<void>;
  exportWorkspaceZip: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function overlayKey(id: string, path: string) {
  return `${id}:${path}`;
}

function sameWorkingFile(left: WorkingFile | StagedFile, right: WorkingFile | StagedFile) {
  return (
    left.path === right.path &&
    left.status === right.status &&
    left.content === right.content &&
    left.baseSha === right.baseSha &&
    left.renamedFrom === right.renamedFrom
  );
}

function asWorkingFile(file: StagedFile): WorkingFile {
  const { stagedAt: _stagedAt, ...working } = file;
  return working;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getGithubToken());
  const [user, setUser] = useState<GithubUser | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [refs, setRefs] = useState<Awaited<ReturnType<typeof listGithubRefs>>>([]);
  const [overlays, setOverlays] = useState<WorkingFile[]>([]);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [committedFiles, setCommittedFiles] = useState<CommittedFile[]>([]);
  const [commits, setCommits] = useState<LocalCommit[]>([]);
  const [recent, setRecent] = useState<WorkspaceSnapshot[]>(() => loadRecentWorkspaces());
  const [remoteHeadSha, setRemoteHeadSha] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadLocalState = useCallback(async (id: string) => {
    const [nextOverlays, nextStaged, nextCommitted, nextCommits] = await Promise.all([
      loadOverlays(id),
      loadStaged(id),
      loadCommittedFiles(id),
      loadLocalCommits(id),
    ]);
    setOverlays(nextOverlays);
    setStaged(nextStaged);
    setCommittedFiles(nextCommitted);
    setCommits(nextCommits);
    return {
      overlays: nextOverlays,
      staged: nextStaged,
      committedFiles: nextCommitted,
      commits: nextCommits,
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    if (!token) {
      setUser(null);
      setRepositories([]);
      return;
    }
    void Promise.all([getGithubUser(token), listGithubRepositories(token)])
      .then(([nextUser, nextRepositories]) => {
        if (disposed) return;
        setUser(nextUser);
        setRepositories(nextRepositories);
      })
      .catch((reason) => {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      disposed = true;
    };
  }, [token]);

  useEffect(() => {
    const latest = recent[0];
    if (!latest || workspace) return;
    let disposed = false;
    void loadWorkspace(latest.id).then(async (cached) => {
      if (!cached || disposed) return;
      setWorkspace(cached);
      setRemoteHeadSha(cached.baseSha);
      await loadLocalState(cached.id);
      try {
        const [nextRefs, remoteCommit] = await Promise.all([
          listGithubRefs(cached.repository.fullName, token),
          getGithubCommit(cached.repository.fullName, cached.ref, token),
        ]);
        if (disposed) return;
        setRefs(nextRefs);
        setRemoteHeadSha(remoteCommit.sha);
      } catch {
        if (!disposed) setRefs([]);
      }
    });
    return () => {
      disposed = true;
    };
  }, [loadLocalState, recent, token, workspace]);

  const connectToken = useCallback(async (candidate: string) => {
    const value = candidate.trim();
    if (!value) throw new Error("GitHub token cannot be empty.");
    setLoading(true);
    setError(null);
    try {
      const [nextUser, nextRepositories] = await Promise.all([
        getGithubUser(value),
        listGithubRepositories(value),
      ]);
      setGithubToken(value);
      setToken(value);
      setUser(nextUser);
      setRepositories(nextRepositories);
    } catch (reason) {
      clearGithubToken();
      setToken(null);
      setUser(null);
      setRepositories([]);
      throw reason;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(() => {
    clearGithubToken();
    setToken(null);
    setUser(null);
    setRepositories([]);
  }, []);

  const openRepository = useCallback(
    async (input: string, requestedRef?: string) => {
      setLoading(true);
      setError(null);
      const fullName = parseRepositoryInput(input);
      try {
        const repository = await getGithubRepository(fullName, token);
        const ref = requestedRef || repository.default_branch;
        const id = workspaceId(repository.full_name, ref);
        const cached = await loadWorkspace(id);
        const remoteCommit = await getGithubCommit(repository.full_name, ref, token);
        const localState = cached ? await Promise.all([
          loadOverlays(id),
          loadStaged(id),
          loadCommittedFiles(id),
          loadLocalCommits(id),
        ]) : [[], [], [], []] as const;
        const hasLocalState = localState.some((items) => items.length > 0);

        if (cached && hasLocalState && cached.baseSha !== remoteCommit.sha) {
          setWorkspace(cached);
          setOverlays(localState[0]);
          setStaged(localState[1]);
          setCommittedFiles(localState[2]);
          setCommits(localState[3]);
          setRemoteHeadSha(remoteCommit.sha);
          setRecent(rememberWorkspace(cached));
          setRefs(await listGithubRefs(repository.full_name, token).catch(() => []));
          setError("Remote ref changed. Local work remains pinned to its original base until you sync explicitly.");
          setDialogOpen(false);
          return;
        }

        const tree = await getGithubTree(repository.full_name, remoteCommit.commit.tree.sha, token);
        const snapshot: WorkspaceSnapshot = {
          version: 2,
          id,
          repository: repositoryFromGithub(repository),
          ref,
          baseSha: remoteCommit.sha,
          treeSha: tree.sha,
          tree: tree.tree,
          updatedAt: Date.now(),
        };
        await saveWorkspace(snapshot);
        setWorkspace(snapshot);
        setRemoteHeadSha(remoteCommit.sha);
        await loadLocalState(snapshot.id);
        setRecent(rememberWorkspace(snapshot));
        setRefs(await listGithubRefs(repository.full_name, token).catch(() => []));
        setDialogOpen(false);
      } catch (reason) {
        const matching = recent.find(
          (item) => item.repository.fullName === fullName && (!requestedRef || item.ref === requestedRef),
        );
        const cached = matching ? await loadWorkspace(matching.id) : undefined;
        if (cached) {
          setWorkspace(cached);
          setRemoteHeadSha(cached.baseSha);
          await loadLocalState(cached.id);
          setError("GitHub is unavailable; using the cached workspace snapshot.");
          setDialogOpen(false);
        } else {
          throw reason;
        }
      } finally {
        setLoading(false);
      }
    },
    [loadLocalState, recent, token],
  );

  const switchRef = useCallback(
    async (ref: string) => {
      if (!workspace) return;
      await openRepository(workspace.repository.fullName, ref);
    },
    [openRepository, workspace],
  );

  const refreshWorkspace = useCallback(async () => {
    if (!workspace) return;
    await openRepository(workspace.repository.fullName, workspace.ref);
  }, [openRepository, workspace]);

  const readBaseFile = useCallback(
    async (path: string, sha?: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const entry = sha
        ? { sha }
        : workspace.tree.find((candidate) => candidate.path === path && candidate.type === "blob");
      if (!entry?.sha) throw new Error(`File does not exist in the remote base tree: ${path}`);
      const cached = await loadBlob(workspace.id, entry.sha);
      if (cached !== null) return cached;
      const content = await getGithubBlob(workspace.repository.fullName, entry.sha, token);
      await saveBlob(workspace.id, entry.sha, content);
      return content;
    },
    [token, workspace],
  );

  const readBaselineFile = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const committed = committedFiles.find((candidate) => candidate.path === path);
      if (committed) {
        if (committed.deleted) throw new Error(`File is deleted in local commits: ${path}`);
        if (committed.content !== undefined) return committed.content;
      }
      return readBaseFile(path);
    },
    [committedFiles, readBaseFile, workspace],
  );

  const baselineExists = useCallback(
    (path: string) => {
      if (!workspace) return false;
      const committed = committedFiles.find((candidate) => candidate.path === path);
      if (committed) return !committed.deleted;
      return workspace.tree.some((entry) => entry.path === path && entry.type === "blob");
    },
    [committedFiles, workspace],
  );

  const readFile = useCallback(
    async (path: string, sha?: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const overlay = overlays.find((candidate) => candidate.path === path);
      if (overlay?.status === "deleted") throw new Error(`File is deleted locally: ${path}`);
      if (overlay?.content !== undefined) return overlay.content;
      if (sha) return readBaseFile(path, sha);
      return readBaselineFile(path);
    },
    [overlays, readBaseFile, readBaselineFile, workspace],
  );

  const refreshOverlays = useCallback(async () => {
    if (!workspace) return;
    setOverlays(await loadOverlays(workspace.id));
  }, [workspace]);

  const commitOverlay = useCallback(
    async (file: WorkingFile | null, path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      if (file) await saveOverlay(file);
      else await removeOverlay(workspace.id, path);
      await refreshOverlays();
    },
    [refreshOverlays, workspace],
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const currentOverlay = overlays.find((entry) => entry.path === path);
      const exists = baselineExists(path);
      if (exists) {
        const baselineContent = await readBaselineFile(path);
        if (baselineContent === content) {
          await commitOverlay(null, path);
          return;
        }
      }
      const remoteEntry = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");
      await commitOverlay(
        {
          key: overlayKey(workspace.id, path),
          workspaceId: workspace.id,
          path,
          status: currentOverlay?.status === "renamed" ? "renamed" : exists ? "modified" : "added",
          content,
          baseSha: remoteEntry?.sha ?? currentOverlay?.baseSha,
          renamedFrom: currentOverlay?.renamedFrom,
          updatedAt: Date.now(),
        },
        path,
      );
    },
    [baselineExists, commitOverlay, overlays, readBaselineFile, workspace],
  );

  const createFile = useCallback(
    async (path: string, content = "") => {
      if (!workspace) throw new Error("No workspace is open.");
      const normalized = path.trim().replace(/^\/+/, "");
      if (!normalized) throw new Error("File path cannot be empty.");
      const existsInWorkingTree = overlays.some(
        (entry) => entry.path === normalized && entry.status !== "deleted",
      ) || (!overlays.some((entry) => entry.path === normalized && entry.status === "deleted") && baselineExists(normalized));
      if (existsInWorkingTree) throw new Error(`Path already exists: ${normalized}`);
      await writeFile(normalized, content);
    },
    [baselineExists, overlays, workspace, writeFile],
  );

  const deletePath = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const existing = overlays.find((entry) => entry.path === path);
      if (!baselineExists(path) && existing?.status === "added") {
        await commitOverlay(null, path);
        return;
      }
      const remoteEntry = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");
      await commitOverlay(
        {
          key: overlayKey(workspace.id, path),
          workspaceId: workspace.id,
          path,
          status: "deleted",
          baseSha: remoteEntry?.sha ?? existing?.baseSha,
          updatedAt: Date.now(),
        },
        path,
      );
    },
    [baselineExists, commitOverlay, overlays, workspace],
  );

  const renamePath = useCallback(
    async (path: string, nextPath: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const target = nextPath.trim().replace(/^\/+/, "");
      if (!target || target === path) return;
      const targetExists = overlays.some(
        (entry) => entry.path === target && entry.status !== "deleted",
      ) || (!overlays.some((entry) => entry.path === target && entry.status === "deleted") && baselineExists(target));
      if (targetExists) throw new Error(`Path already exists: ${target}`);

      const content = await readFile(path);
      const sourceWasAdded = !baselineExists(path);
      const remoteEntry = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");

      if (sourceWasAdded) {
        await removeOverlay(workspace.id, path);
        await saveOverlay({
          key: overlayKey(workspace.id, target),
          workspaceId: workspace.id,
          path: target,
          status: "added",
          content,
          updatedAt: Date.now(),
        });
        await refreshOverlays();
        return;
      }

      await saveOverlay({
        key: overlayKey(workspace.id, target),
        workspaceId: workspace.id,
        path: target,
        status: "renamed",
        content,
        baseSha: remoteEntry?.sha,
        renamedFrom: path,
        updatedAt: Date.now(),
      });
      await saveOverlay({
        key: overlayKey(workspace.id, path),
        workspaceId: workspace.id,
        path,
        status: "deleted",
        baseSha: remoteEntry?.sha,
        updatedAt: Date.now(),
      });
      await refreshOverlays();
    },
    [baselineExists, readFile, refreshOverlays, workspace],
  );

  const fileStatus = useCallback(
    (path: string) => overlays.find((entry) => entry.path === path)?.status ?? null,
    [overlays],
  );

  const stageGroupFor = useCallback(
    (path: string) => {
      const selected = overlays.find((entry) => entry.path === path);
      if (!selected) return [];
      const group = [selected];
      if (selected.status === "renamed" && selected.renamedFrom) {
        const sourceDelete = overlays.find(
          (entry) => entry.path === selected.renamedFrom && entry.status === "deleted",
        );
        if (sourceDelete) group.push(sourceDelete);
      } else if (selected.status === "deleted") {
        const renameTarget = overlays.find(
          (entry) => entry.status === "renamed" && entry.renamedFrom === selected.path,
        );
        if (renameTarget) group.push(renameTarget);
      }
      return group;
    },
    [overlays],
  );

  const stageFile = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      for (const file of stageGroupFor(path)) {
        await saveStaged({ ...file, stagedAt: Date.now() });
      }
      setStaged(await loadStaged(workspace.id));
    },
    [stageGroupFor, workspace],
  );

  const stageAll = useCallback(async () => {
    if (!workspace) throw new Error("No workspace is open.");
    const now = Date.now();
    for (const file of overlays) await saveStaged({ ...file, stagedAt: now });
    setStaged(await loadStaged(workspace.id));
  }, [overlays, workspace]);

  const unstageFile = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const selected = staged.find((entry) => entry.path === path);
      const paths = new Set([path]);
      if (selected?.status === "renamed" && selected.renamedFrom) paths.add(selected.renamedFrom);
      if (selected?.status === "deleted") {
        const target = staged.find(
          (entry) => entry.status === "renamed" && entry.renamedFrom === selected.path,
        );
        if (target) paths.add(target.path);
      }
      for (const candidate of paths) await removeStaged(workspace.id, candidate);
      setStaged(await loadStaged(workspace.id));
    },
    [staged, workspace],
  );

  const unstageAll = useCallback(async () => {
    if (!workspace) throw new Error("No workspace is open.");
    await clearStaged(workspace.id);
    setStaged([]);
  }, [workspace]);

  const discardFile = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const selected = overlays.find((entry) => entry.path === path);
      const paths = new Set([path]);
      if (selected?.status === "renamed" && selected.renamedFrom) paths.add(selected.renamedFrom);
      if (selected?.status === "deleted") {
        const target = overlays.find(
          (entry) => entry.status === "renamed" && entry.renamedFrom === selected.path,
        );
        if (target) paths.add(target.path);
      }
      for (const candidate of paths) {
        await removeOverlay(workspace.id, candidate);
        await removeStaged(workspace.id, candidate);
      }
      await Promise.all([refreshOverlays(), loadStaged(workspace.id).then(setStaged)]);
    },
    [overlays, refreshOverlays, workspace],
  );

  const commitStaged = useCallback(
    async (message: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const normalizedMessage = message.trim();
      if (!normalizedMessage) throw new Error("Commit message cannot be empty.");
      if (!staged.length) throw new Error("There are no staged changes.");

      const now = Date.now();
      const commit: LocalCommit = {
        id: `${workspace.id}:local:${now}:${crypto.randomUUID()}`,
        workspaceId: workspace.id,
        message: normalizedMessage,
        createdAt: now,
        files: staged.map(asWorkingFile),
      };

      for (const file of staged) {
        await saveCommittedFile({
          key: overlayKey(workspace.id, file.path),
          workspaceId: workspace.id,
          path: file.path,
          content: file.status === "deleted" ? undefined : file.content,
          deleted: file.status === "deleted",
          baseSha: file.baseSha,
          updatedAt: now,
        });
        const current = overlays.find((entry) => entry.path === file.path);
        if (current && sameWorkingFile(current, file)) await removeOverlay(workspace.id, file.path);
      }
      await saveLocalCommit(commit);
      await clearStaged(workspace.id);
      await loadLocalState(workspace.id);
      return commit;
    },
    [loadLocalState, overlays, staged, workspace],
  );


  const createBranch = useCallback(
    async (branch: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      if (!token) throw new Error("Connect a GitHub token before creating a branch.");
      const name = branch.trim();
      if (!name || /[\s~^:?*\\[\\]\\\\]/.test(name) || name.includes("..") || name.startsWith("/") || name.endsWith("/")) {
        throw new Error("Enter a valid Git branch name.");
      }
      setLoading(true);
      setError(null);
      try {
        await createGithubBranchRef(workspace.repository.fullName, name, workspace.baseSha, token);
        setRefs(await listGithubRefs(workspace.repository.fullName, token));
        await openRepository(workspace.repository.fullName, name);
      } finally {
        setLoading(false);
      }
    },
    [openRepository, token, workspace],
  );

  const pushLocalCommits = useCallback(async () => {
    if (!workspace) throw new Error("No workspace is open.");
    if (!token) throw new Error("Connect a GitHub token before pushing.");
    if (!commits.length) throw new Error("There are no local commits to push.");
    const branch = refs.find((candidate) => candidate.kind === "branch" && candidate.name === workspace.ref);
    if (!branch) throw new Error("Push requires a branch workspace. Tags and detached refs are read-only.");

    setLoading(true);
    setError(null);
    try {
      const liveRef = await getGithubBranchRef(workspace.repository.fullName, workspace.ref, token);
      if (liveRef.object.sha !== workspace.baseSha) {
        setRemoteHeadSha(liveRef.object.sha);
        throw new Error(
          `Remote branch moved from ${workspace.baseSha.slice(0, 7)} to ${liveRef.object.sha.slice(0, 7)}. Fetch/sync before pushing.`,
        );
      }

      let parentSha = workspace.baseSha;
      let treeSha = workspace.treeSha;

      for (const localCommit of commits) {
        const mutations = [];
        for (const file of localCommit.files) {
          const sourcePath = file.renamedFrom || file.path;
          const existing = workspace.tree.find(
            (entry) => entry.type === "blob" && (entry.path === file.path || entry.path === sourcePath),
          );
          const mode = existing?.mode && ["100644", "100755", "120000"].includes(existing.mode)
            ? existing.mode
            : "100644";

          if (file.status === "deleted") {
            mutations.push({ path: file.path, mode, type: "blob" as const, sha: null });
            continue;
          }

          const blob = await createGithubBlob(
            workspace.repository.fullName,
            file.content ?? "",
            token,
          );
          mutations.push({ path: file.path, mode, type: "blob" as const, sha: blob.sha });
        }

        const tree = await createGithubTree(
          workspace.repository.fullName,
          treeSha,
          mutations,
          token,
        );
        const commit = await createGithubCommit(
          workspace.repository.fullName,
          localCommit.message,
          tree.sha,
          [parentSha],
          token,
        );
        parentSha = commit.sha;
        treeSha = tree.sha;
      }

      await updateGithubBranchRef(
        workspace.repository.fullName,
        workspace.ref,
        parentSha,
        token,
      );

      const remoteCommit = await getGithubCommit(workspace.repository.fullName, parentSha, token);
      const remoteTree = await getGithubTree(
        workspace.repository.fullName,
        remoteCommit.commit.tree.sha,
        token,
      );
      const snapshot: WorkspaceSnapshot = {
        ...workspace,
        baseSha: parentSha,
        treeSha: remoteTree.sha,
        tree: remoteTree.tree,
        updatedAt: Date.now(),
      };
      await saveWorkspace(snapshot);
      await clearLocalGitState(workspace.id);

      for (const overlay of overlays) {
        const remoteEntry = remoteTree.tree.find(
          (entry) => entry.type === "blob" && entry.path === overlay.path,
        );
        if (overlay.status === "deleted" && !remoteEntry) {
          await removeOverlay(workspace.id, overlay.path);
          continue;
        }
        if (overlay.status === "added" || overlay.status === "renamed") {
          if (remoteEntry) {
            await saveOverlay({
              ...overlay,
              status: "modified",
              baseSha: remoteEntry.sha,
              renamedFrom: undefined,
              updatedAt: Date.now(),
            });
          }
        }
      }

      setWorkspace(snapshot);
      setRemoteHeadSha(parentSha);
      setRecent(rememberWorkspace(snapshot));
      await loadLocalState(workspace.id);
      return parentSha;
    } finally {
      setLoading(false);
    }
  }, [commits, loadLocalState, overlays, refs, token, workspace]);

  const exportPatch = useCallback(async () => {
    if (!workspace) throw new Error("No workspace is open.");
    const paths = new Set<string>();
    for (const file of committedFiles) paths.add(file.path);
    for (const file of overlays) paths.add(file.path);

    const parts: string[] = [];
    for (const path of [...paths].sort()) {
      const remoteEntry = workspace.tree.find(
        (entry) => entry.type === "blob" && entry.path === path,
      );
      let before: string | null = null;
      let after: string | null = null;
      if (remoteEntry) before = await readBaseFile(path, remoteEntry.sha);
      try {
        after = await readFile(path);
      } catch {
        after = null;
      }
      if (before === after) continue;
      parts.push(wholeFilePatch(path, before, after));
    }

    if (!parts.length) throw new Error("There are no local changes to export.");
    const filename = `${workspace.repository.name}-${workspace.ref.replace(/[^A-Za-z0-9._-]+/g, "-")}.patch`;
    downloadText(parts.join("\n"), filename, "text/x-patch;charset=utf-8");
  }, [committedFiles, overlays, readBaseFile, readFile, workspace]);

  const exportWorkspaceZip = useCallback(async () => {
    if (!workspace) throw new Error("No workspace is open.");
    setLoading(true);
    setError(null);
    try {
      const files = virtualFiles(workspace.tree, committedFiles, overlays);
      const zipFiles = [];
      for (const file of files) {
        const bytes = file.content !== undefined
          ? new TextEncoder().encode(file.content)
          : file.sha
            ? await getGithubBlobBytes(workspace.repository.fullName, file.sha, token)
            : new Uint8Array();
        zipFiles.push({ path: file.path, bytes });
      }
      const archive = createStoredZip(zipFiles);
      const filename = `${workspace.repository.name}-${workspace.ref.replace(/[^A-Za-z0-9._-]+/g, "-")}-workspace.zip`;
      downloadBytes(archive, filename, "application/zip");
    } finally {
      setLoading(false);
    }
  }, [committedFiles, overlays, token, workspace]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      token,
      user,
      repositories,
      workspace,
      refs,
      overlays,
      staged,
      committedFiles,
      commits,
      recent,
      remoteHeadSha,
      loading,
      error,
      dialogOpen,
      connectToken,
      signOut,
      setDialogOpen,
      openRepository,
      switchRef,
      refreshWorkspace,
      readBaseFile,
      readBaselineFile,
      readFile,
      writeFile,
      createFile,
      deletePath,
      renamePath,
      fileStatus,
      stageFile,
      stageAll,
      unstageFile,
      unstageAll,
      discardFile,
      commitStaged,
      createBranch,
      pushLocalCommits,
      exportPatch,
      exportWorkspaceZip,
    }),
    [
      token,
      user,
      repositories,
      workspace,
      refs,
      overlays,
      staged,
      committedFiles,
      commits,
      recent,
      remoteHeadSha,
      loading,
      error,
      dialogOpen,
      connectToken,
      signOut,
      openRepository,
      switchRef,
      refreshWorkspace,
      readBaseFile,
      readBaselineFile,
      readFile,
      writeFile,
      createFile,
      deletePath,
      renamePath,
      fileStatus,
      stageFile,
      stageAll,
      unstageFile,
      unstageAll,
      discardFile,
      commitStaged,
      createBranch,
      pushLocalCommits,
      exportPatch,
      exportWorkspaceZip,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace context is not available");
  return value;
}
