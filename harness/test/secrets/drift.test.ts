import { describe, test, expect } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { detectDrift } from "../../src/secrets/drift.ts";
import type { PushMap, VaultMeta } from "@darkfactory/keychain";
import { json, scripted } from "../github/helpers.ts";

describe("drift detection", () => {
	test("compares vault meta vs GitHub secrets: match, vault-only, github-only, stale", async () => {
		const meta: VaultMeta = {
			version: 1,
			entries: [
				{ name: "A", scope: "actions", created: { by: "h", at: "2026-01-01T00:00:00Z" }, updated: { by: "h", at: "2026-01-02T00:00:00Z" } },
				{ name: "B", scope: "actions", created: { by: "h", at: "2026-01-01T00:00:00Z" }, updated: { by: "h", at: "2026-01-02T00:00:00Z" } },
				{ name: "C", scope: "actions", created: { by: "h", at: "2026-01-01T00:00:00Z" }, updated: { by: "h", at: "2026-01-02T00:00:00Z" } },
			],
		};
		const pushMap: PushMap = {
			A: { repos: ["owner/repo"], ghName: "A" },
			B: { repos: ["owner/repo"], ghName: "B" },
			C: { repos: ["owner/repo"], ghName: "C" },
		};
		// GitHub has A and B, missing C, plus extra D not in pushMap
		const mock = scripted([
			json({ secrets: [{ name: "A", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }, { name: "B", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }, { name: "D", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }] }),
		]);
		const client = new GitHubClient({ token: "t", fetch: mock.fetch });
		const report = await detectDrift(client, "owner/repo", meta, pushMap);
		expect(report.healthy).toBe(false);
		const byGh = new Map(report.entries.map((e) => [e.ghName, e.status]));
		expect(byGh.get("A")).toBe("match");
		expect(byGh.get("B")).toBe("match");
		expect(byGh.get("C")).toBe("vault-only");
		expect(byGh.get("D")).toBe("github-only");
	});

	test("healthy when all mapped secrets match", async () => {
		const meta: VaultMeta = {
			version: 1,
			entries: [{ name: "X", scope: "actions", created: { by: "h", at: "2026-01-01T00:00:00Z" }, updated: { by: "h", at: "2026-01-01T00:00:00Z" } }],
		};
		const pushMap: PushMap = { X: { repos: ["owner/repo"], ghName: "X" } };
		const mock = scripted([json({ secrets: [{ name: "X", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" }] })]);
		const client = new GitHubClient({ token: "t", fetch: mock.fetch });
		const report = await detectDrift(client, "owner/repo", meta, pushMap);
		expect(report.healthy).toBe(true);
	});
});
