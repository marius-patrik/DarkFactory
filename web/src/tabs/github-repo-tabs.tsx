import { useEffect, useMemo, useState } from "react";
import {
  createGithubRelease,
  getGithubCommit,
  getGithubProject,
  getGithubRelease,
  listGithubCommits,
  listGithubProjects,
  listGithubReleases,
  updateGithubProject,
  updateGithubRelease,
  type GithubCommit,
  type GithubProject,
  type GithubProjectItem,
  type GithubRelease,
} from "@/github/client";
import type { WorkbenchTab } from "@/workbench/model";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import {
  dateLabel,
  ErrorState,
  LoadingState,
  MarkdownBody,
  RepositoryRequired,
  useRepositoryIdentity,
} from "./github-tab-common";

export function ReleasesTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [releases, setReleases] = useState<GithubRelease[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName));
  const [error, setError] = useState("");

  useEffect(() => {
    if (revision < 0) return;
    if (!fullName) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void listGithubReleases(fullName, token)
      .then((items) => {
        if (!disposed) setReleases(items);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, revision, token]);

  if (!workspace.workspace) return <RepositoryRequired />;

  const create = async () => {
    const tag = window.prompt("Tag name");
    if (!tag?.trim()) return;
    const name = window.prompt("Release name", tag.trim());
    if (name === null) return;
    const body = window.prompt("Release notes") ?? "";
    const release = await createGithubRelease(
      fullName,
      {
        tag_name: tag.trim(),
        target_commitish: workspace.workspace?.ref,
        name,
        body,
      },
      token,
    );
    setRevision((value) => value + 1);
    runtime.openTab("release", "main", { id: release.id });
  };

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Releases</strong>
        <button type="button" disabled={!token} onClick={() => void create()}>New release</button>
      </header>
      {loading ? <LoadingState label="releases" /> : error ? <ErrorState error={error} /> : (
        <div className="github-list">
          {releases.map((release) => (
            <button
              key={release.id}
              type="button"
              className="github-list-row"
              onClick={() => runtime.openTab("release", "main", { id: release.id })}
            >
              <span className="github-list-primary">{release.name || release.tag_name}</span>
              <span>
                {release.tag_name}
                {release.draft ? " · draft" : ""}
                {release.prerelease ? " · prerelease" : ""}
                {" · "}{dateLabel(release.published_at || release.created_at)}
              </span>
            </button>
          ))}
          {!releases.length && <div className="tab-empty"><span>No releases.</span></div>}
        </div>
      )}
    </div>
  );
}

export function ReleaseTab({ tab }: { tab: WorkbenchTab }) {
  const { workspace, fullName, token } = useRepositoryIdentity();
  const id = Number(tab.state.id) || 0;
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName && id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (revision < 0) return;
    if (!fullName || !id) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void getGithubRelease(fullName, id, token)
      .then((nextRelease) => {
        if (!disposed) setRelease(nextRelease);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, id, revision, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!id) return <div className="tab-empty"><span>No release selected.</span></div>;
  if (loading) return <LoadingState label="release" />;
  if (error) return <ErrorState error={error} />;
  if (!release) return <div className="tab-empty"><span>Release not found.</span></div>;

  const edit = async () => {
    const name = window.prompt("Release name", release.name || release.tag_name);
    if (name === null) return;
    const body = window.prompt("Release notes", release.body ?? "");
    if (body === null) return;
    await updateGithubRelease(fullName, id, { name, body }, token);
    setRevision((value) => value + 1);
  };

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>{release.name || release.tag_name}</strong>
          <span>{release.tag_name} · {dateLabel(release.published_at || release.created_at)}</span>
        </div>
        <div>
          <button type="button" disabled={!token} onClick={() => void edit()}>Edit</button>
          <a href={release.html_url} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>
      <div className="github-detail-body">
        <MarkdownBody>{release.body}</MarkdownBody>
        <section>
          <h3>Assets</h3>
          {release.assets.map((asset) => (
            <div key={asset.id} className="github-data-row">
              <a href={asset.browser_download_url} target="_blank" rel="noreferrer">{asset.name}</a>
              <span>{Math.round(asset.size / 1024)} KB · {asset.download_count} downloads</span>
            </div>
          ))}
          {!release.assets.length && <p className="github-empty-body">No assets.</p>}
        </section>
      </div>
    </div>
  );
}

