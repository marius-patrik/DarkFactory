import { useEffect, useState } from "react";
import {
  cancelGithubWorkflowRun,
  dispatchGithubWorkflow,
  getGithubWorkflowRun,
  listGithubWorkflowArtifacts,
  listGithubWorkflowJobs,
  listGithubWorkflowRuns,
  listGithubWorkflows,
  rerunGithubWorkflowRun,
  type GithubArtifact,
  type GithubWorkflow,
  type GithubWorkflowJob,
  type GithubWorkflowRun,
} from "@/github/client";
import type { WorkbenchTab } from "@/workbench/model";
import { useWorkbenchRuntime } from "@/workbench/runtime";
import {
  ErrorState,
  LoadingState,
  RepositoryRequired,
  useRepositoryIdentity,
} from "./github-tab-common";

export function ActionsTab() {
  const runtime = useWorkbenchRuntime();
  const { workspace, fullName, token } = useRepositoryIdentity();
  const [workflows, setWorkflows] = useState<GithubWorkflow[]>([]);
  const [runs, setRuns] = useState<GithubWorkflowRun[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void Promise.all([
      listGithubWorkflows(fullName, token),
      listGithubWorkflowRuns(fullName, token),
    ])
      .then(([workflowData, runData]) => {
        if (disposed) return;
        setWorkflows(workflowData.workflows);
        setRuns(runData.workflow_runs);
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

  const dispatch = async (workflow: GithubWorkflow) => {
    await dispatchGithubWorkflow(
      fullName,
      workflow.id,
      workspace.workspace?.ref || workspace.workspace?.repository.defaultBranch || "main",
      token,
    );
    setRevision((value) => value + 1);
  };

  return (
    <div className="github-surface">
      <header className="github-surface-header">
        <strong>Actions</strong>
        <button type="button" onClick={() => setRevision((value) => value + 1)}>Refresh</button>
      </header>
      {loading ? <LoadingState label="Actions" /> : error ? <ErrorState error={error} /> : (
        <div className="github-split-list">
          <section>
            <h3>Workflows</h3>
            {workflows.map((workflow) => (
              <div key={workflow.id} className="github-action-row">
                <span>
                  <strong>{workflow.name}</strong>
                  <small>{workflow.path} · {workflow.state}</small>
                </span>
                <button
                  type="button"
                  disabled={!token || workflow.state !== "active"}
                  onClick={() => void dispatch(workflow)}
                >
                  Dispatch
                </button>
              </div>
            ))}
            {!workflows.length && <div className="tab-empty"><span>No workflows.</span></div>}
          </section>
          <section>
            <h3>Runs</h3>
            {runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className="github-list-row"
                onClick={() => runtime.openTab("workflow-run", "main", { id: run.id })}
              >
                <span className="github-list-primary">
                  {run.display_title || run.name || `Run #${run.run_number}`}
                </span>
                <span>
                  {run.status}{run.conclusion ? ` · ${run.conclusion}` : ""} ·{" "}
                  {run.head_branch || run.head_sha.slice(0, 7)}
                </span>
              </button>
            ))}
            {!runs.length && <div className="tab-empty"><span>No workflow runs.</span></div>}
          </section>
        </div>
      )}
    </div>
  );
}

export function WorkflowRunTab({ tab }: { tab: WorkbenchTab }) {
  const { workspace, fullName, token } = useRepositoryIdentity();
  const id = Number(tab.state.id) || 0;
  const [run, setRun] = useState<GithubWorkflowRun | null>(null);
  const [jobs, setJobs] = useState<GithubWorkflowJob[]>([]);
  const [artifacts, setArtifacts] = useState<GithubArtifact[]>([]);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(Boolean(fullName && id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!fullName || !id) return;
    let disposed = false;
    setLoading(true);
    setError("");
    void Promise.all([
      getGithubWorkflowRun(fullName, id, token),
      listGithubWorkflowJobs(fullName, id, token),
      listGithubWorkflowArtifacts(fullName, id, token),
    ])
      .then(([nextRun, jobData, artifactData]) => {
        if (disposed) return;
        setRun(nextRun);
        setJobs(jobData.jobs);
        setArtifacts(artifactData.artifacts);
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
  if (!id) return <div className="tab-empty"><span>No workflow run selected.</span></div>;
  if (loading) return <LoadingState label="workflow run" />;
  if (error) return <ErrorState error={error} />;
  if (!run) return <div className="tab-empty"><span>Workflow run not found.</span></div>;

  const rerun = async () => {
    await rerunGithubWorkflowRun(fullName, id, token);
    setRevision((value) => value + 1);
  };
  const cancel = async () => {
    await cancelGithubWorkflowRun(fullName, id, token);
    setRevision((value) => value + 1);
  };

  return (
    <div className="github-detail">
      <header className="github-detail-header">
        <div>
          <strong>{run.display_title || run.name || `Run #${run.run_number}`}</strong>
          <span>
            {run.status}{run.conclusion ? ` · ${run.conclusion}` : ""} ·{" "}
            {run.head_branch || run.head_sha.slice(0, 7)}
          </span>
        </div>
        <div>
          <button type="button" disabled={!token} onClick={() => void rerun()}>Rerun</button>
          <button
            type="button"
            disabled={!token || run.status === "completed"}
            onClick={() => void cancel()}
          >
            Cancel
          </button>
          <a href={run.html_url} target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </header>
      <div className="github-detail-body github-run-body">
        <section>
          <h3>Jobs</h3>
          {jobs.map((job) => (
            <div key={job.id} className="github-data-row">
              <strong>{job.name}</strong>
              <span>{job.status}{job.conclusion ? ` · ${job.conclusion}` : ""}</span>
            </div>
          ))}
          {!jobs.length && <p className="github-empty-body">No jobs.</p>}
        </section>
        <section>
          <h3>Artifacts</h3>
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="github-data-row">
              <strong>{artifact.name}</strong>
              <span>
                {Math.round(artifact.size_in_bytes / 1024)} KB
                {artifact.expired ? " · expired" : ""}
              </span>
            </div>
          ))}
          {!artifacts.length && <p className="github-empty-body">No artifacts.</p>}
        </section>
      </div>
    </div>
  );
}
