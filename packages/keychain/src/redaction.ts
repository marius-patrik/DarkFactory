/**
 * Utility to redact sensitive credential values from text (such as log outputs or error messages).
 */
export class CredentialRedactor {
	private readonly secrets = new Set<string>();

	/**
	 * Registers a list of sensitive strings that should be redacted.
	 * Empty strings or short strings (less than 4 characters) are ignored to avoid over-redaction.
	 * 
	 * @param values Secret values to register.
	 */
	register(values: (string | undefined | null)[]): void {
		for (const val of values) {
			if (val && val.length >= 4) {
				this.secrets.add(val);
			}
		}
	}

	/**
	 * Redacts registered secret values from the given input string, replacing them with "[REDACTED]".
	 * 
	 * @param input The raw input text.
	 * @returns The redacted text.
	 */
	redact(input: string): string {
		if (this.secrets.size === 0) {
			return input;
		}
		let result = input;
		for (const secret of this.secrets) {
			// Escape special regex characters in the secret
			const escaped = secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = new RegExp(escaped, "g");
			result = result.replace(regex, "[REDACTED]");
		}
		return result;
	}

	/**
	 * Scans the input text for any of the registered secrets and returns true if any are found.
	 * 
	 * @param input The text to scan.
	 * @returns True if at least one registered secret is found in the input.
	 */
	scan(input: string): boolean {
		for (const secret of this.secrets) {
			if (input.includes(secret)) {
				return true;
			}
		}
		return false;
	}
}
