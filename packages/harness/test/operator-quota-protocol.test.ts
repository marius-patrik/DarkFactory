import { describe, expect, test } from "bun:test";
import type { QuotaReport } from "../src/limits/quota-report.ts";
import { operatorQuotaSnapshot } from "../src/limits/quota-report.ts";

describe("browser-safe operator quota protocol", () => {
	test("preserves quota state while excluding provider configuration and secrets", () => {
		const report: QuotaReport = {
			version: 2,
			generatedAt: "2026-09-20T20:00:00.000Z",
			providers: [
				{
					id: "example",
					name: "Example",
					dialect: "openai-responses",
					baseUrl: "https://secret-config.example/v1",
					enabled: true,
					credentials: "configured",
					state: "waiting",
					declared: [
						{
							type: "daily",
							limit: 100,
							windowMs: 86_400_000,
						},
					],
					data: { collection: "unknown" },
					accounts: [
						{
							label: "primary",
							models: [
								{
									provider: "example",
									account: "primary",
									model: "model-a",
									state: "waiting",
									until: 1_800,
									items: [
										{
											provider: "example",
											account: "primary",
											model: "model-a",
											type: "rate",
											dimension: "requests",
											limit: 100,
											used: 100,
											remaining: 0,
											resetAt: 1_800,
											state: "waiting",
											source: "header",
											enforced: true,
											origin: "learned",
										},
									],
								},
							],
						},
					],
				},
			],
		};

		const snapshot = operatorQuotaSnapshot(report);
		expect(snapshot).toEqual({
			version: 1,
			generatedAt: "2026-09-20T20:00:00.000Z",
			providers: [
				{
					id: "example",
					name: "Example",
					enabled: true,
					credentials: "configured",
					state: "waiting",
					accounts: [
						{
							label: "primary",
							models: [
								{
									provider: "example",
									account: "primary",
									model: "model-a",
									state: "waiting",
									until: 1_800,
									items: [
										{
											provider: "example",
											account: "primary",
											model: "model-a",
											type: "rate",
											dimension: "requests",
											limit: 100,
											used: 100,
											remaining: 0,
											resetAt: 1_800,
											state: "waiting",
											source: "header",
											enforced: true,
											origin: "learned",
										},
									],
								},
							],
						},
					],
				},
			],
		});
		expect(JSON.stringify(snapshot)).not.toContain("secret-config.example");
		expect(JSON.stringify(snapshot)).not.toContain("dialect");
		expect(JSON.stringify(snapshot)).not.toContain("declared");
		expect(JSON.stringify(snapshot)).not.toContain("data");
	});
});
