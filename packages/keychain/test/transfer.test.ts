import { describe, expect, test } from "bun:test";
import {
	exportCredentialAccount,
	generateVaultKey,
	importCredentialAccount,
	type AccountRecord,
} from "../src/index.ts";

describe("encrypted credential transfer", () => {
	test("round-trips a complete account without plaintext secrets in the envelope", () => {
		const account: AccountRecord = {
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			metadata: { ownership: "df-owned" },
			auth: { scopes: ["repo:read"], audience: "api" },
			slots: {
				oauth: {
					type: "oauth",
					access: "access-transfer-secret",
					refresh: "refresh-transfer-secret",
					expires: 2_000_000_000_000,
				},
			},
		};
		const key = generateVaultKey();
		const envelope = exportCredentialAccount(account, key);
		const serialized = JSON.stringify(envelope);
		expect(serialized).not.toContain("access-transfer-secret");
		expect(serialized).not.toContain("refresh-transfer-secret");
		expect(importCredentialAccount(envelope, key)).toEqual(account);
	});

	test("supports an explicit same-provider destination account id", () => {
		const account: AccountRecord = {
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			slots: { api_key: { type: "api_key", value: "key-secret" } },
		};
		const key = generateVaultKey();
		const imported = importCredentialAccount(exportCredentialAccount(account, key), key, "fixture:pipeline");
		expect(imported.id).toBe("fixture:pipeline");
		expect(imported.provider).toBe("fixture");
		expect(imported.label).toBe("pipeline");
		expect(imported.slots.api_key).toEqual({ type: "api_key", value: "key-secret" });
	});

	test("fails closed for a wrong key or cross-provider target", () => {
		const account: AccountRecord = {
			id: "fixture:work",
			provider: "fixture",
			label: "work",
			slots: { api_key: { type: "api_key", value: "key-secret" } },
		};
		const key = generateVaultKey();
		const envelope = exportCredentialAccount(account, key);
		expect(() => importCredentialAccount(envelope, generateVaultKey())).toThrow("Failed to decrypt credential export");
		expect(() => importCredentialAccount(envelope, key, "other:pipeline")).toThrow("does not match");
	});
});
