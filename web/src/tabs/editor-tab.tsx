import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import type { AppearanceMode } from "@/settings";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { WorkbenchTab } from "@/workbench/model";

export function EditorTab({
  tab,
  theme,
  updateState,
}: {
  tab: WorkbenchTab;
  theme: AppearanceMode;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const workspace = useWorkspace();
  const path = typeof tab.state.path === "string" ? tab.state.path : "Untitled";
  const repositoryFile = path !== "Untitled" && Boolean(workspace.workspace);
  const language = typeof tab.state.language === "string" ? tab.state.language : languageForPath(path);
  const [value, setValue] = useState(() => typeof tab.state.value === "string" ? tab.state.value : "");
  const [loadedPath, setLoadedPath] = useState(repositoryFile ? "" : path);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!repositoryFile) {
      setValue(typeof tab.state.value === "string" ? tab.state.value : "");
      setLoadedPath(path);
      setEdited(false);
      return;
    }
    let disposed = false;
    setLoadedPath("");
    setError(null);
    setEdited(false);
    void workspace.readFile(path)
      .then((content) => {
        if (disposed) return;
        setValue(content);
        setLoadedPath(path);
      })
      .catch((reason) => {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      });
    return () => {
      disposed = true;
    };
  }, [path, repositoryFile, tab.state.value, workspace.readFile]);

  useEffect(() => {
    if (!repositoryFile || !edited || loadedPath !== path) return;
    const timer = window.setTimeout(() => {
      void workspace.writeFile(path, value).catch((reason) => {
        setError(reason instanceof Error ? reason.message : String(reason));
      });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [edited, loadedPath, path, repositoryFile, value, workspace.writeFile]);

  if (error) {
    return <div className="tab-empty"><strong>Could not open {path}</strong><span>{error}</span></div>;
  }
  if (repositoryFile && loadedPath !== path) {
    return <div className="tab-empty"><span>Loading {path}…</span></div>;
  }

  const status = repositoryFile ? workspace.fileStatus(path) : null;
  return (
    <div className="editor-tab">
      <div className="tab-breadcrumbs" title={path}>
        <span>{path}</span>
        {status && <span className={`file-status status-${status}`}>{status}</span>}
      </div>
      <Editor
        key={workspace.workspace ? `${workspace.workspace.id}:${path}` : tab.id}
        height="100%"
        path={workspace.workspace ? `${workspace.workspace.id}/${path}` : tab.id}
        language={language}
        value={value}
        theme={theme === "light" ? "light" : "vs-dark"}
        onChange={(next) => {
          const content = next ?? "";
          setValue(content);
          if (repositoryFile) setEdited(true);
          else updateState({ value: content });
        }}
        options={{
          automaticLayout: true,
          minimap: { enabled: true },
          wordWrap: "on",
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
