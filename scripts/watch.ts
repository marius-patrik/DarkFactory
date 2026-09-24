import { watch } from "node:fs";

const ROOT = process.cwd();
const PAPER = "index.typ";
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
    console.log("[dev] building publication and web outputs...");
    const child = Bun.spawn(["bun", "run", "build"], {
      cwd: ROOT,
      stdout: "inherit",
      stderr: "inherit",
    });
    const exitCode = await child.exited;
    if (exitCode === 0) {
      console.log("[dev] build complete");
    } else {
      console.error(`[dev] build failed (${exitCode}); continuing to watch ${PAPER}`);
    }
  } while (rebuildRequested);
  building = false;
}

function scheduleBuild() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void runBuild(), DEBOUNCE_MS);
}

const watcher = watch(ROOT, { persistent: true }, (_eventType, filename) => {
  if (filename === null || filename.toString() === PAPER) scheduleBuild();
});

process.on("SIGINT", () => {
  watcher.close();
  process.exit(0);
});

console.log(`[dev] watching ${PAPER}; saves run: bun run build`);
await runBuild();
