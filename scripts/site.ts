import { cp, rm, stat } from "node:fs/promises";
import { join } from "node:path";

const WEB_DIST = join("web", "dist");
const SITE = "site";
const ARTIFACTS = ["ODBORNA_PRACE.pdf", "README.md"];

async function requireFile(path: string) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    throw new Error("missing required site input: " + path);
  }
}

await requireFile(join(WEB_DIST, "index.html"));
for (const name of ARTIFACTS) {
  await requireFile(name);
}

await rm(SITE, { recursive: true, force: true });
await cp(WEB_DIST, SITE, { recursive: true });

for (const name of ARTIFACTS) {
  await cp(name, join(SITE, name));
}

console.log("ok: assembled Pages site with workbench, PDF, and Markdown publication");
