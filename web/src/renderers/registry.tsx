import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PdfDocumentView } from "@/pdf-document";
import {
  rendererCapabilityForPath,
  type RendererCapabilityId,
} from "./capabilities";

export type RenderableResourceSnapshot = {
  label: string;
  exists: boolean;
  content: string | null;
  bytes: Uint8Array | null;
  mime: string;
};

function bytesBlob(bytes: Uint8Array, type: string) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type });
}

function useObjectUrl(snapshot: RenderableResourceSnapshot | null) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!snapshot?.exists || !snapshot.bytes) {
      setUrl("");
      return;
    }
    const next = URL.createObjectURL(bytesBlob(snapshot.bytes, snapshot.mime));
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [snapshot]);
  return url;
}

const noop = () => undefined;

function renderCapability(
  id: RendererCapabilityId,
  path: string,
  snapshot: RenderableResourceSnapshot,
  objectUrl: string,
) {
  switch (id) {
    case "markdown":
      return (
        <div className="rendered-scroll">
          <article className="publication-surface">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{snapshot.content ?? ""}</ReactMarkdown>
          </article>
        </div>
      );
    case "html":
      return (
        <iframe
          className="resource-html-frame"
          title={snapshot.label}
          srcDoc={snapshot.content ?? ""}
          sandbox="allow-forms allow-popups allow-scripts"
          referrerPolicy="no-referrer"
        />
      );
    case "pdf":
      return objectUrl ? (
        <div className="resource-pdf">
          <PdfDocumentView
            pdfPath={objectUrl}
            embedded
            sidebarSide="left"
            sidebarMode="thumbnails"
            sidebarHidden
            sidebarWidth={220}
            onMoveSidebar={noop}
            onToggleSidebarMode={noop}
            onSidebarWidthChange={noop}
            onStateChange={noop}
          />
        </div>
      ) : null;
    case "image":
      return objectUrl ? (
        <div className="resource-image">
          <img src={objectUrl} alt={path} />
        </div>
      ) : null;
    case "text":
      return <pre className="resource-pre">{snapshot.content ?? ""}</pre>;
    case "binary":
      return (
        <div className="tab-empty">
          <strong>{snapshot.label}</strong>
          <span>No Browser renderer is registered for this binary format.</span>
        </div>
      );
  }
}

export function RenderedResource({
  path,
  snapshot,
}: {
  path: string;
  snapshot: RenderableResourceSnapshot | null;
}) {
  const objectUrl = useObjectUrl(snapshot);
  if (!snapshot) return <div className="tab-empty"><span>No resource loaded.</span></div>;
  if (!snapshot.exists) {
    return (
      <div className="tab-empty">
        <strong>{snapshot.label}</strong>
        <span>File does not exist in this side of the comparison.</span>
      </div>
    );
  }
  const capability = rendererCapabilityForPath(path);
  return renderCapability(capability.id, path, snapshot, objectUrl);
}