export function BranchesTab() {
  const { workspace } = useRepositoryIdentity();
  const branches = useMemo(
    () => workspace.refs.filter((ref) => ref.kind === "branch"),
    [workspace.refs],
  );
  const tags = useMemo(
    () => workspace.refs.filter((ref) => ref.kind === "tag"),
    [workspace.refs],
  );

  if (!workspace.workspace) return <RepositoryRequired />;

  const create = async () => {
    const name = window.prompt("New branch name");
    if (!name?.trim()) return;
    await workspace.createBranch(name.trim());
  };

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Branches & Tags</strong>
        <button type="button" disabled={!workspace.token} onClick={() => void create()}>
          New branch
        </button>
      </header>
      <div className="github-split-list">
        <section>
          <h3>Branches</h3>
          {branches.map((ref) => (
            <button
              key={ref.name}
              type="button"
              className="github-list-row"
              onClick={() => void workspace.switchRef(ref.name)}
            >
              <span className="github-list-primary">{ref.name}</span>
              <span>
                {ref.sha.slice(0, 7)}
                {ref.name === workspace.workspace?.ref ? " · current" : ""}
              </span>
            </button>
          ))}
        </section>
        <section>
          <h3>Tags</h3>
          {tags.map((ref) => (
            <button
              key={ref.name}
              type="button"
              className="github-list-row"
              onClick={() => void workspace.switchRef(ref.name)}
            >
              <span className="github-list-primary">{ref.name}</span>
              <span>{ref.sha.slice(0, 7)}</span>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

export function CommitsTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [loading, setLoading] = useState(Boolean(fullName));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void listGithubCommits(fullName, token, workspace.workspace?.ref)
      .then((items) => {
        if (!disposed) setCommits(items);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, token, workspace.workspace?.ref]);

  if (!workspace.workspace) return <RepositoryRequired />;

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Commits</strong>
        <span>{workspace.workspace.ref}</span>
      </header>
      {loading ? <LoadingState label="commits" /> : error ? <ErrorState error={error} /> : (
        <div className="github-list">
          {commits.map((commit) => (
            <button
              key={commit.sha}
              type="button"
              className="github-list-row"
              onClick={() => runtime.openTab("commit", "main", { sha: commit.sha })}
            >
              <span className="github-list-primary">
                {commit.commit.message?.split("\n")[0] || commit.sha.slice(0, 7)}
              </span>
              <span>
                {commit.sha.slice(0, 7)} · {commit.commit.author?.name || "unknown"} ·{" "}
                {dateLabel(commit.commit.author?.date)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CommitTab({ tab }: { tab: WorkbenchTab }) {
  const { workspace, fullName, token } = useRepositoryIdentity();
  const sha = typeof tab.state.sha === "string" ? tab.state.sha : "";
  const [commit, setCommit] = useState<GithubCommit | null>(null);
  const [loading, setLoading] = useState(Boolean(fullName && sha));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName || !sha) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void getGithubCommit(fullName, sha, token)
      .then((nextCommit) => {
        if (!disposed) setCommit(nextCommit);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, sha, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!sha) return <div className="tab-empty"><span>No commit selected.</span></div>;
  if (loading) return <LoadingState label="commit" />;
  if (error) return <ErrorState error={error} />;
  if (!commit) return <div className="tab-empty"><span>Commit not found.</span></div>;

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>{commit.commit.message?.split("\n")[0] || commit.sha}</strong>
          <span>
            {commit.sha} · {commit.commit.author?.name || "unknown"} ·{" "}
            {dateLabel(commit.commit.author?.date)}
          </span>
        </div>
        {commit.html_url && <a href={commit.html_url} target="_blank" rel="noreferrer">GitHub</a>}
      </header>
      <div className="github-detail-body">
        <pre className="github-commit-message">{commit.commit.message}</pre>
        <section>
          <h3>Files</h3>
          {commit.files?.map((file) => (
            <div key={file.filename} className="github-data-row">
              <strong>{file.filename}</strong>
              <span>{file.status} · +{file.additions} −{file.deletions}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

export function ProjectsTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [projects, setProjects] = useState<GithubProject[]>([]);
  const [loading, setLoading] = useState(Boolean(fullName && token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName || !token) {
      setLoading(false);
      return;
    }
    let disposed = false;
    setLoading(true);
    setError("");
    void listGithubProjects(fullName, token)
      .then((items) => {
        if (!disposed) setProjects(items);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!token) {
    return (
      <div className="tab-empty">
        <strong>Projects requires authentication</strong>
        <span>Connect a GitHub token with Projects read permission.</span>
      </div>
    );
  }

  return (
    <div className="github-surface">
      <header className="github-surface-header"><strong>Projects</strong></header>
      {loading ? <LoadingState label="projects" /> : error ? <ErrorState error={error} /> : (
        <div className="github-list">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              className="github-list-row"
              onClick={() => runtime.openTab("project", "main", { number: project.number })}
            >
              <span className="github-list-primary">#{project.number} {project.title}</span>
              <span>
                {project.closed ? "closed" : "open"}
                {project.shortDescription ? ` · ${project.shortDescription}` : ""}
              </span>
            </button>
          ))}
          {!projects.length && <div className="tab-empty"><span>No repository projects.</span></div>}
        </div>
      )}
    </div>
  );
}

export function ProjectTab({ tab }: { tab: WorkbenchTab }) {
  const { workspace, fullName, token } = useRepositoryIdentity();
  const number = Number(tab.state.number) || 0;
  const [project, setProject] = useState<(GithubProject & { items: GithubProjectItem[] }) | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName && number && token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (revision < 0) return;
    if (!fullName || !number || !token) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void getGithubProject(fullName, number, token)
      .then((nextProject) => {
        if (!disposed) setProject(nextProject);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => {
      disposed = true;
    };
  }, [fullName, number, revision, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!token) return <div className="tab-empty"><strong>Projects requires authentication</strong></div>;
  if (!number) return <div className="tab-empty"><span>No project selected.</span></div>;
  if (loading) return <LoadingState label="project" />;
  if (error) return <ErrorState error={error} />;
  if (!project) return <div className="tab-empty"><span>Project not found.</span></div>;

  const edit = async () => {
    const title = window.prompt("Project title", project.title);
    if (!title?.trim()) return;
    const shortDescription = window.prompt(
      "Project short description",
      project.shortDescription ?? "",
    );
    if (shortDescription === null) return;
    await updateGithubProject(
      project.id,
      { title: title.trim(), shortDescription },
      token,
    );
    setRevision((value) => value + 1);
  };

  const toggleClosed = async () => {
    await updateGithubProject(project.id, { closed: !project.closed }, token);
    setRevision((value) => value + 1);
  };

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>#{project.number} {project.title}</strong>
          <span>
            {project.closed ? "closed" : "open"}
            {project.shortDescription ? ` · ${project.shortDescription}` : ""}
          </span>
        </div>
        <div>
          <button type="button" onClick={() => void edit()}>Edit</button>
          <button type="button" onClick={() => void toggleClosed()}>
            {project.closed ? "Reopen" : "Close"}
          </button>
          <a href={project.url} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>
      <div className="github-detail-body">
        <section>
          <h3>Items</h3>
          {project.items.map((item) => (
            <div key={item.id} className="github-data-row">
              <strong>{item.title}</strong>
              <span>
                {item.type}{item.number ? ` #${item.number}` : ""}
                {item.url ? <> · <a href={item.url} target="_blank" rel="noreferrer">open</a></> : null}
              </span>
            </div>
          ))}
          {!project.items.length && <p className="github-empty-body">No project items.</p>}
        </section>
      </div>
    </div>
  );
}
