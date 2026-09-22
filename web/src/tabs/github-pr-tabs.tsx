import { useEffect, useState } from "react";
import {
  createGithubPullRequest,
  createGithubPullRequestReview,
  getGithubPullRequest,
  listGithubCheckRuns,
  listGithubIssueComments,
  listGithubPullRequestCommits,
  listGithubPullRequestFiles,
  listGithubPullRequests,
  mergeGithubPullRequest,
  updateGithubPullRequest,
  type GithubCheckRun,
  type GithubCommit,
  type GithubIssueComment,
  type GithubPullRequest,
  type GithubPullRequestFile,
} from "@/github/client";
import type { WorkbenchTab } from "@/workbench/model";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import { languageForPath } from "@/workspace/languages";
import {
  ErrorState,
  LoadingState,
  MarkdownBody,
  RepositoryRequired,
  useRepositoryIdentity,
} from "./github-tab-common";

export function PullRequestsTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [pulls, setPulls] = useState<GithubPullRequest[]>([]);
  const [state, setState] = useState<"open" | "closed" | "all">("open");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName));
  const [error, setError] = useState("");

  useEffect(() => {
    if (revision < 0) return;
    if (!fullName) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void listGithubPullRequests(fullName, token, state)
      .then((items) => { if (!disposed) setPulls(items); })
      .catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [fullName, revision, state, token]);

  if (!workspace.workspace) return <RepositoryRequired />;

  const create = async () => {
    const title = window.prompt("Pull request title");
    if (!title?.trim()) return;
    const head = window.prompt("Head branch", workspace.workspace?.ref || "")?.trim();
    if (!head) return;
    const base = window.prompt("Base branch", workspace.workspace?.repository.defaultBranch || "main")?.trim();
    if (!base) return;
    const body = window.prompt("Pull request body") ?? "";
    const pull = await createGithubPullRequest(fullName, { title: title.trim(), body, head, base }, token);
    setRevision((value) => value + 1);
    runtime.openTab("pull-request", "main", { number: pull.number });
  };

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Pull Requests</strong>
        <div>
          <select value={state} onChange={(event) => setState(event.target.value as "open" | "closed" | "all")}>
            <option value="open">Open</option><option value="closed">Closed</option><option value="all">All</option>
          </select>
          <button type="button" disabled={!token} onClick={() => void create()}>New PR</button>
        </div>
      </header>
      {loading ? <LoadingState label="pull requests" /> : error ? <ErrorState error={error} /> : (
        <div className="github-list">
          {pulls.map((pull) => (
            <button key={pull.id ?? pull.number} type="button" className="github-list-row" onClick={() => runtime.openTab("pull-request", "main", { number: pull.number })}>
              <span className="github-list-primary">#{pull.number} {pull.title || "Untitled pull request"}</span>
              <span>{pull.state} · {pull.head.ref} → {pull.base.ref} · {pull.user?.login || "unknown"}</span>
            </button>
          ))}
          {!pulls.length && <div className="tab-empty"><span>No pull requests in this filter.</span></div>}
        </div>
      )}
    </div>
  );
}

