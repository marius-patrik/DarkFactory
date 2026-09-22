import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Command, Search } from "lucide-react";
import type { WorkbenchTabType } from "./model";
import { useWorkbenchRuntime } from "./runtime";

export type OmnibarMode = "navigation" | "command";
export type OmnibarQueryKind = "command" | "symbol" | "issue" | "line" | "url" | "resource";
export type OmnibarControl = { focus: (mode: OmnibarMode) => void };

const COMMANDS: Array<{ label: string; type?: WorkbenchTabType; action?: "primary" | "secondary" | "panel" }> = [
  { label: "Open Editor", type: "editor" },
  { label: "Open Browser", type: "browser" },
  { label: "Open Explorer", type: "explorer" },
  { label: "Open Source Control", type: "source-control" },
  { label: "Open Search", type: "search" },
  { label: "Open Problems", type: "problems" },
  { label: "Open Output", type: "output" },
  { label: "Open Settings", type: "settings" },
  { label: "Toggle Primary Sidebar", action: "primary" },
  { label: "Toggle Secondary Sidebar", action: "secondary" },
  { label: "Toggle Panel", action: "panel" },
];

function looksLikeUrl(value: string) {
  return /^(https?:\/\/|about:|localhost(?::\d+)?(?:\/|$)|[\w.-]+\.[a-z]{2,}(?:\/|$))/i.test(value.trim());
}

export function classifyOmnibarQuery(value: string): OmnibarQueryKind {
  const query = value.trim();
  if (query.startsWith(">")) return "command";
  if (query.startsWith("@")) return "symbol";
  if (query.startsWith("#")) return "issue";
  if (query.startsWith(":")) return "line";
  if (looksLikeUrl(query)) return "url";
  return "resource";
}

export const Omnibar = forwardRef<OmnibarControl>(function Omnibar(_, ref) {
  const runtime = useWorkbenchRuntime();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<OmnibarMode>("navigation");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({
    focus(nextMode) {
      setMode(nextMode);
      setQuery(nextMode === "command" ? ">" : "");
      requestAnimationFrame(() => inputRef.current?.focus());
    },
  }), []);

  const commandQuery = query.replace(/^>/, "").trim().toLowerCase();
  const visibleCommands = COMMANDS.filter((command) => !commandQuery || command.label.toLowerCase().includes(commandQuery)).slice(0, 8);

  const runCommand = (command: (typeof COMMANDS)[number]) => {
    if (command.type) runtime.openTab(command.type);
    if (command.action === "primary") runtime.toggleSurface("primary");
    if (command.action === "secondary") runtime.toggleSurface("secondary");
    if (command.action === "panel") runtime.toggleSurface("panel");
    setFocused(false);
    inputRef.current?.blur();
  };

  return (
    <div className="omnibar-shell">
      <div className="omnibar-input-wrap">
        {mode === "command" ? <Command size={14} /> : <Search size={14} />}
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setFocused(true)}
          onBlur={() => window.setTimeout(() => setFocused(false), 100)}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            if (next.startsWith(">")) setMode("command");
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") { inputRef.current?.blur(); setFocused(false); return; }
            if (event.key !== "Enter") return;
            const queryKind = mode === "command" ? "command" : classifyOmnibarQuery(query);
            if (queryKind === "command") {
              const command = visibleCommands[0];
              if (command) runCommand(command);
              return;
            }
            if (queryKind === "url") {
              const url = /^[a-z][a-z\d+.-]*:/i.test(query) ? query : `https://${query}`;
              runtime.openTab("browser", "main", { url, history: [url], historyIndex: 0 });
            }
          }}
          placeholder={mode === "command" ? "Type a command" : "Search files, resources, or enter URL"}
          aria-label="Workbench omnibar"
        />
        <kbd>{mode === "command" ? "⌘⇧P" : "⌘P"}</kbd>
      </div>
      {focused && (mode === "command" || query.startsWith(">")) && (
        <div className="omnibar-results">
          {visibleCommands.length ? visibleCommands.map((command) => (
            <button key={command.label} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => runCommand(command)}>{command.label}</button>
          )) : <div className="omnibar-empty">No matching commands</div>}
        </div>
      )}
    </div>
  );
});
