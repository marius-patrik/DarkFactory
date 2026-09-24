import { describe, expect, test } from "bun:test";
import type { CapabilityPackageContext } from "@darkfactory/capability";
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
		scripts: ["test", "lint", "format:check"],
		apiEntryPoints: ["src/index.ts"],
		...overrides,
	};
}

function action(kind: string, ecosystem: string) {
	return capability.actions?.find((entry) => entry.kind === kind && entry.ecosystems?.includes(ecosystem));
}

describe("code capability", () => {
	test("declares the code domain and detector", () => {
		expect(capability.id).toBe("code");
		expect(capability.domains).toEqual(["code"]);
		expect(capability.detectors?.map((entry) => entry.id)).toEqual(["code-domain"]);
	});

	test("derives Node commands from the detected package manager and declared scripts", () => {
		const testAction = action("test", "node");
		expect(typeof testAction?.command).toBe("function");
		expect((testAction?.command as (value: CapabilityPackageContext) => string | undefined)(pkg())).toBe("bun run test");
		expect((testAction?.command as (value: CapabilityPackageContext) => string | undefined)(
			pkg({ packageManager: "npm" }),
		)).toBe("npm run test");
		expect((testAction?.command as (value: CapabilityPackageContext) => string | undefined)(
			pkg({ scripts: [] }),
		)).toBeUndefined();
	});

	test("publishes TypeScript docs metadata only when API entry points exist", () => {
		const docs = action("docs_check", "node");
		expect(typeof docs?.metadata).toBe("function");
		const metadata = docs?.metadata as (value: CapabilityPackageContext) => Readonly<Record<string, unknown>> | undefined;
		expect(metadata(pkg())).toEqual({ extractor: "typedoc", entryPoints: ["src/index.ts"], strict: true });
		expect(metadata(pkg({ apiEntryPoints: [] }))).toBeUndefined();
	});

	test("declares deterministic quality actions for supported code ecosystems", () => {
		for (const ecosystem of ["node", "python", "rust", "go", "deno"]) {
			expect(capability.actions?.some((entry) => entry.kind === "test" && entry.ecosystems?.includes(ecosystem))).toBe(true);
		}
	});
});
