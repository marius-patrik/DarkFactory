import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import type { WorkbenchTab } from "@/workbench/model";

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) return "about:blank";
  if (/^[a-z][a-z\d+.-]*:/i.test(value)) return value;
  return `https://${value}`;
}

export function BrowserTab({
  tab,
  updateState,
}: {
  tab: WorkbenchTab;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const initialUrl = typeof tab.state.url === "string" ? tab.state.url : "about:blank";
  const history = Array.isArray(tab.state.history) ? tab.state.history.filter((item): item is string => typeof item === "string") : [initialUrl];
  const index = typeof tab.state.historyIndex === "number" ? Math.max(0, Math.min(history.length - 1, tab.state.historyIndex)) : Math.max(0, history.length - 1);
  const current = history[index] ?? initialUrl;
  const [draft, setDraft] = useState(current === "about:blank" ? "" : current);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(current !== "about:blank");
  const [frameError, setFrameError] = useState(false);

  const src = useMemo(() => {
    if (current === "about:blank") return current;
    const separator = current.includes("#") ? "&" : "#";
    return `${current}${separator}workbench-refresh=${revision}`;
  }, [current, revision]);

  const navigate = (value: string) => {
    const url = normalizeUrl(value);
    const nextHistory = [...history.slice(0, index + 1), url];
    updateState({ url, history: nextHistory, historyIndex: nextHistory.length - 1 });
    setDraft(url === "about:blank" ? "" : url);
    setFrameError(false);
    setLoading(url !== "about:blank");
  };

  const step = (delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    updateState({ url: history[nextIndex], historyIndex: nextIndex });
    setDraft(history[nextIndex]);
    setFrameError(false);
    setLoading(true);
  };

  return (
    <div className="browser-tab">
      <div className="browser-toolbar">
        <button type="button" className="workbench-icon-button" disabled={index <= 0} onClick={() => step(-1)} aria-label="Back"><ArrowLeft size={14} /></button>
        <button type="button" className="workbench-icon-button" disabled={index >= history.length - 1} onClick={() => step(1)} aria-label="Forward"><ArrowRight size={14} /></button>
        <button type="button" className="workbench-icon-button" onClick={() => { setRevision((value) => value + 1); setFrameError(false); setLoading(current !== "about:blank"); }} aria-label="Reload"><RefreshCw size={14} /></button>
        <form className="browser-location" onSubmit={(event) => { event.preventDefault(); navigate(draft); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Enter URL" aria-label="URL" />
        </form>
        <button type="button" className="workbench-icon-button" disabled={current === "about:blank"} onClick={() => { void navigator.clipboard?.writeText(current); }} aria-label="Copy URL"><Copy size={14} /></button>
        <a className="workbench-icon-button" href={current === "about:blank" ? undefined : current} target="_blank" rel="noreferrer" aria-label="Open externally"><ExternalLink size={14} /></a>
      </div>
      <div className="browser-content">
        {current === "about:blank" ? (
          <div className="tab-empty"><strong>Browser</strong><span>Enter a URL to open an embeddable web page.</span></div>
        ) : frameError ? (
          <div className="tab-empty"><X size={20} /><strong>This page could not be embedded.</strong><span>The site may block iframes with browser security policy. Open it externally instead.</span><a href={current} target="_blank" rel="noreferrer">Open externally</a></div>
        ) : (
          <>
            {loading && <div className="browser-loading">Loading…</div>}
            <iframe key={src} title={current} src={src} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFrameError(true); }} />
          </>
        )}
      </div>
    </div>
  );
}
