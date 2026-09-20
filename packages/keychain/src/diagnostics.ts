import type { FileCredentialStore, AccountRecord, CredentialSlot } from "./index.js";

/**
 * Diagnostic result status for a credential slot.
 */
export type DiagnosticStatus = "valid" | "expired" | "warning" | "error";

/**
 * Detailed diagnostic information for a credential slot.
 */
export interface SlotDiagnostic {
	slotName: string;
	type: CredentialSlot["type"];
	status: DiagnosticStatus;
	message: string;
	expiresAt?: number;
}

/**
 * Diagnostic report for a single account.
 */
export interface AccountDiagnostic {
	accountId: string;
	provider: string;
	label: string;
	slots: SlotDiagnostic[];
}

/**
 * Runs diagnostics on the credentials registered in a credential store.
 */
export class CredentialDiagnostics {
	constructor(private readonly store: FileCredentialStore) {}

	/**
	 * Scans and assesses the health of all credentials in the store.
	 * Detects expired OAuth tokens, tokens close to expiry, and generic slot information.
	 * 
	 * @param warningBufferMs Time buffer in milliseconds before actual expiration to trigger a warning (defaults to 5 minutes).
	 * @returns An array of diagnostic reports per account.
	 */
	async runDiagnostics(warningBufferMs = 300_000): Promise<AccountDiagnostic[]> {
		const accounts = await this.store.listAccounts();
		const reports: AccountDiagnostic[] = [];

		for (const accSummary of accounts) {
			const account = await this.store.readAccount(accSummary.id);
			if (!account) continue;

			const slotDiagnostics: SlotDiagnostic[] = [];
			const now = Date.now();

			for (const [name, slot] of Object.entries(account.slots)) {
				if (slot.type === "oauth") {
					const expiresAt = slot.expires;
					if (expiresAt <= now) {
						slotDiagnostics.push({
							slotName: name,
							type: "oauth",
							status: "expired",
							message: "OAuth token has expired and requires refresh or re-authentication.",
							expiresAt,
						});
					} else if (expiresAt - warningBufferMs <= now) {
						slotDiagnostics.push({
							slotName: name,
							type: "oauth",
							status: "warning",
							message: "OAuth token is close to expiration.",
							expiresAt,
						});
					} else {
						slotDiagnostics.push({
							slotName: name,
							type: "oauth",
							status: "valid",
							message: "OAuth token is valid.",
							expiresAt,
						});
					}
				} else if (slot.type === "api_key") {
					const isVaultReference = slot.value.startsWith("vault:");
					slotDiagnostics.push({
						slotName: name,
						type: "api_key",
						status: "valid",
						message: isVaultReference
							? "API Key is stored securely as a vault reference."
							: "API Key is stored locally.",
					});
				} else {
					slotDiagnostics.push({
						slotName: name,
						type: slot.type,
						status: "valid",
						message: "Credential slot is configured.",
					});
				}
			}

			reports.push({
				accountId: account.id,
				provider: account.provider,
				label: account.label,
				slots: slotDiagnostics,
			});
		}

		return reports;
	}

	/**
	 * Attempts to refresh an expired OAuth slot for a given account.
	 * 
	 * @param accountId The target account ID.
	 * @param slotName The target slot name.
	 * @param refreshFn Call-specific refresh token handler/endpoint client function.
	 * @returns The updated AccountRecord if successful.
	 */
	async refreshOAuthToken(
		accountId: string,
		slotName: string,
		refreshFn: (refreshToken: string) => Promise<{ access: string; refresh: string; expires: number }>,
	): Promise<AccountRecord> {
		return await this.store.modifyAccount(accountId, async (current) => {
			if (!current) throw new Error(`Account not found: ${accountId}`);
			const slot = current.slots[slotName];
			if (!slot || slot.type !== "oauth") {
				throw new Error(`Slot ${slotName} does not exist or is not an OAuth slot`);
			}

			const refreshed = await refreshFn(slot.refresh);
			current.slots[slotName] = {
				type: "oauth",
				access: refreshed.access,
				refresh: refreshed.refresh,
				expires: refreshed.expires,
				accountId: slot.accountId,
			};
			return current;
		}) as AccountRecord;
	}
}
