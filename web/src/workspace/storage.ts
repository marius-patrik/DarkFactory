import type {
  CommittedFile,
  LocalCommit,
  StagedFile,
  WorkspaceSnapshot,
  WorkingFile,
} from "./model";

const DATABASE = "darkfactory-workbench";
const VERSION = 2;
const RECENT_KEY = "workbench-recent-workspaces-v1";

type BlobRecord = { key: string; workspaceId: string; sha: string; content: string; updatedAt: number };
type StoreName = "workspaces" | "blobs" | "overlays" | "staged" | "committed" | "commits";

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("workspaces")) {
        database.createObjectStore("workspaces", { keyPath: "id" });
      }
      if (!database.objectStoreNames.contains("blobs")) {
        database.createObjectStore("blobs", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("overlays")) {
        database.createObjectStore("overlays", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("staged")) {
        database.createObjectStore("staged", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("committed")) {
        database.createObjectStore("committed", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("commits")) {
        database.createObjectStore("commits", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  try {
    const transaction = database.transaction(name, mode);
    return await requestResult(action(transaction.objectStore(name)));
  } finally {
    database.close();
  }
}

async function allForWorkspace<T extends { workspaceId: string }>(name: StoreName, workspaceId: string) {
  const all = await withStore<T[]>(name, "readonly", (store) => store.getAll());
  return all.filter((item) => item.workspaceId === workspaceId);
}

export function saveWorkspace(snapshot: WorkspaceSnapshot) {
  return withStore("workspaces", "readwrite", (store) => store.put(snapshot));
}

export async function loadWorkspace(id: string) {
  const snapshot = await withStore<WorkspaceSnapshot | undefined>("workspaces", "readonly", (store) => store.get(id));
  return snapshot?.version === 2 ? snapshot : undefined;
}

export async function saveBlob(workspaceId: string, sha: string, content: string) {
  const record: BlobRecord = {
    key: `${workspaceId}:${sha}`,
    workspaceId,
    sha,
    content,
    updatedAt: Date.now(),
  };
  await withStore("blobs", "readwrite", (store) => store.put(record));
}

export async function loadBlob(workspaceId: string, sha: string) {
  const record = await withStore<BlobRecord | undefined>(
    "blobs",
    "readonly",
    (store) => store.get(`${workspaceId}:${sha}`),
  );
  return record?.content ?? null;
}

export async function saveOverlay(file: WorkingFile) {
  await withStore("overlays", "readwrite", (store) => store.put(file));
}

export async function removeOverlay(workspaceId: string, path: string) {
  await withStore("overlays", "readwrite", (store) => store.delete(`${workspaceId}:${path}`));
}

export function loadOverlays(workspaceId: string) {
  return allForWorkspace<WorkingFile>("overlays", workspaceId);
}

export async function saveStaged(file: StagedFile) {
  await withStore("staged", "readwrite", (store) => store.put(file));
}

export async function removeStaged(workspaceId: string, path: string) {
  await withStore("staged", "readwrite", (store) => store.delete(`${workspaceId}:${path}`));
}

export function loadStaged(workspaceId: string) {
  return allForWorkspace<StagedFile>("staged", workspaceId);
}

export async function saveCommittedFile(file: CommittedFile) {
  await withStore("committed", "readwrite", (store) => store.put(file));
}

export async function removeCommittedFile(workspaceId: string, path: string) {
  await withStore("committed", "readwrite", (store) => store.delete(`${workspaceId}:${path}`));
}

export function loadCommittedFiles(workspaceId: string) {
  return allForWorkspace<CommittedFile>("committed", workspaceId);
}

export async function saveLocalCommit(commit: LocalCommit) {
  await withStore("commits", "readwrite", (store) => store.put(commit));
}

export async function removeLocalCommit(id: string) {
  await withStore("commits", "readwrite", (store) => store.delete(id));
}

export async function loadLocalCommits(workspaceId: string) {
  const commits = await allForWorkspace<LocalCommit>("commits", workspaceId);
  return commits.sort((left, right) => left.createdAt - right.createdAt);
}

async function clearStoreForWorkspace<T extends { key?: string; id?: string; workspaceId: string }>(
  name: StoreName,
  workspaceId: string,
) {
  const items = await allForWorkspace<T>(name, workspaceId);
  const database = await openDatabase();
  try {
    const transaction = database.transaction(name, "readwrite");
    const store = transaction.objectStore(name);
    for (const item of items) {
      const key = item.key ?? item.id;
      if (key) store.delete(key);
    }
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
      transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
    });
  } finally {
    database.close();
  }
}

export async function clearStaged(workspaceId: string) {
  await clearStoreForWorkspace<StagedFile>("staged", workspaceId);
}

export async function clearLocalGitState(workspaceId: string) {
  await Promise.all([
    clearStoreForWorkspace<StagedFile>("staged", workspaceId),
    clearStoreForWorkspace<CommittedFile>("committed", workspaceId),
    clearStoreForWorkspace<LocalCommit>("commits", workspaceId),
  ]);
}

export function loadRecentWorkspaces() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as WorkspaceSnapshot[];
    return Array.isArray(parsed) ? parsed.filter((item) => item?.version === 2).slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function rememberWorkspace(snapshot: WorkspaceSnapshot) {
  const recent = loadRecentWorkspaces().filter((item) => item.id !== snapshot.id);
  recent.unshift(snapshot);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 12)));
  return recent.slice(0, 12);
}
