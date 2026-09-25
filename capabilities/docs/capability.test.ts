import { describe, expect, test } from "bun:test";
import type { CapabilityActionDefinition, CapabilityPackageContext } from "@darkfactory/capability";
import { capability } from "./capability.ts";

function pkg(overrides: Partial<CapabilityPackageContext> = {}): CapabilityPackageContext {
	return {
		id: "fixture",
		path: ".",
		name: "fixture",
		ecosystem: "node",
		packageManager: "bun",
		packageManagerRoot: ".",
		manifest: "package.json",
		domains: ["code"],
		scripts: [],
		apiEntryPoints: ["src/index.ts"],
		...overrides,
	};
}

function action(kind: string, ecosystem: string): CapabilityActionDefinition | undefined {
	return (capability.actions as readonly CapabilityActionDefinition[] | undefined)?.find(
		(entry) => entry.kind === kind && entry.ecosystems?.includes(ecosystem),
	);
}

describe("docs capability", () => {
	test("publishes TypeScript docs metadata only when API entry points exist", () => {
		const docs = action("docs_check", "node");
		expect(typeof docs?.metadata).toBe("function");
		const metadata = docs?.metadata as (value: CapabilityPackageContext) => Readonly<Record<string, unknown>> | undefined;
		expect(metadata(pkg())).toEqual({ extractor: "typedoc", entryPoints: ["src/index.ts"], strict: true });
		expect(metadata(pkg({ apiEntryPoints: [] }))).toBeUndefined();
	});

	test("owns documentation actions for supported ecosystems", () => {
		for (const ecosystem of ["node", "rust", "go", "deno"]) {
			expect(action("docs_check", ecosystem)).toBeDefined();
		}
		expect(action("docs_extract", "node")).toBeDefined();
		expect(action("docs_extract", "rust")).toBeDefined();
		expect(action("docs_extract", "go")).toBeDefined();
	});
});
