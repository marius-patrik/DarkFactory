export type BrowserRendererId =
  | "markdown"
  | "html"
  | "pdf"
  | "image"
  | "text"
  | "binary";

export type ResourceCapabilityProvider = {
  id: string;
  label: string;
  extensions: readonly string[];
  mime: string;
  binary: boolean;
  preferred: "editor" | "browser";
  renderer: BrowserRendererId;
  language: string;
};

const providers: ResourceCapabilityProvider[] = [
  {
    id: "typst",
    label: "Typst",
    extensions: ["typ"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "typst",
  },
  {
    id: "markdown",
    label: "Markdown",
    extensions: ["md", "mdx", "markdown"],
    mime: "text/markdown;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "markdown",
    language: "markdown",
  },
  {
    id: "html",
    label: "HTML",
    extensions: ["html", "htm"],
    mime: "text/html;charset=utf-8",
    binary: false,
    preferred: "browser",
    renderer: "html",
    language: "html",
  },
  {
    id: "svg",
    label: "SVG",
    extensions: ["svg"],
    mime: "image/svg+xml",
    binary: false,
    preferred: "browser",
    renderer: "image",
    language: "xml",
  },
  {
    id: "image",
    label: "Image",
    extensions: ["png", "jpg", "jpeg", "gif", "webp"],
    mime: "application/octet-stream",
    binary: true,
    preferred: "browser",
    renderer: "image",
    language: "plaintext",
  },
  {
    id: "pdf",
    label: "PDF",
    extensions: ["pdf"],
    mime: "application/pdf",
    binary: true,
    preferred: "browser",
    renderer: "pdf",
    language: "plaintext",
  },
  {
    id: "typescript",
    label: "TypeScript",
    extensions: ["ts", "tsx"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "typescript",
  },
  {
    id: "javascript",
    label: "JavaScript",
    extensions: ["js", "jsx", "mjs", "cjs"],
    mime: "text/javascript;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "javascript",
  },
  {
    id: "json",
    label: "JSON",
    extensions: ["json"],
    mime: "application/json;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "json",
  },
  {
    id: "css",
    label: "CSS",
    extensions: ["css"],
    mime: "text/css;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "css",
  },
  {
    id: "yaml",
    label: "YAML",
    extensions: ["yaml", "yml"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "yaml",
  },
  {
    id: "toml",
    label: "TOML",
    extensions: ["toml"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "toml",
  },
  {
    id: "python",
    label: "Python",
    extensions: ["py"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "python",
  },
  {
    id: "rust",
    label: "Rust",
    extensions: ["rs"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "rust",
  },
  {
    id: "shell",
    label: "Shell",
    extensions: ["sh", "bash", "zsh"],
    mime: "text/plain;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "shell",
  },
  {
    id: "xml",
    label: "XML",
    extensions: ["xml"],
    mime: "text/xml;charset=utf-8",
    binary: false,
    preferred: "editor",
    renderer: "text",
    language: "xml",
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
    renderer: "binary",
    language: "plaintext",
  },
];

const fallback: ResourceCapabilityProvider = {
  id: "text",
  label: "Text",
  extensions: [],
  mime: "text/plain;charset=utf-8",
  binary: false,
  preferred: "editor",
  renderer: "text",
  language: "plaintext",
};

export function extensionForPath(path: string) {
  const name = path.split("/").at(-1) || path;
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

export function listResourceCapabilityProviders() {
  return [...providers];
}

export function registerResourceCapabilityProvider(
  provider: ResourceCapabilityProvider,
  options: { prepend?: boolean } = {},
) {
  const index = providers.findIndex((candidate) => candidate.id === provider.id);
  if (index >= 0) providers.splice(index, 1);
  if (options.prepend === false) providers.push(provider);
  else providers.unshift(provider);
  return () => {
    const current = providers.findIndex((candidate) => candidate.id === provider.id);
    if (current >= 0) providers.splice(current, 1);
  };
}

export function resourceCapabilityForPath(path: string) {
  const extension = extensionForPath(path);
  return providers.find((provider) => provider.extensions.includes(extension)) ?? fallback;
}

export function representationForPath(path: string) {
  const extension = extensionForPath(path);
  return extension ? `.${extension}` : "text";
}

export function mimeForPath(path: string) {
  const extension = extensionForPath(path);
  switch (extension) {
    case "png": return "image/png";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "gif": return "image/gif";
    case "webp": return "image/webp";
    default: return resourceCapabilityForPath(path).mime;
  }
}

export function isTextResourcePath(path: string) {
  return !resourceCapabilityForPath(path).binary;
}

export function preferredWorkbenchTabForPath(path: string): "editor" | "document" {
  return resourceCapabilityForPath(path).preferred === "browser" ? "document" : "editor";
}
