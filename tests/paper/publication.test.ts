import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { expect, test } from "bun:test";

const REPOSITORY_ROOT = resolve(import.meta.dir, "..", "..");
const PAPER_ROOT = join(REPOSITORY_ROOT, "paper");
const PDF = join(REPOSITORY_ROOT, "PAPER.pdf");

async function snapshot(path: string) {
  return {
    bytes: await readFile(path),
    mode: (await stat(path)).mode,
  };
}

test("publication check does not mutate PAPER.pdf", async () => {
  const before = await snapshot(PDF);
  const child = Bun.spawn(["bun", "run", "publication", "--", "--check"], {
    cwd: PAPER_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const after = await snapshot(PDF);
  expect(
    exitCode === 0 ||
      (stdout + stderr).includes(
        "generated PDF does not match repository-root PAPER.pdf",
      ),
  ).toBe(true);
  expect(after.bytes.equals(before.bytes)).toBe(true);
  expect(after.mode).toBe(before.mode);
});
