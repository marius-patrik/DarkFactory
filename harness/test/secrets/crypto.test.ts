import { describe, expect, test } from "bun:test";
import { decryptVault, encryptVault, generateVaultKey, isValidVaultKey, type Vault } from "@darkfactory/keychain";

describe("Secrets Crypto", () => {
	test("generates valid 32-byte base64 vault key", () => {
		const key = generateVaultKey();
		expect(isValidVaultKey(key)).toBe(true);
	});

	test("encrypts and decrypts vault payload", () => {
		const key = generateVaultKey();
		const vault: Vault = {
			version: 1,
			entries: [
				{
					name: "GEMINI_API_KEY",
					value: "secret-key-12345",
					scope: "actions",
					targets: ["owner/repo"],
					created: { by: "host1", at: new Date().toISOString() },
					updated: { by: "host1", at: new Date().toISOString() },
				},
			],
		};

		const envelope = encryptVault(vault, key);
		expect(envelope.version).toBe(1);
		expect(envelope.algorithm).toBe("aes-256-gcm");
		expect(typeof envelope.iv).toBe("string");
		expect(typeof envelope.tag).toBe("string");
		expect(typeof envelope.ciphertext).toBe("string");

		const decrypted = decryptVault(envelope, key);
		expect(decrypted).toEqual(vault);
	});

	test("fails decryption with incorrect key", () => {
		const key1 = generateVaultKey();
		const key2 = generateVaultKey();
		const vault: Vault = {
			version: 1,
			entries: [
				{
					name: "TEST_SECRET",
					value: "test-val",
					scope: "env",
					created: { by: "host1", at: new Date().toISOString() },
					updated: { by: "host1", at: new Date().toISOString() },
				},
			],
		};

		const envelope = encryptVault(vault, key1);
		expect(() => decryptVault(envelope, key2)).toThrow();
	});
});
