/**
 * Secret pattern scanning utilities for pre-publication checks, diff verification, and hygiene.
 * @packageDocumentation
 */

/**
 * Diagnostic finding produced by a secret pattern scan.
 */
export interface SecretScanFinding {
	/** Type or description of pattern detected. */
	rule: string;
	/** 1-indexed line number where finding was matched. */
	line: number;
	/** Redacted excerpt from surrounding line. */
	preview: string;
}

const SECRET_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
	{ rule: "bearer-token", pattern: /\bbearer\s+[A-Za-z0-9._~+/=-]{10,}/iu },
	{ rule: "key-assignment", pattern: /(?:token|secret|password|api[-_ ]?key|authorization)\s*[:=]\s*['"][^'"\s]{8,}['"]/iu },
	{ rule: "openai-live-key", pattern: /\bsk-live-[A-Za-z0-9_-]{10,}/u },
	{ rule: "openai-standard-key", pattern: /\bsk-[A-Za-z0-9_-]{20,}/u },
	{ rule: "github-pat", pattern: /\bgh[pousr]_[A-Za-z0-9_]{36,}/u },
	{ rule: "pem-private-key", pattern: /-----BEGIN (?:RSA|EC|PGP|OPENSSH|DSA) PRIVATE KEY-----/u },
];

/**
 * Checks whether content contains any high-confidence secret or private-key pattern.
 *
 * @param content - String content to inspect.
 * @returns True if high-confidence secret patterns are detected.
 */
export function scanForSecrets(content: string): boolean {
	if (!content || typeof content !== "string") return false;
	return SECRET_PATTERNS.some(({ pattern }) => pattern.test(content));
}

/**
 * Scans content and returns detailed findings with line numbers and redacted previews.
 *
 * @param content - String content to inspect.
 * @returns List of detected secret findings.
 */
export function findSecretOccurrences(content: string): SecretScanFinding[] {
	if (!content || typeof content !== "string") return [];
	const findings: SecretScanFinding[] = [];
	const lines = content.split(/\r?\n/u);

	for (let i = 0; i < lines.length; i++) {
		const lineText = lines[i]!;
		for (const { rule, pattern } of SECRET_PATTERNS) {
			if (pattern.test(lineText)) {
				const preview = lineText.trim().replace(/([:=]\s*)(?:'[^']*'|"[^"]*"|\S+)/gu, "$1[REDACTED]");
				findings.push({
					rule,
					line: i + 1,
					preview: preview.length > 80 ? `${preview.slice(0, 77)}...` : preview,
				});
			}
		}
	}

	return findings;
}
