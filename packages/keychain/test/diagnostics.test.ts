import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { credentialDiagnostics, FileCredentialStore } from "../src/index.ts";

const roots: string[] = [];
async function tempHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-diagnostics-"));
	roots.push(path);
	return path;
}
afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("credentialDiagnostics", () => {
	test("reports typed auth metadata and health without secrets", async () => {
		const store = new FileCredentialStore(await tempHome());
		await store.modifyAccount("fixture:work", async () => ({
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			metadata: { ownership: "borrowed", importer: "fixture-cli", source: "fixture-auth" },
			auth: {
				scopes: ["repo:write", "repo:read"],
				audience: "https://api.example.test",
				refreshExpiresAt: 2_000_000,
				rotationDue: "2030-01-01T00:00:00.000Z",
			},
			slots: {
				oauth: {
					type: "oauth",
					access: "ACCESS-SECRET-VALUE",
					refresh: "REFRESH-SECRET-VALUE",
					expires: 1_300_000,
				},
				header: { type: "header", value: "HEADER-SECRET-VALUE" },
			},
		}));

		const result = await credentialDiagnostics(store, { now: 1_000_000 });
		expect(result).toEqual([
			{
				accountId: "fixture:work",
				provider: "fixture",
				label: "work",
				ownership: "borrowed",
				importer: "fixture-cli",
				source: "fixture-auth",
				slotTypes: [
					{ name: "header", type: "header" },
					{ name: "oauth", type: "oauth" },
				],
				health: "expiring",
				accessExpiresAt: 1_300_000,
				refreshExpiresAt: 2_000_000,
				rotationDue: "2030-01-01T00:00:00.000Z",
				scopes: ["repo:read", "repo:write"],
				audience: "https://api.example.test",
			},
		]);
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain("ACCESS-SECRET-VALUE");
		expect(serialized).not.toContain("REFRESH-SECRET-VALUE");
		expect(serialized).not.toContain("HEADER-SECRET-VALUE");
	});
});
