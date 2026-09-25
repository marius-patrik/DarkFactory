import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");
const PAPER_ROOT = join(REPOSITORY_ROOT, "paper");
const SOURCE = join(PAPER_ROOT, "index.typ");
const FONT_PATH = join(PAPER_ROOT, "fonts");
const PDF = join(REPOSITORY_ROOT, "PAPER.pdf");
const CHECK = process.argv.includes("--check");

async function run(command: string[]) {
  const child = Bun.spawn(command, {
    cwd: PAPER_ROOT,
    stdout: "inherit",
    stderr: "inherit",
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) {
    throw new Error(`command failed (${exitCode}): ${command.join(" ")}`);
  }
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
  const temporaryPdf = join(temporaryDirectory, "PAPER.pdf");
  try {
    await run([
      "typst",
      "compile",
      "--font-path",
      FONT_PATH,
      SOURCE,
      temporaryPdf,
    ]);
    await validatePdf(temporaryPdf);
    if (CHECK) {
      const expected = new Uint8Array(await Bun.file(PDF).arrayBuffer());
      const actual = new Uint8Array(await Bun.file(temporaryPdf).arrayBuffer());
      if (
        expected.length !== actual.length ||
        expected.some((value, index) => value !== actual[index])
      ) {
        throw new Error(
          "generated PDF does not match repository-root PAPER.pdf",
        );
      }
    } else {
      await copyFile(temporaryPdf, PDF);
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
  console.log(
    CHECK
      ? "ok: checked PAPER.pdf without mutating the tracked output"
      : "ok: built repository-root PAPER.pdf",
  );
}

await main();
