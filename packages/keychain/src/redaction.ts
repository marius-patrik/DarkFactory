/**
 * Secret redaction utilities for machine credentials, error messages, and diagnostics.
 * @packageDocumentation
 */

const SECRET_KEY_VALUE = /(\b(?:token|secret|password|api[-_ ]?key|authorization)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/giu;
const BEARER_VALUE = /\bbearer\s+[A-Za-z0-9._~+/=-]+/giu;
const SECRET_KEY_PATTERN = /^(?:.*_)?(?:key|token|secret|password|auth|authorization|credential|cert|private)(?:_.*)?$/iu;

/**
 * Checks whether an object key name resembles a secret or sensitive credential.
 *
 * @param key - The property name or key to check.
 * @returns True if the key implies secret custody.
 */
export function isSecretKey(key: string): boolean {
	return SECRET_KEY_PATTERN.test(key);
}

/**
 * Redacts secret-key and bearer token patterns from an error message or string representation.
 *
 * @param value - The raw error or string value to redact.
 * @returns Sanitized string with sensitive patterns replaced by `[REDACTED]`.
 */
export function redactErrorMessage(value: unknown): string {
	const message = value instanceof Error ? value.message : String(value);
	return message.replace(BEARER_VALUE, "[REDACTED]").replace(SECRET_KEY_VALUE, "$1[REDACTED]");
}

/**
 * Recursively redacts sensitive values from an arbitrary object or array.
 * Keys that match sensitive patterns or values that look like tokens are replaced by `"[REDACTED]"`.
 *
 * @param value - Arbitrary payload to sanitize.
 * @returns Deeply cloned value with secrets redacted.
 */
export function redactSecrets(value: unknown): unknown {
	if (value === null || value === undefined) return value;
	if (typeof value === "string") {
		return redactErrorMessage(value);
	}
	if (Array.isArray(value)) {
		return value.map((item) => redactSecrets(item));
	}
	if (typeof value === "object") {
		const result: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
			if (isSecretKey(k)) {
				result[k] = "[REDACTED]";
			} else {
				result[k] = redactSecrets(v);
			}
		}
		return result;
	}
	return value;
}
