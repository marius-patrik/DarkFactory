import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { renderEvidence } from "./evidence";

const ROOT = process.cwd();
const OUT = join(ROOT, "out");
const PAPER = join("paper", "PAPER.typ");
const FONTS = join("paper", "fonts");
const PDF = join("out", "prace.pdf");
const HTML = join("out", "prace.html");
const MARKDOWN = join("out", "prace.md");
const PUBLICATION_CSS = join("web", "src", "publication.css");

async function run(command: string[]) {
  const process = Bun.spawn(command, {
    cwd: ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await process.exited;
  if (exitCode !== 0) {
    throw new Error("command failed (" + exitCode + "): " + command.join(" "));
  }
}

async function exists(path: string) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function withPublicationSurface(source: string) {
  const body = source.match(/<body(?<attrs>[^>]*)>/i);
  if (!body?.groups) {
    throw new Error("compiled Typst HTML has no body element");
  }

  let attrs = body.groups.attrs;
  const classMatch = attrs.match(/class="([^"]*)"/i);
  if (classMatch) {
    const classes = classMatch[1].split(/\s+/).filter(Boolean);
    if (!classes.includes("publication-surface")) classes.push("publication-surface");
    attrs = attrs.replace(/class="[^"]*"/i, 'class="' + classes.join(" ") + '"');
  } else {
    attrs += ' class="publication-surface"';
  }

  return source.slice(0, body.index) + "<body" + attrs + ">" + source.slice((body.index ?? 0) + body[0].length);
}

async function localizeImages(source: string) {
  const matches = Array.from(
    source.matchAll(/<(?:img|image)\b[^>]*?\b(?:src|href)="([^"]+)"/gi),
    (match) => match[1],
  );
  const refs = [...new Set(matches)];

  for (const raw of refs) {
    if (/^(?:data:|https?:)/i.test(raw) || /^[a-z][a-z0-9+.-]*:/i.test(raw)) continue;

    const hashIndex = raw.indexOf("#");
    const queryIndex = raw.indexOf("?");
    const cut = [hashIndex, queryIndex].filter((value) => value >= 0).sort((a, b) => a - b)[0] ?? raw.length;
    const pathPart = raw.slice(0, cut);
    const suffix = raw.slice(cut);
    const decoded = decodeURIComponent(pathPart);
    const candidate = resolve(ROOT, decoded.replace(/^\/+/, ""));

    if (!candidate.startsWith(ROOT) || !(await exists(candidate))) continue;

    const sourceRelative = relative(ROOT, candidate).split("\\").join("/");
    const targetRelative = join("assets", sourceRelative).split("\\").join("/");
    const target = join(OUT, targetRelative);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(candidate, target);
    source = source.split(raw).join(targetRelative + suffix);
  }

  return source;
}

async function validatePublication() {
  const pdf = await Bun.file(PDF).arrayBuffer();
  const signature = new TextDecoder().decode(pdf.slice(0, 5));
  if (signature !== "%PDF-") throw new Error("Typst output is not a PDF: " + PDF);

  const html = await readFile(HTML, "utf8");
  if (!/<html\b/i.test(html) || !/<body\b/i.test(html)) {
    throw new Error("Typst HTML output is incomplete: " + HTML);
  }

  const markdown = await readFile(MARKDOWN, "utf8");
  if (markdown.trim().length < 256 || !markdown.includes("#")) {
    throw new Error("derived Markdown output is unexpectedly small: " + MARKDOWN);
  }
}

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  await renderEvidence();

  await run(["typst", "compile", "--font-path", FONTS, PAPER, PDF]);
  await run([
    "typst",
    "compile",
    "--features",
    "html",
    "--format",
    "html",
    "--font-path",
    FONTS,
    PAPER,
    HTML,
  ]);

  let html = await readFile(HTML, "utf8");
  html = await localizeImages(html);
  html = withPublicationSurface(html);

  if (!html.includes("</head>")) {
    throw new Error("compiled Typst HTML has no head element");
  }
  const css = await readFile(PUBLICATION_CSS, "utf8");
  html = html.replace(
    "</head>",
    '<style id="darkfactory-publication-style">\n' + css + "\n</style></head>",
  );
  await writeFile(HTML, html, "utf8");

  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  turndown.use(gfm);
  turndown.keep(["math", "svg", "sup", "sub"]);
  const markdown = turndown.turndown(body).trim() + "\n";
  await writeFile(MARKDOWN, markdown, "utf8");

  await validatePublication();
  console.log("ok: built canonical publication -> out/prace.pdf, out/prace.html, out/prace.md");
}

await main();
