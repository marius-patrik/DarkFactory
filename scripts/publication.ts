import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const ROOT = process.cwd();
const PAPER = "index.typ";
const FONTS = "fonts";
const PDF = "ODBORNA_PRACE.pdf";
const MARKDOWN = "README.md";

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

async function validatePublication() {
  const pdf = await Bun.file(PDF).arrayBuffer();
  const signature = new TextDecoder().decode(pdf.slice(0, 5));
  if (signature !== "%PDF-") throw new Error("Typst output is not a PDF: " + PDF);

  const markdown = await readFile(MARKDOWN, "utf8");
  if (markdown.trim().length < 256 || !markdown.includes("#")) {
    throw new Error("derived Markdown output is unexpectedly small: " + MARKDOWN);
  }
}

async function main() {
  await run(["typst", "compile", "--font-path", FONTS, PAPER, PDF]);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "darkfactory-publication-"));
  const htmlPath = join(temporaryDirectory, "publication.html");
  try {
    await run([
      "typst", "compile", "--features", "html", "--format", "html",
      "--font-path", FONTS, PAPER, htmlPath,
    ]);
    const html = await readFile(htmlPath, "utf8");
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
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  await validatePublication();
  console.log("ok: built canonical publication -> ODBORNA_PRACE.pdf, README.md");
}

await main();
