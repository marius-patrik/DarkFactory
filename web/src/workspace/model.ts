import type { GithubRef, GithubRepository, GithubTreeEntry, GithubUser } from "@/github/client";

export type WorkspaceRepository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl: string;
  canPush: boolean;
};

export type WorkspaceSnapshot = {
  id: string;
  repository: WorkspaceRepository;
  ref: string;
  baseSha: string;
  tree: GithubTreeEntry[];
  updatedAt: number;
};

export type WorkingFileStatus = "modified" | "added" | "deleted" | "renamed";

export type WorkingFile = {
  key: string;
  workspaceId: string;
  path: string;
  status: WorkingFileStatus;
  content?: string;
  baseSha?: string;
  renamedFrom?: string;
  updatedAt: number;
};

export type WorkspaceState = {
  authToken: string | null;
  user: GithubUser | null;
  workspace: WorkspaceSnapshot | null;
  refs: GithubRef[];
  overlays: WorkingFile[];
  recent: WorkspaceSnapshot[];
  loading: boolean;
  error: string | null;
  dialogOpen: boolean;
};

export function repositoryFromGithub(repository: GithubRepository): WorkspaceRepository {
  return {
    id: repository.id,
    name: repository.name,
    fullName: repository.full_name,
    owner: repository.owner.login,
    private: repository.private,
    defaultBranch: repository.default_branch,
    htmlUrl: repository.html_url,
    canPush: Boolean(repository.permissions?.push || repository.permissions?.maintain || repository.permissions?.admin),
  };
}

export function workspaceId(fullName: string, ref: string) {
  return `${fullName}@${ref}`;
}

export function parseRepositoryInput(input: string) {
  const value = input.trim().replace(/\.git$/, "");
  if (!value) throw new Error("Enter a GitHub repository.");
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com") throw new Error("Only github.com repository URLs are supported.");
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) throw new Error("Repository URL must include owner and repository.");
    return `${parts[0]}/${parts[1]}`;
  } catch {
    if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return value;
    throw new Error("Use owner/repository or a github.com repository URL.");
  }
}
