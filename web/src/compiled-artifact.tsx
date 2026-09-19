import { useEffect, useState } from "react";

export type ArtifactFormat = "pdf" | "markdown" | "html";

export function CompiledArtifactView({
  path,
  format,
  embedded,
}: {
  path: string;
  format: Exclude<ArtifactFormat, "pdf">;
  embedded: boolean;
}) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (format !== "markdown") {
      setMarkdown("");
      setError("");
      return;
    }

    let disposed = false;
    setMarkdown("");
    setError("");
    void fetch(path, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error(path + ": " + response.status);
        return response.text();
      })
      .then((source) => {
        if (!disposed) setMarkdown(source);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason?.message || reason));
      });

    return () => {
      disposed = true;
    };
  }, [format, path]);

  if (format === "html") {
    return (
      <div className={embedded ? "compiled-artifact embedded-artifact" : "compiled-artifact"}>
        <iframe
          className="compiled-html-frame"
          src={path}
          title="Compiled HTML publication"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-error">
        <strong>Compiled Markdown unavailable.</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!markdown) {
    return <div className="document-loading">Loading compiled Markdown…</div>;
  }

  return (
    <div className={embedded ? "compiled-artifact embedded-artifact" : "compiled-artifact"}>
      <div className="markdown-artifact">
        <pre>
          <code>{markdown}</code>
        </pre>
      </div>
    </div>
  );
}
