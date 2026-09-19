import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");

async function sourceFiles(directory: string): Promise<string[]> {
	const absolute = resolve(root, directory);
	const files: string[] = [];
	for (const entry of await readdir(absolute, { withFileTypes: true })) {
		const relative = `${directory}/${entry.name}`;
		if (entry.isDirectory()) files.push(...(await sourceFiles(relative)));
		else if (/\.(?:ts|py|ya?ml)$/u.test(entry.name)) files.push(relative);
	}
	return files;
}

describe("hard .df transition", () => {
	test("active production sources contain no legacy manifest/config aliases or .df directories", async () => {
		const files = [
			...(await sourceFiles("harness/src")),
			...(await sourceFiles(".github/scripts")),
			...(await sourceFiles(".github/workflows")),
			"scripts/build-docs.ts",
			"harness/assets/graph.darkfactory.json",
		];
		const forbidden = [
			".darkfactory/manifest.json",
			".github/darkfactory.json",
			".darkfactory/df/config.json",
			".df/",
			"python_action.json",
		];
		for (const relative of files) {
			const source = await readFile(resolve(root, relative), "utf8");
			for (const alias of forbidden)
				expect(source.includes(alias), `${relative} still contains forbidden alias ${alias}`).toBe(false);
		}
	});

	test("df-owned runtime state names cannot regress to JSON/JSONL or non-df lock/temp aliases", async () => {
		const contracts: Record<string, string[]> = {
			"harness/src/credentials.ts": ["credentials.json", "vault.key", ".lock\`", ".tmp\`"],
			"harness/src/limits/ledger.ts": ["quota.df", "source: \"migration\"", ".lock\`", ".tmp\`"],
			"harness/src/limits/quota-engine.ts": [".lock\`", ".tmp\`"],
			"harness/src/models/catalog.ts": ["\${provider}.json", ".tmp\`"],
			"harness/src/secrets/vault-store.ts": [".secrets.lock", ".tmp\`"],
			"harness/src/graph/run-state.ts": ["\${subject}.json", ".tmp-", ".json\`"],
			"harness/src/graph/executor.ts": ["state.json", "events.jsonl", "result.json", ".tmp\`"],
			".github/scripts/agent_runner.py": ["credentials.json", "config.json", ".antigravity_checkpoint.json"],
		};
		for (const [relative, aliases] of Object.entries(contracts)) {
			const source = await readFile(resolve(root, relative), "utf8");
			for (const alias of aliases)
				expect(source.includes(alias), `${relative} still contains df-owned legacy name ${alias}`).toBe(false);
		}
	});

	test("canonical repository configuration exists in one location only", async () => {
		const candidates = [
			".darkfactory/repo.df",
			"repo.df",
			".darkfactory/config.df",
			"config.df",
		];
		const present: string[] = [];
		for (const relative of candidates) {
			try {
				await readFile(resolve(root, relative), "utf8");
				present.push(relative);
			} catch {}
		}
		expect(present).toEqual([".darkfactory/repo.df", ".darkfactory/config.df"]);
	});
});
