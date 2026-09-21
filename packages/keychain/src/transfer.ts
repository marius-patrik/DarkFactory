import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { type AccountRecord, validateAccountRecord } from "./credentials.ts";
import { isValidVaultKey } from "./vault-crypto.ts";

const ALGORITHM = "aes-256-gcm";

/** Encrypted authenticated credential-account transfer envelope. */
export interface EncryptedCredentialExport {
	version: 1;
	algorithm: typeof ALGORITHM;
	iv: string;
	tag: string;
	ciphertext: string;
}

/**
 * Export one credential account in an authenticated encrypted envelope.
 *
 * The serialized envelope never contains credential values in plaintext.
 */
export function exportCredentialAccount(account: AccountRecord, keyBase64: string): EncryptedCredentialExport {
	if (!isValidVaultKey(keyBase64)) throw new Error("Invalid credential export key format");
	const key = Buffer.from(keyBase64, "base64");
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALGORITHM, key, iv);
	const ciphertext = Buffer.concat([cipher.update(JSON.stringify(account), "utf8"), cipher.final()]);
	return {
		version: 1,
		algorithm: ALGORITHM,
		iv: iv.toString("base64"),
		tag: cipher.getAuthTag().toString("base64"),
		ciphertext: ciphertext.toString("base64"),
	};
}

/**
 * Decrypt and validate an encrypted credential-account transfer.
 *
 * @param envelope - Authenticated encrypted account bundle.
 * @param keyBase64 - 32-byte base64 key.
 * @param expectedId - Optional destination account id used to validate/remap the label.
 */
export function importCredentialAccount(
	envelope: EncryptedCredentialExport,
	keyBase64: string,
	expectedId?: string,
): AccountRecord {
	if (!isValidVaultKey(keyBase64)) throw new Error("Invalid credential export key format");
	if (!envelope || envelope.version !== 1 || envelope.algorithm !== ALGORITHM) {
		throw new Error("Unsupported or invalid credential export envelope");
	}
	try {
		const decipher = createDecipheriv(ALGORITHM, Buffer.from(keyBase64, "base64"), Buffer.from(envelope.iv, "base64"));
		decipher.setAuthTag(Buffer.from(envelope.tag, "base64"));
		const plaintext = Buffer.concat([
			decipher.update(Buffer.from(envelope.ciphertext, "base64")),
			decipher.final(),
		]).toString("utf8");
		return validateAccountRecord(JSON.parse(plaintext) as unknown, expectedId);
	} catch (error) {
		if (error instanceof Error && /Account record|Invalid account|credential slot|metadata|does not match/iu.test(error.message)) {
			throw error;
		}
		throw new Error("Failed to decrypt credential export: bad key or corrupted ciphertext");
	}
}
