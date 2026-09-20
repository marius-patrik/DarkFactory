import { expect, mock, test, afterEach } from "bun:test";

mock.module("node:fs/promises", () => ({
	access: async () => {},
	constants: { X_OK: 1 },
	readFile: async () => "{}",
	readdir: async () => [],
}));

afterEach(() => {
	mock.restore();
});

import { capability as detection } from "../../capabilities/detection/capability";
import { capability as quality } from "../../capabilities/quality/capability";

test("detection capability has correct id", () => {
	expect(detection.id).toBe("detection");
});

test("quality capability has correct id", () => {
	expect(quality.id).toBe("quality");
});

test("quality tool resolves action for root package", async () => {
	const tool = quality.tools?.find((candidate) => candidate.name === "run_quality_checks");
	if (!tool) throw new Error("quality capability does not expose run_quality_checks");

	const result = await tool.execute(
		{ action: "test", package: "root" },
		{
			repositoryRoot: ".",
			domains: [],
			credentials: { get: async () => undefined },
		},
	);
	expect(result).toMatchObject({ tool: "npm", args: ["test"] });
});
