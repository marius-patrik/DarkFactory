import { useEffect, useState } from "react";
import { LogIn, X } from "lucide-react";
import {
  beginGithubSignIn,
  getGithubAuthConfiguration,
  getGithubAuthResult,
  type GithubAuthResult,
} from "@/github/auth";
import { useWorkspace } from "./context";

export function RepositoryDialog() {
  const workspace = useWorkspace();
  const [input, setInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [authResult, setAuthResult] = useState<GithubAuthResult>(() => getGithubAuthResult());
  const authConfig = getGithubAuthConfiguration();

  useEffect(() => {
    if (!workspace.dialogOpen) {
      setInput("");
      setLocalError(null);
      return;
    }
    setAuthResult(getGithubAuthResult());
    const handleAuth = (event: Event) => {
      const detail = (event as CustomEvent<GithubAuthResult>).detail;
      setAuthResult(detail ?? getGithubAuthResult());
    };
    window.addEventListener("workbench-github-auth", handleAuth);
    return () => window.removeEventListener("workbench-github-auth", handleAuth);
  }, [workspace.dialogOpen]);

  if (!workspace.dialogOpen) return null;

  const open = async (value: string) => {
    setLocalError(null);
    try {
      await workspace.openRepository(value);
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  const signIn = async () => {
    setLocalError(null);
    try {
      await beginGithubSignIn();
      setAuthResult(getGithubAuthResult());
    } catch (reason) {
      setLocalError(reason instanceof Error ? reason.message : String(reason));
    }
  };

  return (
    <div className="workspace-dialog-backdrop" role="presentation">
      <section className="workspace-dialog" role="dialog" aria-modal="true" aria-label="Open GitHub repository">
        <header>
          <div>
            <strong>Open GitHub Repository</strong>
            <span>Open a repository into a browser-local workspace.</span>
          </div>
          <button type="button" className="workbench-icon-button" onClick={() => workspace.setDialogOpen(false)} aria-label="Close"><X size={15} /></button>
        </header>
        <form
          className="workspace-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            void open(input);
          }}
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="owner/repository or https://github.com/owner/repository"
            aria-label="Repository"
          />
          <button type="submit" disabled={!input.trim() || workspace.loading}>Open</button>
        </form>
        {(localError || workspace.error) && <div className="workspace-dialog-error">{localError || workspace.error}</div>}
        <div className="workspace-dialog-sections">
          <section>
            <div className="workspace-dialog-section-title">Account</div>
            {workspace.user ? (
              <div className="workspace-account-row">
                <img src={workspace.user.avatar_url} alt="" />
                <span>{workspace.user.login}</span>
                <button type="button" onClick={workspace.signOut}>Sign out</button>
              </div>
            ) : (
              <div className="workspace-github-auth">
                <button
                  type="button"
                  className="workspace-github-auth-button"
                  disabled={workspace.loading || !authConfig.configured}
                  onClick={() => void signIn()}
                >
                  <LogIn size={15} />
                  <span>Sign in with GitHub</span>
                </button>
                <p className="workspace-help">
                  Continue on GitHub to authorize this workbench. The returned credential is kept only in this browser session and is cleared on sign-out.
                </p>
                {!authConfig.configured && (
                  <div className="workspace-auth-status status-warning">
                    GitHub sign-in is not configured for this deployment. Public repositories remain available anonymously.
                  </div>
                )}
                {authResult.phase !== "signed-out" && authResult.message && (
                  <div className={`workspace-auth-status status-${authResult.phase}`} role="status">
                    {authResult.message}
                  </div>
                )}
              </div>
            )}
          </section>
          {workspace.recent.length > 0 && (
            <section>
              <div className="workspace-dialog-section-title">Recent Workspaces</div>
              <div className="workspace-list">
                {workspace.recent.map((item) => (
                  <button key={item.id} type="button" onClick={() => void workspace.openRepository(item.repository.fullName, item.ref)}>
                    <span>{item.repository.fullName}</span><small>{item.ref}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          {workspace.repositories.length > 0 && (
            <section>
              <div className="workspace-dialog-section-title">Accessible Repositories</div>
              <div className="workspace-list">
                {workspace.repositories.slice(0, 100).map((repository) => (
                  <button key={repository.id} type="button" onClick={() => void open(repository.full_name)}>
                    <span>{repository.full_name}</span><small>{repository.private ? "Private" : "Public"}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}
