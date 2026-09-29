import { describe, expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dir, "../../..");
const packageRoot = resolve(root, "packages");
const required = ["protocol", "core", "capability", "github", "keychain", "auth", "docs", "cli", "web"] as const;
const expectedNames = new Set(required.map((name) => `@darkfactory/${name}`));

/**
 * First-party packages under `packages/` that are not part of the publishable set. #1227 relocated
 * the `df` runtime here as a unit, so it is asserted separately: it is a workspace with its own
 * manifest, but `private`, so it must not be read as a published boundary, and the publishable
 * manifest-graph tests below deliberately do not cover it.
 */
const privatePackages = ["harness"] as const;

/**
 * First-party packages that are private without being the runtime, so they carry no `df`
 * entrypoint. `plugins` is the agent plugin registry the `df plugin` command is built on.
 */
const privateLibraries = ["plugins"] as const;

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
		// ADR-0028: the Paper is a first-party domain, so `paper` is part of the final set.
		// #1227 relocated the `df` runtime under `packages/`, so `harness` is no longer a
		// separately-listed workspace: `packages/*` already covers it.
		expect(rootPackage.workspaces).toEqual(["packages/*", ".darkfactory/plugins/*", "paper"]);

		const directories = (await readdir(packageRoot, { withFileTypes: true }))
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort();
		expect(directories).toEqual([...required, ...privatePackages, ...privateLibraries].sort());

		for (const name of required) {
			const pkg = await manifest(name);
			expect(pkg.name).toBe(`@darkfactory/${name}`);
			expect(pkg.private).not.toBe(true);
			expect(pkg.type).toBe("module");
			expect((pkg.exports as Record<string, string>)["."]).toBe("./src/index.ts");
		}

		for (const name of privateLibraries) {
			const pkg = await manifest(name);
			expect(pkg.name).toBe(`@darkfactory/${name}`);
			expect(pkg.private).toBe(true);
			expect(pkg.type).toBe("module");
			expect(pkg.bin).toBeUndefined();
		}

		// The relocated runtime keeps its own identity and its `df` entrypoint, so the bin every
		// consumer resolves still exists after the move.
		for (const name of privatePackages) {
			const pkg = await manifest(name);
			expect(pkg.name).toBe(`@darkfactory/${name}`);
			expect(pkg.private).toBe(true);
			expect(pkg.type).toBe("module");
			expect((pkg.bin as Record<string, string>).df).toBe("src/cli.ts");
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

	test("no final package forwards into the deletion-bound harness tree except the recorded ledger", async () => {
		// ADR-0017 requires package dependencies to be acyclic, and DF-RULE-017 forbids a final
		// package forwarding implementation to the legacy tree. The manifest graph cannot see this
		// class of violation: `harness` is a workspace, not a declared dependency of any package, so
		// a relative import across the boundary is invisible to a manifest-only cycle check.
		//
		// The previous version of this test asserted that an allowlist of four files *must* forward
		// into harness, and commented them as "explicit migration adapters" — it certified the
		// violation as policy, and one of its four entries (`keychain/src/index.ts`) had been stale
		// for some time, referencing a file that no longer reached the harness at all.
		//
		// What is here now is a migration ledger, not an allowlist. Two of the three real edges were
		// unused forwards and are gone: `packages/core/src/index.ts` (its only consumer imported
		// symbols that `packages/protocol` and `packages/core/result-capture` already owned) and
		// `packages/github/src/node.ts` (zero consumers, and neither `auth` nor `web` imports the
		// package). The remaining edge is `cli`.
		//
		// #1227 relocated the runtime to `packages/harness/`, and this edge did not disappear with
		// it, so the entry's reason had to be corrected rather than deleted. Moving the `df`
		// entrypoint into `packages/cli` is not available: the runtime declares and imports
		// `@darkfactory/cli` (`packages/harness/src/cli.ts` takes `formatCaptureSchema` from
		// `@darkfactory/cli/capture-schema`), so a `cli` -> harness import would close a cycle
		// between the two packages, which is the acyclicity ADR-0017 requires. The edge is
		// therefore a genuine violation with a genuinely open owner, not a relocation leftover.
		//
		// The property that makes this safe is that the ledger is a literal, so it is exact in both
		// directions: a new package-to-harness edge fails, and an entry whose edge has been removed
		// also fails until the entry is deleted.
		const ledger = new Map<string, string>([
			[
				"cli/src/index.ts",
				"the df entrypoint is implemented in @darkfactory/harness; it cannot move into cli without a cli<->harness dependency cycle",
			],
		]);
		const found = new Map<string, string>();
		for (const name of required) {
			const src = resolve(packageRoot, name, "src");
			for (const entry of await readdir(src, { withFileTypes: true })) {
				if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
				const source = await readFile(resolve(src, entry.name), "utf8");
				if (/from\s+["'][^"']*harness\/src/u.test(source)) {
					found.set(`${name}/src/${entry.name}`, ledger.get(`${name}/src/${entry.name}`) ?? "");
				}
			}
		}
		// Every real edge is recorded, with a reason.
		expect([...found.keys()].sort()).toEqual([...ledger.keys()].sort());
		// Every recorded entry still has a real edge, and none is blank.
		for (const [file, reason] of found) {
			expect(ledger.get(file)).toBe(reason);
			expect(reason.length).toBeGreaterThan(0);
		}
	});

	test("no workspace declares a first-party dependency it never imports", async () => {
		// `auth` and `web` both declared `@darkfactory/github` while importing nothing from it, so
		// the manifest graph carried an edge the source graph did not have — noise in the cycle
		// check and a phantom coupling for anyone reading the manifests. Subpath specifiers count
		// as imports, so `@darkfactory/protocol/quota` satisfies a dependency on
		// `@darkfactory/protocol`.
		const unused: string[] = [];
		for (const name of required) {
			const pkg = await manifest(name);
			const src = resolve(packageRoot, name, "src");
			let sources = "";
			const walk = async (dir: string): Promise<void> => {
				for (const entry of await readdir(dir, { withFileTypes: true })) {
					const full = resolve(dir, entry.name);
					if (entry.isDirectory()) await walk(full);
					else if (entry.name.endsWith(".ts")) sources += await readFile(full, "utf8");
				}
			};
			await walk(src);
			for (const dependency of firstPartyDependencies(pkg)) {
				const usesSubpath = new RegExp(`["']${dependency}/[^"']+["']`, "u").test(sources);
				const usesRoot = sources.includes(`"${dependency}"`) || sources.includes(`'${dependency}'`);
				if (!usesSubpath && !usesRoot) unused.push(`${name} -> ${dependency}`);
			}
		}
		expect(unused).toEqual([]);
	});

	test("all final package root entrypoints are loadable from the workspace", async () => {
		await import("../../protocol/src/index.ts");
		await import("../../capability/src/index.ts");
		await import("../../github/src/index.ts");
		await import("../../auth/src/index.ts");
		await import("../../docs/src/index.ts");
		await import("../../web/src/index.ts");
		await import("../../core/src/index.ts");
		await import("../../keychain/src/index.ts");
		const cli = await import("../../cli/src/index.ts");
		expect(typeof cli.main).toBe("function");
	});
});
