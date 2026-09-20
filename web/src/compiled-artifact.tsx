import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

export type ArtifactFormat = "pdf" | "markdown" | "html";

export function CompiledArtifactView({
  path,
  format,
  embedded,
  theme,
  raw = false,
}: {
  path: string;
  format: Exclude<ArtifactFormat, "pdf">;
  embedded: boolean;
  theme: "dark" | "light" | "oled";
  raw?: boolean;
}) {
  const [markdown, setMarkdown] = useState("");
  const [error, setError] = useState("");
  const htmlFrame = useRef<HTMLIFrameElement>(null);

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

  useEffect(() => {
    if (format !== "html") return;
    htmlFrame.current?.contentDocument?.documentElement.setAttribute("data-theme", theme);
  }, [format, theme]);

  if (format === "html") {
    return (
      <div className={embedded ? "compiled-artifact embedded-artifact" : "compiled-artifact"}>
        <iframe
          ref={htmlFrame}
          className="compiled-html-frame"
          src={path}
          title="Compiled HTML publication"
          onLoad={(event) => {
            event.currentTarget.contentDocument?.documentElement.setAttribute("data-theme", theme);
          }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="document-error">
        <strong>Markdown unavailable.</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!markdown) {
    return <div className="document-loading">Loading Markdown…</div>;
  }

  return (
    <div className={embedded ? "compiled-artifact embedded-artifact" : "compiled-artifact"}>
      {raw ? (
        <div className="raw-markdown-artifact">
          <pre><code>{markdown}</code></pre>
        </div>
      ) : (
        <div className="markdown-artifact">
          <article className="publication-surface">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {markdown}
            </ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
}
