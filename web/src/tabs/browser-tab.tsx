import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Copy, ExternalLink, RefreshCw, X } from "lucide-react";
import type { WorkbenchTab } from "@/workbench/model";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "about:", "blob:"]);

function normalizeUrl(input: string) {
  const value = input.trim();
  if (!value) return "about:blank";
  const candidate = /^[a-z][a-z\d+.-]*:/i.test(value) ? value : `https://${value}`;
  const url = new URL(candidate, window.location.href);
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new Error(`Unsupported browser URL protocol: ${url.protocol}`);
  }
  return url.href;
}

function browserState(tab: WorkbenchTab) {
  const initialUrl = typeof tab.state.url === "string" ? tab.state.url : "about:blank";
  const history = Array.isArray(tab.state.history)
    ? tab.state.history.filter((item): item is string => typeof item === "string")
    : [initialUrl];
  const normalizedHistory = history.length ? history : [initialUrl];
  const index = typeof tab.state.historyIndex === "number"
    ? Math.max(0, Math.min(normalizedHistory.length - 1, tab.state.historyIndex))
    : Math.max(0, normalizedHistory.length - 1);
  return { history: normalizedHistory, index };
}

export function BrowserTab({
  tab,
  updateState,
}: {
  tab: WorkbenchTab;
  updateState: (patch: Record<string, unknown>) => void;
}) {
  const incoming = useMemo(() => browserState(tab), [tab]);
  const [history, setHistory] = useState<string[]>(incoming.history);
  const [index, setIndex] = useState(incoming.index);
  const current = history[index] ?? "about:blank";
  const [draft, setDraft] = useState(current === "about:blank" ? "" : current);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(current !== "about:blank");
  const [frameError, setFrameError] = useState("");
  const [slowFrame, setSlowFrame] = useState(false);
  const [stopped, setStopped] = useState(false);

  useEffect(() => {
    setHistory(incoming.history);
    setIndex(incoming.index);
  }, [incoming.history, incoming.index]);

  useEffect(() => {
    setDraft(current === "about:blank" ? "" : current);
  }, [current]);

  useEffect(() => {
    if (!loading || current === "about:blank" || frameError) {
      setSlowFrame(false);
      return;
    }
    const timer = window.setTimeout(() => setSlowFrame(true), 8000);
    return () => window.clearTimeout(timer);
  }, [current, frameError, loading]);

  const navigate = (value: string) => {
    try {
      const url = normalizeUrl(value);
      const nextHistory = [...history.slice(0, index + 1), url];
      const nextIndex = nextHistory.length - 1;
      setHistory(nextHistory);
      setIndex(nextIndex);
      updateState({ url, history: nextHistory, historyIndex: nextIndex });
      setDraft(url === "about:blank" ? "" : url);
      setFrameError("");
      setSlowFrame(false);
      setStopped(false);
      setLoading(url !== "about:blank");
    } catch (reason) {
      setFrameError(reason instanceof Error ? reason.message : String(reason));
      setLoading(false);
    }
  };

  const step = (delta: number) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= history.length) return;
    setIndex(nextIndex);
    updateState({ url: history[nextIndex], historyIndex: nextIndex });
    setDraft(history[nextIndex]);
    setFrameError("");
    setSlowFrame(false);
    setStopped(false);
    setLoading(true);
  };

  const reload = () => {
    setRevision((value) => value + 1);
    setFrameError("");
    setSlowFrame(false);
    setStopped(false);
    setLoading(current !== "about:blank");
  };

  const stop = () => {
    setStopped(true);
    setLoading(false);
    setSlowFrame(false);
  };

  return (
    <div className="browser-tab">
      <div className="browser-toolbar">
        <button type="button" className="workbench-icon-button" disabled={index <= 0} onClick={() => step(-1)} aria-label="Back"><ArrowLeft size={14} /></button>
        <button type="button" className="workbench-icon-button" disabled={index >= history.length - 1} onClick={() => step(1)} aria-label="Forward"><ArrowRight size={14} /></button>
        {loading ? (
          <button type="button" className="workbench-icon-button" onClick={stop} aria-label="Stop"><X size={14} /></button>
        ) : (
          <button type="button" className="workbench-icon-button" onClick={reload} aria-label="Reload"><RefreshCw size={14} /></button>
        )}
        <form className="browser-location" onSubmit={(event) => { event.preventDefault(); navigate(draft); }}>
          <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Enter URL" aria-label="URL" />
        </form>
        <button type="button" className="workbench-icon-button" disabled={current === "about:blank"} onClick={() => { void navigator.clipboard?.writeText(current); }} aria-label="Copy URL"><Copy size={14} /></button>
        <a className="workbench-icon-button" href={current === "about:blank" ? undefined : current} target="_blank" rel="noreferrer" aria-label="Open externally"><ExternalLink size={14} /></a>
      </div>
      <div className="browser-content">
        {current === "about:blank" ? (
          <div className="tab-empty"><strong>Browser</strong><span>Enter a URL to open an embeddable web page.</span></div>
        ) : stopped ? (
          <div className="tab-empty">
            <strong>Navigation stopped.</strong>
            <span>{current}</span>
            <button type="button" onClick={reload}>Reload</button>
            <a href={current} target="_blank" rel="noreferrer">Open externally</a>
          </div>
        ) : frameError ? (
          <div className="tab-empty">
            <X size={20} />
            <strong>This page could not be embedded.</strong>
            <span>{frameError}</span>
            <a href={current} target="_blank" rel="noreferrer">Open externally</a>
          </div>
        ) : (
          <>
            {loading && <div className="browser-loading">Loading…</div>}
            {slowFrame && (
              <div className="browser-frame-warning">
                This page is taking unusually long to embed. It may block iframes.
                <a href={current} target="_blank" rel="noreferrer">Open externally</a>
              </div>
            )}
            <iframe
              key={`${current}:${revision}`}
              title={current}
              src={current}
              sandbox="allow-downloads allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts"
              referrerPolicy="no-referrer"
              onLoad={() => {
                setLoading(false);
                setSlowFrame(false);
              }}
              onError={() => {
                setLoading(false);
                setSlowFrame(false);
                setFrameError("The site may block embedding through browser security policy.");
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
