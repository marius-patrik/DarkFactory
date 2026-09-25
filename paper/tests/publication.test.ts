import { readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { expect, test } from "bun:test";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const REPOSITORY_ROOT = resolve(PACKAGE_ROOT, "..");
const PDF = join(PACKAGE_ROOT, "ODBORNA_PRACE.pdf");
const README = join(REPOSITORY_ROOT, "README.md");

async function snapshot(path: string) {
  return {
    bytes: await readFile(path),
    mode: (await stat(path)).mode,
  };
}

test("publication check does not mutate tracked outputs", async () => {
  const before = await Promise.all([snapshot(PDF), snapshot(README)]);
  const child = Bun.spawn(["bun", "run", "publication", "--", "--check"], {
    cwd: PACKAGE_ROOT,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  const after = await Promise.all([snapshot(PDF), snapshot(README)]);
  expect(
    exitCode === 0 ||
      (stdout + stderr).includes(
        "generated Markdown does not match repository-root README.md",
      ),
  ).toBe(true);
  expect(after[0].bytes.equals(before[0].bytes)).toBe(true);
  expect(after[1].bytes.equals(before[1].bytes)).toBe(true);
  expect(after[0].mode).toBe(before[0].mode);
  expect(after[1].mode).toBe(before[1].mode);
});
