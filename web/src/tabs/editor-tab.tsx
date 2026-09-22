import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { registerCapabilityLanguages } from "@/capabilities/monaco";
import type { AppearanceMode } from "@/settings";
import { useWorkspace } from "@/workspace/context";
import { languageForPath } from "@/workspace/languages";
import type { WorkbenchTab } from "@/workbench/model";
import {
  RenderedResource,
  ResourceControls,
  ReviewOverlay,
  useResourceComparison,
  type CompareMode,
  type ResourceRenderer,
} from "./resource-view";

const COMPARE_MODES = new Set<CompareMode>([
  "none", "working", "staged", "commit", "branch", "pull-request",
]);

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
  const renderer: ResourceRenderer = tab.state.renderer === "browser" ? "browser" : "editor";
  const review = tab.state.review === true;
  const compareCandidate = typeof tab.state.compare === "string" ? tab.state.compare as CompareMode : "none";
  const compare = COMPARE_MODES.has(compareCandidate) ? compareCandidate : "none";
  const compareTarget = typeof tab.state.compareTarget === "string" ? tab.state.compareTarget : "";

  const [value, setValue] = useState(() => typeof tab.state.value === "string" ? tab.state.value : "");
  const [loadedPath, setLoadedPath] = useState(repositoryFile ? "" : path);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const viewStateTimer = useRef<number | null>(null);
  const editorDisposables = useRef<Array<{ dispose: () => void }>>([]);
  const resource = useResourceComparison(repositoryFile ? path : "", compare, compareTarget);

  useEffect(() => () => {
    if (viewStateTimer.current !== null) window.clearTimeout(viewStateTimer.current);
    for (const disposable of editorDisposables.current) disposable.dispose();
    editorDisposables.current = [];
  }, []);

  const handleEditorMount: OnMount = (editor) => {
    for (const disposable of editorDisposables.current) disposable.dispose();
    editorDisposables.current = [];

    const saved = tab.state.editorViewState;
    if (saved && typeof saved === "object") {
      editor.restoreViewState(saved as MonacoEditor.ICodeEditorViewState);
    }

    const persistViewState = () => {
      if (viewStateTimer.current !== null) window.clearTimeout(viewStateTimer.current);
      viewStateTimer.current = window.setTimeout(() => {
        viewStateTimer.current = null;
        const next = editor.saveViewState();
        if (next) updateState({ editorViewState: next });
      }, 180);
    };

    editorDisposables.current = [
      editor.onDidChangeCursorSelection(persistViewState),
      editor.onDidScrollChange(persistViewState),
    ];
  };

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

  const liveCurrent = useMemo(() => {
    if (!resource.current || loadedPath !== path || resource.current.content === null) return resource.current;
    return {
      ...resource.current,
      content: value,
      bytes: new TextEncoder().encode(value),
    };
  }, [loadedPath, path, resource.current, value]);

  if (error) {
    return <div className="tab-empty"><strong>Could not open {path}</strong><span>{error}</span></div>;
  }
  if (repositoryFile && loadedPath !== path) {
    return <div className="tab-empty"><span>Loading {path}…</span></div>;
  }

  const status = repositoryFile ? workspace.fileStatus(path) : null;
  const comparison = resource.comparison;
  const compareActive = compare !== "none";

  let body: ReactNode;
  if (!repositoryFile && renderer === "browser") {
    body = <div className="tab-empty"><strong>Browser renderer</strong><span>Save or open a repository file before using Browser rendering.</span></div>;
  } else if (compareActive && resource.loading) {
    body = <div className="tab-empty"><span>Loading comparison…</span></div>;
  } else if (compareActive && resource.error) {
    body = <div className="tab-empty"><strong>Comparison unavailable</strong><span>{resource.error}</span></div>;
  } else if (renderer === "editor" && compareActive && comparison) {
    if (comparison.before.content === null || comparison.after.content === null) {
      body = <div className="tab-empty"><strong>Binary comparison</strong><span>Switch Renderer to Browser for supported binary renderers.</span></div>;
    } else {
      body = (
        <DiffEditor
          height="100%"
          beforeMount={registerCapabilityLanguages}
          language={language}
          original={comparison.before.content}
          modified={comparison.after.content}
          theme={theme === "light" ? "light" : "vs-dark"}
          options={{
            automaticLayout: true,
            readOnly: true,
            renderSideBySide: true,
            scrollBeyondLastLine: false,
          }}
        />
      );
    }
  } else if (renderer === "editor") {
    body = (
      <Editor
        key={workspace.workspace ? `${workspace.workspace.id}:${path}` : tab.id}
        height="100%"
        beforeMount={registerCapabilityLanguages}
        onMount={handleEditorMount}
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
    );
  } else if (compareActive && comparison) {
    body = (
      <div className="rendered-comparison">
        <section>
          <header>{comparison.before.label}</header>
          <RenderedResource path={path} snapshot={comparison.before} />
        </section>
        <section>
          <header>{comparison.after.label}</header>
          <RenderedResource path={path} snapshot={comparison.after} />
        </section>
      </div>
    );
  } else if (resource.loading) {
    body = <div className="tab-empty"><span>Loading renderer…</span></div>;
  } else if (resource.error) {
    body = <div className="tab-empty"><strong>Renderer unavailable</strong><span>{resource.error}</span></div>;
  } else {
    body = <RenderedResource path={path} snapshot={liveCurrent} />;
  }

  return (
    <div className="resource-tab">
      <ResourceControls
        path={path}
        renderer={renderer}
        review={review}
        compare={compare}
        target={compareTarget}
        onChange={updateState}
      />
      <div className={review ? "resource-body review-enabled" : "resource-body"}>
        {body}
        <ReviewOverlay enabled={review} />
        {status && <span className={`resource-status file-status status-${status}`}>{status}</span>}
      </div>
    </div>
  );
}
