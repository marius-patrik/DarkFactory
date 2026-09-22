import type { WorkspaceSnapshot, WorkingFile } from "./model";

const DATABASE = "darkfactory-workbench";
const VERSION = 1;
const RECENT_KEY = "workbench-recent-workspaces-v1";

type BlobRecord = { key: string; workspaceId: string; sha: string; content: string; updatedAt: number };

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
  name: "workspaces" | "blobs" | "overlays",
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

export function saveWorkspace(snapshot: WorkspaceSnapshot) {
  return withStore("workspaces", "readwrite", (store) => store.put(snapshot));
}

export function loadWorkspace(id: string) {
  return withStore<WorkspaceSnapshot | undefined>("workspaces", "readonly", (store) => store.get(id));
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

export async function loadOverlays(workspaceId: string) {
  const all = await withStore<WorkingFile[]>("overlays", "readonly", (store) => store.getAll());
  return all.filter((file) => file.workspaceId === workspaceId);
}

export function loadRecentWorkspaces() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as WorkspaceSnapshot[];
    return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
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
