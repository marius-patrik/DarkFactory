import { watch } from "node:fs";
import { join, resolve } from "node:path";

const PACKAGE_ROOT = resolve(import.meta.dir, "..");
const PAPER = join(PACKAGE_ROOT, "index.typ");
const WATCH_PATHS = [
  PAPER,
  join(PACKAGE_ROOT, "bib"),
  join(PACKAGE_ROOT, "img"),
  join(PACKAGE_ROOT, "fonts"),
];
const DEBOUNCE_MS = 150;

let debounce: ReturnType<typeof setTimeout> | undefined;
let building = false;
let rebuildRequested = false;

async function runBuild() {
  if (building) {
    rebuildRequested = true;
    return;
  }

  building = true;
  do {
    rebuildRequested = false;
    console.log("[dev] building publication...");
    const child = Bun.spawn(["bun", "run", "publication"], {
      cwd: PACKAGE_ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await child.exited;
    if (exitCode === 0) {
      console.log("[dev] publication build complete");
    } else {
      console.error(
        `[dev] publication build failed (${exitCode}); continuing to watch paper sources`,
      );
    }
  } while (rebuildRequested);
  building = false;
}

function scheduleBuild() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void runBuild(), DEBOUNCE_MS);
}

const watchers = WATCH_PATHS.map((path) =>
  watch(path, { persistent: true }, () => scheduleBuild()),
);

process.on("SIGINT", () => {
  for (const watcher of watchers) watcher.close();
  process.exit(0);
});

console.log(
  "[dev] watching paper/index.typ, paper/bib, paper/img, paper/fonts",
);
await runBuild();
