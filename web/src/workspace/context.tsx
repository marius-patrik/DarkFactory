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
  getGithubBlob,
  getGithubRepository,
  getGithubTree,
  getGithubUser,
  listGithubRefs,
  listGithubRepositories,
  type GithubRepository,
  type GithubUser,
} from "@/github/client";
import {
  beginGithubSignIn,
  clearGithubToken,
  completeGithubSignIn,
  getGithubToken,
} from "@/github/auth";
import { githubAuthConfigured } from "@/github/config";
import {
  parseRepositoryInput,
  repositoryFromGithub,
  workspaceId,
  type WorkspaceSnapshot,
  type WorkingFile,
  type WorkingFileStatus,
} from "./model";
import {
  loadBlob,
  loadOverlays,
  loadRecentWorkspaces,
  loadWorkspace,
  rememberWorkspace,
  removeOverlay,
  saveBlob,
  saveOverlay,
  saveWorkspace,
} from "./storage";

type WorkspaceContextValue = {
  authConfigured: boolean;
  token: string | null;
  user: GithubUser | null;
  repositories: GithubRepository[];
  workspace: WorkspaceSnapshot | null;
  refs: Awaited<ReturnType<typeof listGithubRefs>>;
  overlays: WorkingFile[];
  recent: WorkspaceSnapshot[];
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
  signIn: () => Promise<void>;
  signOut: () => void;
  setDialogOpen: (open: boolean) => void;
  openRepository: (input: string, ref?: string) => Promise<void>;
  switchRef: (ref: string) => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  readFile: (path: string, sha?: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (path: string, content?: string) => Promise<void>;
  deletePath: (path: string) => Promise<void>;
  renamePath: (path: string, nextPath: string) => Promise<void>;
  fileStatus: (path: string) => WorkingFileStatus | null;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function overlayKey(id: string, path: string) {
  return `${id}:${path}`;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getGithubToken());
  const [user, setUser] = useState<GithubUser | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null);
  const [refs, setRefs] = useState<Awaited<ReturnType<typeof listGithubRefs>>>([]);
  const [overlays, setOverlays] = useState<WorkingFile[]>([]);
  const [recent, setRecent] = useState<WorkspaceSnapshot[]>(() => loadRecentWorkspaces());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let disposed = false;
    void (async () => {
      try {
        const nextToken = await completeGithubSignIn();
        if (disposed) return;
        setToken(nextToken);
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      }
    })();
    return () => {
      disposed = true;
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
      setOverlays(await loadOverlays(cached.id));
      try {
        setRefs(await listGithubRefs(cached.repository.fullName, token));
      } catch {
        setRefs([]);
      }
    });
    return () => {
      disposed = true;
    };
  }, [recent, token, workspace]);

  const signIn = useCallback(async () => {
    setError(null);
    await beginGithubSignIn();
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
        const tree = await getGithubTree(repository.full_name, ref, token);
        const snapshot: WorkspaceSnapshot = {
          id: workspaceId(repository.full_name, ref),
          repository: repositoryFromGithub(repository),
          ref,
          baseSha: tree.sha,
          tree: tree.tree,
          updatedAt: Date.now(),
        };
        await saveWorkspace(snapshot);
        const nextOverlays = await loadOverlays(snapshot.id);
        setWorkspace(snapshot);
        setOverlays(nextOverlays);
        setRecent(rememberWorkspace(snapshot));
        setRefs(await listGithubRefs(repository.full_name, token).catch(() => []));
        setDialogOpen(false);
      } catch (reason) {
        const matching = recent.find((item) => item.repository.fullName === fullName && (!requestedRef || item.ref === requestedRef));
        const cached = matching ? await loadWorkspace(matching.id) : undefined;
        if (cached) {
          setWorkspace(cached);
          setOverlays(await loadOverlays(cached.id));
          setError("GitHub is unavailable; using the cached workspace snapshot.");
          setDialogOpen(false);
        } else {
          throw reason;
        }
      } finally {
        setLoading(false);
      }
    },
    [recent, token],
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
      if (!entry?.sha) throw new Error(`File does not exist in the base tree: ${path}`);
      const cached = await loadBlob(workspace.id, entry.sha);
      if (cached !== null) return cached;
      const content = await getGithubBlob(workspace.repository.fullName, entry.sha, token);
      await saveBlob(workspace.id, entry.sha, content);
      return content;
    },
    [token, workspace],
  );

  const readFile = useCallback(
    async (path: string, sha?: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const overlay = overlays.find((candidate) => candidate.path === path);
      if (overlay?.status === "deleted") throw new Error(`File is deleted locally: ${path}`);
      if (overlay?.content !== undefined) return overlay.content;
      return readBaseFile(path, sha);
    },
    [overlays, readBaseFile, workspace],
  );

  const commitOverlay = useCallback(
    async (file: WorkingFile | null, path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      if (file) await saveOverlay(file);
      else await removeOverlay(workspace.id, path);
      setOverlays(await loadOverlays(workspace.id));
    },
    [workspace],
  );

  const writeFile = useCallback(
    async (path: string, content: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const base = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");
      if (base) {
        const baseContent = await readBaseFile(path, base.sha);
        if (baseContent === content) {
          await commitOverlay(null, path);
          return;
        }
      }
      await commitOverlay(
        {
          key: overlayKey(workspace.id, path),
          workspaceId: workspace.id,
          path,
          status: base ? "modified" : "added",
          content,
          baseSha: base?.sha,
          updatedAt: Date.now(),
        },
        path,
      );
    },
    [commitOverlay, readBaseFile, workspace],
  );

  const createFile = useCallback(
    async (path: string, content = "") => {
      if (!workspace) throw new Error("No workspace is open.");
      const normalized = path.trim().replace(/^\/+/, "");
      if (!normalized) throw new Error("File path cannot be empty.");
      const existsInBase = workspace.tree.some((entry) => entry.path === normalized);
      const existsInOverlay = overlays.some((entry) => entry.path === normalized && entry.status !== "deleted");
      if (existsInBase || existsInOverlay) throw new Error(`Path already exists: ${normalized}`);
      await writeFile(normalized, content);
    },
    [overlays, workspace, writeFile],
  );

  const deletePath = useCallback(
    async (path: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const existing = overlays.find((entry) => entry.path === path);
      const base = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");
      if (!base && existing?.status === "added") {
        await commitOverlay(null, path);
        return;
      }
      await commitOverlay(
        {
          key: overlayKey(workspace.id, path),
          workspaceId: workspace.id,
          path,
          status: "deleted",
          baseSha: base?.sha ?? existing?.baseSha,
          updatedAt: Date.now(),
        },
        path,
      );
    },
    [commitOverlay, overlays, workspace],
  );

  const renamePath = useCallback(
    async (path: string, nextPath: string) => {
      if (!workspace) throw new Error("No workspace is open.");
      const target = nextPath.trim().replace(/^\/+/, "");
      if (!target || target === path) return;
      if (
        workspace.tree.some((entry) => entry.path === target) ||
        overlays.some((entry) => entry.path === target && entry.status !== "deleted")
      ) {
        throw new Error(`Path already exists: ${target}`);
      }
      const content = await readFile(path);
      const base = workspace.tree.find((entry) => entry.path === path && entry.type === "blob");
      await saveOverlay({
        key: overlayKey(workspace.id, target),
        workspaceId: workspace.id,
        path: target,
        status: "renamed",
        content,
        baseSha: base?.sha,
        renamedFrom: path,
        updatedAt: Date.now(),
      });
      await deletePath(path);
      setOverlays(await loadOverlays(workspace.id));
    },
    [deletePath, overlays, readFile, workspace],
  );

  const fileStatus = useCallback(
    (path: string) => overlays.find((entry) => entry.path === path)?.status ?? null,
    [overlays],
  );

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      authConfigured: githubAuthConfigured(),
      token,
      user,
      repositories,
      workspace,
      refs,
      overlays,
      recent,
      loading,
      error,
      dialogOpen,
      signIn,
      signOut,
      setDialogOpen,
      openRepository,
      switchRef,
      refreshWorkspace,
      readFile,
      writeFile,
      createFile,
      deletePath,
      renamePath,
      fileStatus,
    }),
    [
      token,
      user,
      repositories,
      workspace,
      refs,
      overlays,
      recent,
      loading,
      error,
      dialogOpen,
      signIn,
      signOut,
      openRepository,
      switchRef,
      refreshWorkspace,
      readFile,
      writeFile,
      createFile,
      deletePath,
      renamePath,
      fileStatus,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace context is not available");
  return value;
}
