import { copyFile, cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";

const WEB_DIST = join("web", "dist");
const OUT = "out";
const SITE = "site";
const ARTIFACTS = ["prace.pdf", "prace.html", "prace.md"];

async function requireFile(path: string) {
  const info = await stat(path).catch(() => null);
  if (!info?.isFile() || info.size === 0) {
    throw new Error("missing required site input: " + path);
  }
}

for (const path of [join(WEB_DIST, "index.html"), join(WEB_DIST, "viewer.html")]) {
  await requireFile(path);
}
for (const name of ARTIFACTS) {
  await requireFile(join(OUT, name));
}

await rm(SITE, { recursive: true, force: true });
await cp(WEB_DIST, SITE, { recursive: true });

for (const name of ARTIFACTS) {
  await copyFile(join(OUT, name), join(SITE, name));
}

const assets = join(OUT, "assets");
const assetInfo = await stat(assets).catch(() => null);
if (assetInfo?.isDirectory()) {
  await mkdir(join(SITE, "assets"), { recursive: true });
  await cp(assets, join(SITE, "assets"), { recursive: true });
}

await writeFile(join(SITE, ".nojekyll"), "", "utf8");
await writeFile(
  join(SITE, "publication.json"),
  JSON.stringify(
    {
      commit: process.env.GITHUB_SHA ?? "",
      source: "paper/PAPER.typ",
      artifacts: {
        pdf: "prace.pdf",
        html: "prace.html",
        markdown: "prace.md",
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log("ok: assembled Pages site with canonical publication artifacts");
