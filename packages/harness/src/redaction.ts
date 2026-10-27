const SECRET_KEY_VALUE =
	/(\b(?:token|secret|password|api[-_ ]?key|authorization)\b\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/giu;
const BEARER_VALUE = /\bbearer\s+[A-Za-z0-9._~+/=-]+/giu;

/** Redacts the same secret-key and bearer shapes used by JSON tool-event output. */
export function redactErrorMessage(value: unknown): string {
	const message = value instanceof Error ? value.message : String(value);
	return message.replace(BEARER_VALUE, "[REDACTED]").replace(SECRET_KEY_VALUE, "$1[REDACTED]");
}
