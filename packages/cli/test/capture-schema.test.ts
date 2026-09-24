import { describe, expect, test } from "bun:test";
import { formatCaptureSchema } from "../src/capture-schema.ts";

describe("capture schema CLI projection", () => {
	test("renders registered schemas from the canonical protocol registry", () => {
		const all = JSON.parse(formatCaptureSchema("all")) as unknown;
		expect(all).toBeDefined();
		expect(formatCaptureSchema()).toBe(formatCaptureSchema("all"));
	});

	test("fails closed for an unknown schema name", () => {
		expect(() => formatCaptureSchema("definitely-missing")).toThrow("Unknown capture schema");
	});
});
