import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../..");
const packageRoot = resolve(root, "packages");
const required = ["protocol", "core", "capability", "github", "keychain", "auth", "docs", "cli", "web"] as const;
const expectedNames = new Set(required.map((name) => `@darkfactory/${name}`));

async function manifest(name: string): Promise<Record<string, unknown>> {
	return JSON.parse(await readFile(resolve(packageRoot, name, "package.json"), "utf8")) as Record<string, unknown>;
}

function firstPartyDependencies(pkg: Record<string, unknown>): string[] {
	const all = {
		...((pkg.dependencies ?? {}) as Record<string, string>),
		...((pkg.peerDependencies ?? {}) as Record<string, string>),
	};
	return Object.keys(all).filter((name) => name.startsWith("@darkfactory/"));
}

describe("publishable workspace boundaries", () => {
	test("root workspace owns the final first-party package set", async () => {
		const rootPackage = JSON.parse(await readFile(resolve(root, "package.json"), "utf8")) as {
			workspaces?: string[];
			private?: boolean;
		};
		expect(rootPackage.private).toBe(true);
		expect(rootPackage.workspaces).toEqual(["packages/*", "capabilities/*", "harness"]);

		const directories = (await readdir(packageRoot, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.filter((name) => name !== "df-release")
			.sort();
		expect(directories).toEqual([...required].sort());

		for (const name of required) {
			const pkg = await manifest(name);
			expect(pkg.name).toBe(`@darkfactory/${name}`);
			expect(pkg.private).not.toBe(true);
			expect(pkg.type).toBe("module");
			expect((pkg.exports as Record<string, string>)["."]).toBe("./src/index.ts");
		}
	});

	test("first-party package dependency graph is closed and acyclic", async () => {
		const graph = new Map<string, string[]>();
		for (const name of required) {
			const pkg = await manifest(name);
			const packageName = String(pkg.name);
			const dependencies = firstPartyDependencies(pkg);
			for (const dependency of dependencies) expect(expectedNames.has(dependency)).toBe(true);
			expect(dependencies).not.toContain(packageName);
			graph.set(packageName, dependencies);
		}

		const visiting = new Set<string>();
		const visited = new Set<string>();
		const visit = (name: string): void => {
			if (visited.has(name)) return;
			if (visiting.has(name)) throw new Error(`workspace dependency cycle at ${name}`);
			visiting.add(name);
			for (const dependency of graph.get(name) ?? []) visit(dependency);
			visiting.delete(name);
			visited.add(name);
		};
		for (const name of graph.keys()) visit(name);
		expect(visited.size).toBe(required.length);
	});

	test("browser-safe roots cannot reach machine custody or the temporary harness", async () => {
		const safeFiles = [
			"protocol/src/index.ts",
			"protocol/src/model.ts",
			"protocol/src/workflow.ts",
			"capability/src/index.ts",
			"github/src/index.ts",
			"github/src/types.ts",
			"auth/src/index.ts",
			"docs/src/index.ts",
			"web/src/index.ts",
		];
		for (const relative of safeFiles) {
			const source = await readFile(resolve(packageRoot, relative), "utf8");
			expect(source).not.toMatch(
				/(?:from\s+["'](?:node:|bun:)|import\s*\(\s*["'](?:node:|bun:)|harness\/src|@darkfactory\/keychain|@darkfactory\/core|@darkfactory\/cli)/u,
			);
		}
		const auth = await manifest("auth");
		const web = await manifest("web");
		expect(firstPartyDependencies(auth)).not.toContain("@darkfactory/keychain");
		expect(firstPartyDependencies(web)).not.toContain("@darkfactory/keychain");
	});

	test("only explicit migration adapters may still reach the monolithic harness", async () => {
		const allowed = new Set(["core/src/index.ts", "github/src/node.ts", "keychain/src/index.ts", "cli/src/index.ts"]);
		for (const name of required) {
			const src = resolve(packageRoot, name, "src");
			for (const entry of await readdir(src, { withFileTypes: true })) {
				if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
				const relative = `${name}/src/${entry.name}`;
				const source = await readFile(resolve(src, entry.name), "utf8");
				if (source.includes("harness/src")) expect(allowed.has(relative)).toBe(true);
			}
		}
	});

	test("all final package root entrypoints are loadable from the workspace", async () => {
		await import("../../packages/protocol/src/index.ts");
		await import("../../packages/capability/src/index.ts");
		await import("../../packages/github/src/index.ts");
		await import("../../packages/auth/src/index.ts");
		await import("../../packages/docs/src/index.ts");
		await import("../../packages/web/src/index.ts");
		await import("../../packages/core/src/index.ts");
		await import("../../packages/keychain/src/index.ts");
		const cli = await import("../../packages/cli/src/index.ts");
		expect(typeof cli.main).toBe("function");
	});
});
