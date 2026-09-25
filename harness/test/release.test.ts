import { describe, expect, test, mock } from "bun:test";
import { resolve } from "node:path";
import { recordVersion } from "./record.ts";
import { resolveRelease } from "./resolve.ts";
import { loadConfig, bumpVersion } from "./versioning.ts";
import { checkMetadata } from "./metadata.ts";
import { configure } from "./environment.ts";

describe("release modules", () => {
	test("versioning logic", () => {
		expect(bumpVersion("1.0.0", "patch")).toBe("1.0.1");
		expect(bumpVersion("1.0.0", "minor")).toBe("1.1.0");
		expect(bumpVersion("1.0.0", "major")).toBe("2.0.0");
	});

	test("environment detection", () => {
		const env = configure(".");
		expect(env.packages).toBeDefined();
	});

    // We can add more specific unit tests here as needed
});
