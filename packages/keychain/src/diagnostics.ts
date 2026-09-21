import type { AccountAuthMetadata, AccountRecord, FileCredentialStore, OAuthCredentialSlot } from "./credentials.ts";

/** Redacted machine credential health status. */
export type CredentialHealth = "valid" | "expiring" | "expired" | "rotation_due" | "non_oauth";

/** Secret-free credential diagnostic for one account. */
export interface CredentialDiagnostic {
	accountId: string;
	provider: string;
	label: string;
	ownership?: string;
	source?: string;
	importer?: string;
	slotTypes: Array<{ name: string; type: string }>;
	health: CredentialHealth;
	accessExpiresAt?: number;
	refreshExpiresAt?: number;
	rotationDue?: string;
	scopes: string[];
	audience?: string;
}

function primaryOAuth(account: AccountRecord): OAuthCredentialSlot | undefined {
	for (const slot of Object.values(account.slots)) if (slot.type === "oauth") return slot;
	return undefined;
}

function health(oauth: OAuthCredentialSlot | undefined, auth: AccountAuthMetadata | undefined, now: number): CredentialHealth {
	if (auth?.rotationDue && Date.parse(auth.rotationDue) <= now) return "rotation_due";
	if (!oauth) return "non_oauth";
	if (oauth.expires <= now) return "expired";
	if (oauth.expires <= now + 5 * 60_000) return "expiring";
	return "valid";
}

/**
 * Builds redacted credential diagnostics without exposing access keys, refresh
 * tokens, headers, cookies, or other secret-bearing values.
 */
export async function credentialDiagnostics(
	store: FileCredentialStore,
	options: { now?: number } = {},
): Promise<CredentialDiagnostic[]> {
	const now = options.now ?? Date.now();
	const diagnostics: CredentialDiagnostic[] = [];
	for (const summary of await store.listAccounts()) {
		const account = await store.readAccount(summary.id);
		if (!account) continue;
		const oauth = primaryOAuth(account);
		diagnostics.push({
			accountId: account.id,
			provider: account.provider,
			label: account.label,
			...(account.metadata?.ownership ? { ownership: account.metadata.ownership } : {}),
			...(account.metadata?.source ? { source: account.metadata.source } : {}),
			...(account.metadata?.importer ? { importer: account.metadata.importer } : {}),
			slotTypes: Object.entries(account.slots)
				.map(([name, slot]) => ({ name, type: slot.type }))
				.sort((a, b) => a.name.localeCompare(b.name)),
			health: health(oauth, account.auth, now),
			...(oauth ? { accessExpiresAt: oauth.expires } : {}),
			...(account.auth?.refreshExpiresAt !== undefined ? { refreshExpiresAt: account.auth.refreshExpiresAt } : {}),
			...(account.auth?.rotationDue ? { rotationDue: account.auth.rotationDue } : {}),
			scopes: [...(account.auth?.scopes ?? [])].sort(),
			...(account.auth?.audience ? { audience: account.auth.audience } : {}),
		});
	}
	return diagnostics.sort((a, b) => a.accountId.localeCompare(b.accountId));
}
