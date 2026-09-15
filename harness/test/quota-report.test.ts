import { describe, expect, test } from "bun:test";
import { buildQuotaReport } from "../src/limits/quota-report.ts";
import { BUILTIN_PROVIDER_CONFIG, type ProviderConfig } from "../src/providers/schema.ts";

function provider(id: string, extra: Partial<ProviderConfig> = {}): ProviderConfig {
	return {
		id, name: id, dialect: "openai-completions", baseUrl: `https://${id}.example/v1`,
		auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" }], requiredCredentialSlots: ["api_key"],
		models: { static: [{ id: "m" }] }, capabilities: { tools: true, reasoning: false, images: false },
		limits: { observe: true, declared: [] }, ...extra,
	};
}

describe("buildQuotaReport data collection", () => {
	test("provider with free.data gets collection from free.data", async () => {
		const p = provider("free-data", { free: { kind: "permanent", keyUrl: "https://example.com/key", data: { collection: "logging", source: "test", sourceUrl: "https://example.com", checkedAt: "2026-09-15" } } });
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine: { status: async () => ({ state: "available", items: [] }) } as any });
		const entry = report.providers.find((e) => e.id === "free-data")!;
		expect(entry.data).toMatchObject({ collection: "logging", source: "test", sourceUrl: "https://example.com", checkedAt: "2026-09-15" });
	});

	test("provider with data only (no free) gets collection from data", async () => {
		const p = provider("data-only", { data: { collection: "training", source: "test2", sourceUrl: "https://example.org", checkedAt: "2026-09-15" } });
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine: { status: async () => ({ state: "available", items: [] }) } as any });
		const entry = report.providers.find((e) => e.id === "data-only")!;
		expect(entry.data).toMatchObject({ collection: "training", source: "test2", sourceUrl: "https://example.org", checkedAt: "2026-09-15" });
	});

	test("provider with neither free nor data gets collection unknown", async () => {
		const p = provider("no-data", {});
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine: { status: async () => ({ state: "available", items: [] }) } as any });
		const entry = report.providers.find((e) => e.id === "no-data")!;
		expect(entry.data).toMatchObject({ collection: "unknown" });
	});

	test("free.data takes precedence over data", async () => {
		const p = provider("both", { free: { kind: "permanent", keyUrl: "https://example.com/key", data: { collection: "none", source: "test fixture", checkedAt: "2026-09-15" } }, data: { collection: "training", source: "test fixture", checkedAt: "2026-09-15" } });
		const report = await buildQuotaReport({ providers: [p], accounts: [], chains: [], engine: { status: async () => ({ state: "available", items: [] }) } as any });
		const entry = report.providers.find((e) => e.id === "both")!;
		expect(entry.data?.collection).toBe("none");
	});
});
