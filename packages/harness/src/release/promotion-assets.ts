import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import {
 assertArtifactBytes, assertTechnicalCandidate, fileDigest, requireCondition,
 type PromotionEvidence, type TechnicalCandidate,
} from "./promotion-evidence.ts";
import { assertPromotionEvidence } from "./promotion-evidence.ts";

export function scanCandidateAssets(roots: readonly string[]): { name: string; bytes: Uint8Array }[] {
 const files: { name: string; bytes: Uint8Array }[] = [];
 for (const root of roots) {
  requireCondition(existsSync(root), "missing candidate artifact directory " + root);
  const walk = (dir: string): void => {
   for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const mode = statSync(path);
    requireCondition(mode.isFile() || mode.isDirectory(), "unexpected candidate file type");
    if (mode.isDirectory()) walk(path);
    else if (name.endsWith(".sha256")) {
     // Build receipts are not published; only the five exact expected sidecars may be present.
     requireCondition(/^df-(darwin-(arm64|x64)|linux-(arm64|x64)|win32-x64)(\.exe)?\.sha256$/u.test(name),
      "unexpected digest sidecar " + name);
    } else files.push({ name: basename(path), bytes: readFileSync(path) });
   }
  };
  walk(root);
 }
 return files;
}
export function assertRemoteDraft(
 a: TechnicalCandidate, b: PromotionEvidence, release: any, remoteAssets: any[], expectedDraft = true,
): void {
 requireCondition(release?.draft === expectedDraft && release.tag_name === "v" + a.version &&
  release.target_commitish === b.source.final_sha, "remote draft identity/target mismatch");
 requireCondition(Array.isArray(remoteAssets) && remoteAssets.length === a.artifacts.length,
  "partial or additional remote release asset inventory");
 const expected = new Map(a.artifacts.map((asset) => [asset.name, asset.sha256]));
 const seen = new Set<string>();
 for (const asset of remoteAssets) {
  requireCondition(typeof asset.name === "string" && !seen.has(asset.name), "duplicate remote asset");
  seen.add(asset.name);
  requireCondition(expected.has(asset.name), "unreviewed remote asset");
  requireCondition(asset.state === "uploaded" && Number.isSafeInteger(asset.id) && asset.id > 0 &&
   typeof asset.size === "number" && asset.size > 0 &&
   asset.digest === "sha256:" + expected.get(asset.name),
   "remote release asset checksum/upload mismatch: " + asset.name);
 }
}

if (import.meta.main) {
 const [file, hash, ...args] = process.argv.slice(2);
 try {
  requireCondition(typeof file === "string" && typeof hash === "string" && fileDigest(file) === hash,
   "missing/altered technical candidate SHA-256");
  const a = assertTechnicalCandidate(JSON.parse(readFileSync(file, "utf8")));
  if (args.some((arg) => arg.startsWith("--remote="))) {
   requireCondition((args.length === 3 || (args.length === 4 && args[3] === "--published")) && args[0]?.startsWith("--remote=") &&
    args[1]?.startsWith("--assets=") && args[2]?.startsWith("--sealed="),
    "remote check requires draft, asset list and postmerge seal");
   const b = assertPromotionEvidence(JSON.parse(readFileSync(args[2]!.slice(9), "utf8")), a, hash);
   assertRemoteDraft(a, b,
    JSON.parse(readFileSync(args[0]!.slice(9), "utf8")),
    JSON.parse(readFileSync(args[1]!.slice(9), "utf8")), args[3] !== "--published");
  } else {
   requireCondition(args.length >= 1 && args.length <= 2, "expected candidate asset directory/directories");
   assertArtifactBytes(a, scanCandidateAssets(args));
  }
  console.log("Immutable candidate artifact inventory verified.");
 } catch (error) {
  console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1;
 }
}
