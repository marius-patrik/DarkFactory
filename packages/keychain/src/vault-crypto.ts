import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { EncryptedVaultEnvelope, Vault } from "./vault.ts";

const ALGORITHM = "aes-256-gcm";
const KEY_BYTE_LENGTH = 32;
const IV_BYTE_LENGTH = 12;

/** Generates a new encoded vault encryption key. */
export function generateVaultKey(): string {
	return randomBytes(KEY_BYTE_LENGTH).toString("base64");
}

/** Checks whether a value is a valid encoded vault key. */
export function isValidVaultKey(keyBase64: string): boolean {
	if (!keyBase64 || typeof keyBase64 !== "string") return false;
	try {
		const buf = Buffer.from(keyBase64, "base64");
		return buf.length === KEY_BYTE_LENGTH;
	} catch {
		return false;
	}
}

/** Encrypts a vault into a versioned authenticated envelope. */
export function encryptVault(vault: Vault, keyBase64: string): EncryptedVaultEnvelope {
	if (!isValidVaultKey(keyBase64)) throw new Error("Invalid vault key format");
	const key = Buffer.from(keyBase64, "base64");
	const iv = randomBytes(IV_BYTE_LENGTH);
	const cipher = createCipheriv(ALGORITHM, key, iv);

	const plaintext = JSON.stringify(vault);
	const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();

	return {
		version: 1,
		algorithm: ALGORITHM,
		iv: iv.toString("base64"),
		tag: tag.toString("base64"),
		ciphertext: ciphertext.toString("base64"),
	};
}

/** Decrypts and validates a vault envelope. */
export function decryptVault(envelope: EncryptedVaultEnvelope, keyBase64: string): Vault {
	if (!isValidVaultKey(keyBase64)) throw new Error("Invalid vault key format");
	if (!envelope || envelope.version !== 1 || envelope.algorithm !== ALGORITHM) {
		throw new Error("Unsupported or invalid encrypted vault envelope");
	}

	const key = Buffer.from(keyBase64, "base64");
	const iv = Buffer.from(envelope.iv, "base64");
	const tag = Buffer.from(envelope.tag, "base64");
	const ciphertext = Buffer.from(envelope.ciphertext, "base64");

	const decipher = createDecipheriv(ALGORITHM, key, iv);
	decipher.setAuthTag(tag);

	try {
		const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
		const parsed = JSON.parse(decrypted.toString("utf8")) as unknown;
		if (!parsed || typeof parsed !== "object" || (parsed as { version?: unknown }).version !== 1) {
			throw new Error("Invalid decrypted vault structure");
		}
		return parsed as Vault;
	} catch (error) {
		if (error instanceof Error && error.message.includes("Invalid decrypted vault structure")) {
			throw error;
		}
		throw new Error("Failed to decrypt vault: bad key or corrupted ciphertext");
	}
}
