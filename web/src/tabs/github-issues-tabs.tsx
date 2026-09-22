import { useEffect, useState } from "react";
import {
  createGithubIssue,
  createGithubIssueComment,
  getGithubIssue,
  listGithubIssueComments,
  listGithubIssues,
  updateGithubIssue,
  type GithubIssue,
  type GithubIssueComment,
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

export function IssuesTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [issues, setIssues] = useState<GithubIssue[]>([]);
  const [state, setState] = useState<"open" | "closed" | "all">("open");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void listGithubIssues(fullName, token, state)
      .then((items) => { if (!disposed) setIssues(items); })
      .catch((reason) => { if (!disposed) setError(reason instanceof Error ? reason.message : String(reason)); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [fullName, revision, state, token]);

  if (!workspace.workspace) return <RepositoryRequired />;

  const create = async () => {
    const title = window.prompt("Issue title");
    if (!title?.trim()) return;
    const body = window.prompt("Issue body") ?? "";
    const issue = await createGithubIssue(fullName, title.trim(), body, token);
    setRevision((value) => value + 1);
    runtime.openTab("issue", "main", { number: issue.number });
  };

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Issues</strong>
        <div>
          <select value={state} onChange={(event) => setState(event.target.value as "open" | "closed" | "all")}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
          <button type="button" disabled={!token} onClick={() => void create()}>New issue</button>
        </div>
      </header>
      {loading ? <LoadingState label="issues" /> : error ? <ErrorState error={error} /> : (
        <div className="github-list">
          {issues.map((issue) => (
            <button key={issue.id} type="button" className="github-list-row" onClick={() => runtime.openTab("issue", "main", { number: issue.number })}>
              <span className="github-list-primary">#{issue.number} {issue.title}</span>
              <span>{issue.state} · {issue.user?.login || "unknown"} · {dateLabel(issue.updated_at)}</span>
            </button>
          ))}
          {!issues.length && <div className="tab-empty"><span>No issues in this filter.</span></div>}
        </div>
      )}
    </div>
  );
}

export function IssueTab({ tab }: { tab: WorkbenchTab }) {
  const { workspace, fullName, token } = useRepositoryIdentity();
  const number = Number(tab.state.number) || 0;
  const [issue, setIssue] = useState<GithubIssue | null>(null);
  const [comments, setComments] = useState<GithubIssueComment[]>([]);
  const [comment, setComment] = useState("");
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName && number));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName || !number) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void Promise.all([
      getGithubIssue(fullName, number, token),
      listGithubIssueComments(fullName, number, token),
    ]).then(([nextIssue, nextComments]) => {
      if (!disposed) {
        setIssue(nextIssue);
        setComments(nextComments);
      }
    }).catch((reason) => {
      if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
    }).finally(() => {
      if (!disposed) setLoading(false);
    });
    return () => { disposed = true; };
  }, [fullName, number, revision, token]);

  if (!workspace.workspace) return <RepositoryRequired />;
  if (!number) return <div className="tab-empty"><span>No issue selected.</span></div>;
  if (loading) return <LoadingState label={`issue #${number}`} />;
  if (error) return <ErrorState error={error} />;
  if (!issue) return <div className="tab-empty"><span>Issue not found.</span></div>;

  const toggleState = async () => {
    await updateGithubIssue(fullName, number, { state: issue.state === "open" ? "closed" : "open" }, token);
    setRevision((value) => value + 1);
  };

  const edit = async () => {
    const title = window.prompt("Issue title", issue.title);
    if (!title?.trim()) return;
    const body = window.prompt("Issue body", issue.body ?? "");
    if (body === null) return;
    await updateGithubIssue(fullName, number, { title: title.trim(), body }, token);
    setRevision((value) => value + 1);
  };

  const submitComment = async () => {
    if (!comment.trim()) return;
    await createGithubIssueComment(fullName, number, comment.trim(), token);
    setComment("");
    setRevision((value) => value + 1);
  };

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>#{issue.number} {issue.title}</strong>
          <span>{issue.state} · {issue.user?.login || "unknown"} · {dateLabel(issue.updated_at)}</span>
        </div>
        <div>
          <button type="button" disabled={!token} onClick={() => void edit()}>Edit</button>
          <button type="button" disabled={!token} onClick={() => void toggleState()}>{issue.state === "open" ? "Close" : "Reopen"}</button>
          <a href={issue.html_url} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>
      <div className="github-detail-body">
        <MarkdownBody>{issue.body}</MarkdownBody>
        <section className="github-comments">
          <h3>Comments</h3>
          {comments.map((item) => (
            <article key={item.id}>
              <header>{item.user?.login || "unknown"} · {dateLabel(item.created_at)}</header>
              <MarkdownBody>{item.body}</MarkdownBody>
            </article>
          ))}
          {token && (
            <div className="github-comment-compose">
              <textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Add a comment" />
              <button type="button" disabled={!comment.trim()} onClick={() => void submitComment()}>Comment</button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
