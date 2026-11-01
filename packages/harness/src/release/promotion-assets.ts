import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";
import { assertArtifactBytes, assertPromotionEvidence } from "./promotion-evidence.ts";

function scan(root: string): { name: string; bytes: Uint8Array }[] {
	const files: { name: string; bytes: Uint8Array }[] = [];
	function walk(folder: string): void {
		for (const name of readdirSync(folder)) {
			const path = join(folder, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (!name.endsWith(".sha256")) files.push({ name: basename(path), bytes: readFileSync(path) });
		}
	}
	walk(root);
	return files;
}

const [path, hash, ...roots] = process.argv.slice(2);
try {
	if (!path || !hash || !/^[a-f0-9]{64}$/u.test(hash)) throw new Error("Missing immutable evidence identity");
	const bytes = readFileSync(path);
	if (createHash("sha256").update(bytes).digest("hex") !== hash) throw new Error("Evidence digest mismatch");
	const evidence = assertPromotionEvidence(JSON.parse(bytes.toString("utf8")), "publish");
	if (roots.length === 1 && roots[0]?.startsWith("--remote=")) {
		const release = JSON.parse(readFileSync(roots[0].slice("--remote=".length), "utf8"));
		if (
			release.draft !== true ||
			release.tag_name !== "v" + evidence.version ||
			release.target_commitish !== evidence.source.final_sha
		) {
			throw new Error("Remote draft identity/version/target mismatch");
		}
		const recorded = new Map(evidence.artifacts.map((item) => [item.name, item.sha256]));
		if (release.assets?.length !== recorded.size) throw new Error("Partial or divergent draft asset inventory");
		for (const item of release.assets) {
			if (recorded.get(item.name) !== item.digest?.replace(/^sha256:/u, "")) {
				throw new Error("Remote release asset checksum mismatch: " + item.name);
			}
		}
	} else {
		if (roots.length < 1 || roots.length > 2) throw new Error("Expected built asset directory/directories");
		const files = roots.flatMap((root) =>
			existsSync(root)
				? scan(root)
				: root === "release-assets"
					? []
					: (() => {
							throw new Error("Missing mandatory asset directory: " + root);
						})(),
		);
		assertArtifactBytes(evidence, files);
	}
	console.log("Candidate-bound artifact inventory verified.");
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exitCode = 1;
}
