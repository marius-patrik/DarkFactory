import type { AccountRecord, CredentialSlot, FileCredentialStore } from "./credentials.ts";

/** Metadata-only description of a credential value found in text. */
export interface CredentialLeakFinding {
	/** Account whose credential matched. */
	accountId: string;
	/** Credential slot that matched. */
	slot: string;
	/** Secret-bearing field within the slot. */
	field: "access" | "refresh" | "value";
	/** Number of exact occurrences found. */
	occurrences: number;
}

interface SecretDescriptor extends CredentialLeakFinding {
	secret: string;
}

function slotSecrets(account: AccountRecord, slotName: string, slot: CredentialSlot): SecretDescriptor[] {
	const base = { accountId: account.id, slot: slotName, occurrences: 0 };
	if (slot.type === "oauth") {
		return [
			{ ...base, field: "access", secret: slot.access },
			{ ...base, field: "refresh", secret: slot.refresh },
		];
	}
	return [{ ...base, field: "value", secret: slot.value }];
}

function countOccurrences(text: string, value: string): number {
	if (!value) return 0;
	let count = 0;
	let offset = 0;
	while (true) {
		const index = text.indexOf(value, offset);
		if (index < 0) return count;
		count += 1;
		offset = index + value.length;
	}
}

/**
 * Credential-aware redaction and leak scanning without exposing matched values.
 *
 * Secret descriptors remain internal to this class. Public scan results contain
 * only account/slot/field metadata and occurrence counts.
 */
export class CredentialRedactor {
	constructor(private readonly store: FileCredentialStore) {}

	private async descriptors(): Promise<SecretDescriptor[]> {
		const descriptors: SecretDescriptor[] = [];
		for (const summary of await this.store.listAccounts()) {
			const account = await this.store.readAccount(summary.id);
			if (!account) continue;
			for (const [slotName, slot] of Object.entries(account.slots)) {
				for (const descriptor of slotSecrets(account, slotName, slot)) {
					if (descriptor.secret.length >= 4) descriptors.push(descriptor);
				}
			}
		}
		return descriptors;
	}

	/** Find exact persisted credential values in text without returning the values. */
	async scan(text: string): Promise<CredentialLeakFinding[]> {
		const findings: CredentialLeakFinding[] = [];
		for (const descriptor of await this.descriptors()) {
			const occurrences = countOccurrences(text, descriptor.secret);
			if (occurrences === 0) continue;
			findings.push({
				accountId: descriptor.accountId,
				slot: descriptor.slot,
				field: descriptor.field,
				occurrences,
			});
		}
		return findings.sort(
			(a, b) =>
				a.accountId.localeCompare(b.accountId) || a.slot.localeCompare(b.slot) || a.field.localeCompare(b.field),
		);
	}

	/** Replace every exact persisted credential value with a fixed marker. */
	async redact(text: string, marker = "[REDACTED]"): Promise<string> {
		let output = text;
		const secrets = [...new Set((await this.descriptors()).map((descriptor) => descriptor.secret))].sort(
			(a, b) => b.length - a.length,
		);
		for (const secret of secrets) output = output.split(secret).join(marker);
		return output;
	}
}
