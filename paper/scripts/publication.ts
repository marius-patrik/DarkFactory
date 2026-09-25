import { copyFile, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..");
const SOURCE = join(PACKAGE_ROOT, "index.typ");
const FONT_PATH = join(PACKAGE_ROOT, "fonts");
const PDF = join(PACKAGE_ROOT, "ODBORNA_PRACE.pdf");
const README = join(REPOSITORY_ROOT, "README.md");
const CHECK = process.argv.includes("--check");

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: PACKAGE_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`command failed (${exitCode}): ${command.join(" ")}`);
  }
}

function markdownFromHtml(html: string) {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? html;
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
  });
  turndown.use(gfm);
  turndown.keep(["math", "svg", "sup", "sub"]);
  return `${turndown.turndown(body).trim()}\n`;
}

async function validatePdf(path: string) {
  const bytes = new Uint8Array(await Bun.file(path).arrayBuffer());
  const text = new TextDecoder("latin1").decode(bytes);
  if (!text.startsWith("%PDF-")) {
    throw new Error(`Typst output is not a PDF: ${path}`);
  }
  if (!/\/Type\s*\/Pages\b/.test(text) || !/\/Type\s*\/Page\b/.test(text)) {
    throw new Error(`Typst PDF has no page tree: ${path}`);
  }
  if (!/startxref\s+\d+\s+%%EOF\s*$/.test(text)) {
    throw new Error(`Typst PDF has an invalid trailer: ${path}`);
  }
}

async function main() {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "darkfactory-paper-"),
  );
  const temporaryPdf = join(temporaryDirectory, "ODBORNA_PRACE.pdf");
  const temporaryHtml = join(temporaryDirectory, "publication.html");
  const temporaryMarkdown = join(temporaryDirectory, "README.md");
  try {
    await run([
      "typst",
      "compile",
      "--font-path",
      FONT_PATH,
      SOURCE,
      temporaryPdf,
    ]);
    await run([
      "typst",
      "compile",
      "--features",
      "html",
      "--format",
      "html",
      "--font-path",
      FONT_PATH,
      SOURCE,
      temporaryHtml,
    ]);
    const markdown = markdownFromHtml(await readFile(temporaryHtml, "utf8"));
    await writeFile(temporaryMarkdown, markdown, "utf8");
    await validatePdf(temporaryPdf);
    if (CHECK) {
      const expected = await readFile(README, "utf8");
      if (expected !== markdown) {
        throw new Error(
          "generated Markdown does not match repository-root README.md",
        );
      }
    } else {
      await copyFile(temporaryPdf, PDF);
      await writeFile(README, markdown, "utf8");
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.log(
    CHECK
      ? "ok: checked publication without mutating tracked outputs"
      : "ok: built paper/ODBORNA_PRACE.pdf and repository-root README.md",
  );
}

await main();
