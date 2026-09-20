import { useEffect, useRef, useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

loader.config({ monaco });

(globalThis as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, label: string) => Worker;
  };
}).MonacoEnvironment = {
  getWorker: (_moduleId, label) => {
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new Worker(
        new URL("monaco-editor/language/html/html.worker", import.meta.url),
        { type: "module" },
      );
    }

    return new Worker(
      new URL("monaco-editor/editor/editor.worker", import.meta.url),
      { type: "module" },
    );
  },
};

export type ArtifactFormat = "pdf" | "markdown" | "html";

const configureMonaco = (instance: typeof monaco) => {
  instance.editor.defineTheme("darkfactory-oled", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": "#000000",
      "editorGutter.background": "#000000",
      "minimap.background": "#000000",
    },
  });
};

function hexDump(bytes: Uint8Array) {
  const width = 16;
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += width) {
    const slice = bytes.subarray(offset, Math.min(offset + width, bytes.length));
    const hex = Array.from(slice, (value) => value.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(width * 3 - 1, " ");
    const ascii = Array.from(slice, (value) =>
      value >= 32 && value <= 126 ? String.fromCharCode(value) : ".",
    ).join("");
    lines.push(offset.toString(16).padStart(8, "0") + "  " + hex + "  |" + ascii + "|");
  }
  return lines.join("\n");
}

export function RawArtifactView({
  path,
  format,
  embedded,
  theme,
}: {
  path: string;
  format: ArtifactFormat;
  embedded: boolean;
  theme: "dark" | "light" | "oled";
}) {
  const [source, setSource] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    setSource("");
    setError("");

    void fetch(path, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(path + ": " + response.status);
        if (format === "pdf") {
          const bytes = new Uint8Array(await response.arrayBuffer());
          return hexDump(bytes);
        }
        return response.text();
      })
      .then((value) => {
        if (!disposed) setSource(value);
      })
      .catch((reason) => {
        if (!disposed) setError(String(reason?.message || reason));
      });

    return () => {
      disposed = true;
    };
  }, [format, path]);

  if (error) {
    return (
      <div className="document-error">
        <strong>Raw artifact unavailable.</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!source) {
    return <div className="document-loading">Loading raw {format.toUpperCase()}…</div>;
  }

  const language = format === "html" ? "html" : format === "markdown" ? "markdown" : "plaintext";
  const editorTheme = theme === "light" ? "vs" : theme === "oled" ? "darkfactory-oled" : "vs-dark";

  return (
    <div className={embedded ? "raw-artifact embedded-artifact" : "raw-artifact"}>
      <Editor
        path={path}
        value={source}
        language={language}
        theme={editorTheme}
        beforeMount={configureMonaco}
        options={{
          readOnly: true,
          domReadOnly: true,
          automaticLayout: true,
          minimap: { enabled: true },
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          wordWrap: format === "markdown" ? "on" : "off",
          fontSize: 13,
          lineNumbersMinChars: 4,
          renderWhitespace: "selection",
          bracketPairColorization: { enabled: true },
          padding: { top: 12, bottom: 12 },
        }}
      />
    </div>
  );
}

export function CompiledArtifactView({
  path,
  format,
  embedded,
  theme,
}: {
  path: string;
  format: Exclude<ArtifactFormat, "pdf">;
  embedded: boolean;
  theme: "dark" | "light" | "oled";
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
          title="Rendered HTML publication"
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
      <div className="markdown-artifact">
        <article className="publication-surface">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
            {markdown}
          </ReactMarkdown>
        </article>
      </div>
    </div>
  );
}