export function PullRequestTab({ tab }: { tab: WorkbenchTab }) {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const number = Number(tab.state.number) || 0;
  const [pull, setPull] = useState<GithubPullRequest | null>(null);
  const [comments, setComments] = useState<GithubIssueComment[]>([]);
  const [commits, setCommits] = useState<GithubCommit[]>([]);
  const [files, setFiles] = useState<GithubPullRequestFile[]>([]);
  const [checks, setChecks] = useState<GithubCheckRun[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName && number));
  const [error, setError] = useState("");

  useEffect(() => {
    if (revision < 0) return;
    if (!fullName || !number) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void (async () => {
      const nextPull = await getGithubPullRequest(fullName, number, token);
      const headRepository = nextPull.head.repo?.full_name || fullName;
      const [nextComments, nextCommits, nextFiles, nextChecks] = await Promise.all([
        listGithubIssueComments(fullName, number, token),
        listGithubPullRequestCommits(fullName, number, token),
        listGithubPullRequestFiles(fullName, number, token),
        listGithubCheckRuns(headRepository, nextPull.head.sha, token).catch(() => []),
      ]);
      if (disposed) return;
      setPull(nextPull);
      setComments(nextComments);
      setCommits(nextCommits);
      setFiles(nextFiles);
      setChecks(nextChecks);
    })()
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (!disposed) setLoading(false);
      });
    return () => { disposed = true; };
  }, [fullName, number, revision, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!number) return <div className="tab-empty"><span>No pull request selected.</span></div>;
  if (loading) return <LoadingState label={`pull request #${number}`} />;
  if (error) return <ErrorState error={error} />;
  if (!pull) return <div className="tab-empty"><span>Pull request not found.</span></div>;

  const toggleState = async () => {
    await updateGithubPullRequest(fullName, number, { state: pull.state === "open" ? "closed" : "open" }, token);
    setRevision((value) => value + 1);
  };

  const edit = async () => {
    const title = window.prompt("Pull request title", pull.title ?? "");
    if (!title?.trim()) return;
    const body = window.prompt("Pull request body", pull.body ?? "");
    if (body === null) return;
    await updateGithubPullRequest(fullName, number, { title: title.trim(), body }, token);
    setRevision((value) => value + 1);
  };

  const review = async (event: "APPROVE" | "REQUEST_CHANGES" | "COMMENT") => {
    const body = window.prompt(event === "APPROVE" ? "Approval note" : event === "REQUEST_CHANGES" ? "Requested changes" : "Review comment") ?? "";
    await createGithubPullRequestReview(fullName, number, event, body, token);
    setRevision((value) => value + 1);
  };

  const merge = async () => {
    if (!window.confirm(`Merge pull request #${number}?`)) return;
    const result = await mergeGithubPullRequest(fullName, number, token);
    if (!result.merged) throw new Error(result.message);
    setRevision((value) => value + 1);
  };

  const compareFile = (path: string) => {
    runtime.openTab("editor", "main", {
      path,
      language: languageForPath(path),
      renderer: "editor",
      compare: "pull-request",
      compareTarget: String(number),
    });
  };

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>#{pull.number} {pull.title || "Untitled pull request"}</strong>
          <span>{pull.state} · {pull.head.ref} → {pull.base.ref} · {pull.user?.login || "unknown"}</span>
        </div>
        <div>
          <button type="button" disabled={!token} onClick={() => void edit()}>Edit</button>
          <button type="button" disabled={!token} onClick={() => void review("COMMENT")}>Review comment</button>
          <button type="button" disabled={!token || pull.state !== "open"} onClick={() => void review("APPROVE")}>Approve</button>
          <button type="button" disabled={!token || pull.state !== "open"} onClick={() => void review("REQUEST_CHANGES")}>Request changes</button>
          <button type="button" disabled={!token} onClick={() => void toggleState()}>{pull.state === "open" ? "Close" : "Reopen"}</button>
          <button type="button" disabled={!token || pull.state !== "open"} onClick={() => void merge()}>Merge</button>
          {pull.html_url && <a href={pull.html_url} target="_blank" rel="noreferrer">GitHub</a>}
        </div>
      </header>
      <div className="github-detail-body">
        <MarkdownBody>{pull.body}</MarkdownBody>
        <section>
          <h3>Checks</h3>
          {checks.map((check) => (
            <div key={check.id} className="github-data-row">
              <strong>{check.name}</strong>
              <span>{check.status}{check.conclusion ? ` · ${check.conclusion}` : ""}</span>
            </div>
          ))}
          {!checks.length && <p className="github-empty-body">No check runs.</p>}
        </section>
        <section>
          <h3>Commits</h3>
          {commits.map((commit) => (
            <button
              key={commit.sha}
              type="button"
              className="github-data-row github-data-button"
              onClick={() => runtime.openTab("commit", "main", { sha: commit.sha })}
            >
              <strong>{commit.commit.message?.split("\n")[0] || commit.sha.slice(0, 7)}</strong>
              <span>{commit.sha.slice(0, 7)}</span>
            </button>
          ))}
        </section>
        <section>
          <h3>Files Changed</h3>
          {files.map((file) => (
            <div key={file.filename} className="github-data-row">
              <button type="button" className="github-file-link" onClick={() => compareFile(file.filename)}>
                {file.filename}
              </button>
              <span>{file.status} · +{file.additions} −{file.deletions}</span>
            </div>
          ))}
        </section>
        <section className="github-comments">
          <h3>Conversation</h3>
          {comments.map((item) => (
            <article key={item.id}>
              <header>{item.user?.login || "unknown"}</header>
              <MarkdownBody>{item.body}</MarkdownBody>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
