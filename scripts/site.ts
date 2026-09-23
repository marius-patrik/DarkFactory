import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
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

for (const path of [join(WEB_DIST, "index.html"), join(WEB_DIST, "viewer.html")]) {
  await requireFile(path);
}
for (const name of ARTIFACTS) {
  await requireFile(name);
}

await rm(SITE, { recursive: true, force: true });
await cp(WEB_DIST, SITE, { recursive: true });

for (const name of ARTIFACTS) {
  await cp(name, join(SITE, name));
}

const images = "img";
const imageInfo = await stat(images).catch(() => null);
if (imageInfo?.isDirectory()) {
  await mkdir(join(SITE, images), { recursive: true });
  await cp(images, join(SITE, images), { recursive: true });
}

await writeFile(join(SITE, ".nojekyll"), "", "utf8");
await writeFile(
  join(SITE, "publication.json"),
  JSON.stringify(
    {
      commit: process.env.GITHUB_SHA ?? "",
      source: "index.typ",
      artifacts: {
        pdf: "ODBORNA_PRACE.pdf",
        markdown: "README.md",
      },
    },
    null,
    2,
  ) + "\n",
  "utf8",
);

console.log("ok: assembled Pages site with PDF and Markdown publication artifacts");
