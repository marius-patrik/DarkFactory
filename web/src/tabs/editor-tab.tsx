import Editor from "@monaco-editor/react";
import type { AppearanceMode } from "@/settings";
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
  const value = typeof tab.state.value === "string" ? tab.state.value : "";
  const language = typeof tab.state.language === "string" ? tab.state.language : "plaintext";
  const path = typeof tab.state.path === "string" ? tab.state.path : "Untitled";

  return (
    <div className="editor-tab">
      <div className="tab-breadcrumbs" title={path}>{path}</div>
      <Editor
        height="100%"
        language={language}
        value={value}
        theme={theme === "light" ? "light" : "vs-dark"}
        onChange={(next) => updateState({ value: next ?? "" })}
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
