import { useCallback, useEffect, useRef, useState } from "react";
import { DiffEditor } from "@monaco-editor/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AppearanceMode } from "@/settings";
import { languageForPath } from "@/workspace/languages";
import { useWorkspace } from "@/workspace/context";
import type { StagedFile, WorkingFile } from "@/workspace/model";
import type { WorkbenchTab } from "@/workbench/model";

type CompareKind = "working" | "staged";

function sourceFor(
  compare: CompareKind,
  path: string,
  overlays: WorkingFile[],
  staged: StagedFile[],
) {
  return compare === "staged"
    ? staged.find((entry) => entry.path === path)
    : overlays.find((entry) => entry.path === path);
}

export function DiffTab({
  tab,
  theme,
}: {
  tab: WorkbenchTab;
  theme: AppearanceMode;
}) {
  const workspace = useWorkspace();
  const path = typeof tab.state.path === "string" ? tab.state.path : "";
  const compare = tab.state.compare === "staged" ? "staged" : "working";
  const [original, setOriginal] = useState("");
  const [modified, setModified] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const diffEditorRef = useRef<any>(null);
  const hunkIndexRef = useRef(-1);

  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setError(null);
    const source = sourceFor(compare, path, workspace.overlays, workspace.staged);
    if (!source) {
      setOriginal("");
      setModified("");
      setLoading(false);
      return;
    }

    void (async () => {
      try {
        const originalPath = source.renamedFrom || path;
        let before = "";
        if (source.status !== "added") {
          try {
            before = await workspace.readBaselineFile(originalPath);
          } catch {
            before = "";
          }
        }
        const after = source.status === "deleted" ? "" : source.content ?? "";
        if (disposed) return;
        setOriginal(before);
        setModified(after);
      } catch (reason) {
        if (!disposed) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!disposed) setLoading(false);
      }
    })();
    return () => {
      disposed = true;
    };
  }, [compare, path, workspace.overlays, workspace.readBaselineFile, workspace.staged]);

  const navigateHunk = useCallback((direction: 1 | -1) => {
    const editor = diffEditorRef.current;
    const changes = editor?.getLineChanges?.() ?? [];
    if (!changes.length) return;
    hunkIndexRef.current = (hunkIndexRef.current + direction + changes.length) % changes.length;
    const change = changes[hunkIndexRef.current];
    const line = change.modifiedStartLineNumber || change.originalStartLineNumber || 1;
    editor.getModifiedEditor?.().revealLineInCenter(line);
    editor.getModifiedEditor?.().setPosition({ lineNumber: line, column: 1 });
  }, []);

  if (!path) return <div className="tab-empty"><span>No diff resource selected.</span></div>;
  if (error) return <div className="tab-empty"><strong>Could not load diff</strong><span>{error}</span></div>;
  if (loading) return <div className="tab-empty"><span>Loading diff…</span></div>;

  return (
    <div className="diff-tab">
      <div className="tab-breadcrumbs">
        <span>{path} · {compare === "staged" ? "Staged" : "Working Tree"}</span>
        <span className="diff-hunk-actions">
          <button type="button" onClick={() => navigateHunk(-1)} title="Previous change"><ChevronUp size={13} /></button>
          <button type="button" onClick={() => navigateHunk(1)} title="Next change"><ChevronDown size={13} /></button>
        </span>
      </div>
      <DiffEditor
        height="100%"
        language={languageForPath(path)}
        original={original}
        modified={modified}
        theme={theme === "light" ? "light" : "vs-dark"}
        onMount={(editor) => {
          diffEditorRef.current = editor;
          hunkIndexRef.current = -1;
        }}
        options={{
          automaticLayout: true,
          readOnly: true,
          renderSideBySide: true,
          scrollBeyondLastLine: false,
        }}
      />
    </div>
  );
}
