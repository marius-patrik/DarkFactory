export type RendererCapabilityId =
  | "markdown"
  | "html"
  | "pdf"
  | "image"
  | "text"
  | "binary";

export type RendererCapability = {
  id: RendererCapabilityId;
  label: string;
  extensions: readonly string[];
  mime: string;
  binary: boolean;
  preferred: "editor" | "browser";
};

const CAPABILITIES: readonly RendererCapability[] = [
  {
    id: "markdown",
    label: "Markdown",
    extensions: ["md", "mdx"],
    mime: "text/markdown;charset=utf-8",
    binary: false,
    preferred: "editor",
  },
  {
    id: "html",
    label: "HTML",
    extensions: ["html", "htm"],
    mime: "text/html;charset=utf-8",
    binary: false,
    preferred: "browser",
  },
  {
    id: "pdf",
    label: "PDF",
    extensions: ["pdf"],
    mime: "application/pdf",
    binary: true,
    preferred: "browser",
  },
  {
    id: "image",
    label: "Image",
    extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg"],
    mime: "application/octet-stream",
    binary: true,
    preferred: "browser",
  },
  {
    id: "binary",
    label: "Binary",
    extensions: [
      "ico", "zip", "gz", "tar", "woff", "woff2", "ttf", "otf",
      "wasm", "mp3", "mp4", "mov", "avi",
    ],
    mime: "application/octet-stream",
    binary: true,
    preferred: "browser",
  },
];

const TEXT_FALLBACK: RendererCapability = {
  id: "text",
  label: "Text",
  extensions: [],
  mime: "text/plain;charset=utf-8",
  binary: false,
  preferred: "editor",
};

export function extensionForPath(path: string) {
  const name = path.split("/").at(-1) || path;
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function rendererCapabilityForPath(path: string) {
  const extension = extensionForPath(path);
  return CAPABILITIES.find((capability) => capability.extensions.includes(extension)) ?? TEXT_FALLBACK;
}

export function representationForPath(path: string) {
  const extension = extensionForPath(path);
  return extension ? `.${extension}` : "text";
}

export function mimeForPath(path: string) {
  const extension = extensionForPath(path);
  switch (extension) {
    case "svg": return "image/svg+xml";
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    case "json": return "application/json;charset=utf-8";
    case "css": return "text/css;charset=utf-8";
    case "js":
    case "mjs":
    case "cjs": return "text/javascript;charset=utf-8";
    default: return rendererCapabilityForPath(path).mime;
  }
}

export function isTextResourcePath(path: string) {
  return !rendererCapabilityForPath(path).binary;
}

export function preferredWorkbenchTabForPath(path: string): "editor" | "document" {
  return rendererCapabilityForPath(path).preferred === "browser" ? "document" : "editor";
}
