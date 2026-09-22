import { useEffect, useState } from "react";
import { KeyRound, X } from "lucide-react";
import { useWorkspace } from "./context";

export function RepositoryDialog() {
  const workspace = useWorkspace();
  const [input, setInput] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!workspace.dialogOpen) {
      setInput("");
      setTokenInput("");
      setLocalError(null);
    }
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

  const connect = async () => {
    setLocalError(null);
    try {
      await workspace.connectToken(tokenInput);
      setTokenInput("");
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
              <div className="workspace-token-connect">
                <div className="workspace-token-form">
                  <KeyRound size={14} />
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(event) => setTokenInput(event.target.value)}
                    placeholder="GitHub token"
                    aria-label="GitHub token"
                    autoComplete="off"
                  />
                  <button type="button" disabled={!tokenInput.trim() || workspace.loading} onClick={() => void connect()}>
                    Connect
                  </button>
                </div>
                <p className="workspace-help">
                  Use a fine-grained or user token limited to the repositories you need. It is kept only for this browser session and cleared on sign-out.
                </p>
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
