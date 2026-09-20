import { describe, expect, test } from "bun:test";
import type { OperatorQuotaSnapshot } from "@darkfactory/protocol/quota";
import { quotaDashboardModels } from "../src/quota.tsx";

function snapshot(): OperatorQuotaSnapshot {
	return {
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
								until: 1_800_000,
								items: [
									{
										provider: "example",
										account: "primary",
										model: "model-a",
										type: "rate",
										dimension: "requests",
										remaining: 0,
										limit: 100,
										resetAt: 1_800_000,
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
}

describe("quota dashboard mapping", () => {
	test("preserves availability, remaining quota and reset timing", () => {
		expect(quotaDashboardModels(snapshot())).toEqual([
			{
				providerId: "example",
				providerName: "Example",
				providerState: "waiting",
				credentials: "configured",
				account: "primary",
				model: "model-a",
				state: "waiting",
				until: 1_800_000,
				limits: [
					{
						type: "rate",
						dimension: "requests",
						state: "waiting",
						remaining: 0,
						limit: 100,
						resetAt: 1_800_000,
					},
				],
			},
		]);
	});

	test("keeps unknown values explicit instead of fabricating amounts", () => {
		const value = snapshot();
		const model = value.providers[0]!.accounts[0]!.models[0]!;
		const unknown: OperatorQuotaSnapshot = {
			...value,
			providers: [
				{
					...value.providers[0]!,
					state: "unknown",
					accounts: [
						{
							...value.providers[0]!.accounts[0]!,
							models: [{ ...model, state: "unknown", until: undefined, items: [] }],
						},
					],
				},
			],
		};
		expect(quotaDashboardModels(unknown)[0]).toEqual({
			providerId: "example",
			providerName: "Example",
			providerState: "unknown",
			credentials: "configured",
			account: "primary",
			model: "model-a",
			state: "unknown",
			limits: [],
		});
	});

	test("allow-list projection cannot leak unexpected runtime secret fields", () => {
		const value = snapshot() as OperatorQuotaSnapshot & { token: string };
		value.token = "must-not-render";
		(value.providers[0] as unknown as Record<string, unknown>).apiKey = "also-must-not-render";
		const renderedData = JSON.stringify(quotaDashboardModels(value));
		expect(renderedData).not.toContain("must-not-render");
		expect(renderedData).not.toContain("apiKey");
		expect(renderedData).not.toContain("token");
	});
});
