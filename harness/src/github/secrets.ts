const sodium: typeof import("libsodium-wrappers") = require("libsodium-wrappers");

/**
 * Encrypts a plaintext string using the recipient's public key.
 *
 * @param publicKeyBase64 - The recipient's public key encoded in base64 (original variant).
 * @param plaintext - The text to encrypt.
 * @returns A base64‑encoded ciphertext string.
 */
export async function sealSecret(publicKeyBase64: string, plaintext: string): Promise<string> {
  await sodium.ready;
  const publicKey = sodium.from_base64(publicKeyBase64, sodium.base64_variants.ORIGINAL);
  const encrypted = sodium.crypto_box_seal(sodium.from_string(plaintext), publicKey);
  return sodium.to_base64(encrypted, sodium.base64_variants.ORIGINAL);
}
