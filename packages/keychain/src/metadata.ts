/**
 * Metadata definitions and extraction helpers for credential accounts and secret lifecycle.
 * @packageDocumentation
 */
import type { AccountRecord } from "./credentials.ts";

/**
 * Standard metadata keys and conventions for DarkFactory managed accounts.
 */
export interface AccountMetadata {
	/** Machine custody ownership: "df-owned" or "borrowed". */
	ownership?: "df-owned" | "borrowed";
	/** Source importer identifier if imported from external CLI. */
	importedFrom?: string;
	/** Display source origin (e.g. filename or keychain service). */
	source?: string;
	/** Internal source entry key. */
	source_entry?: string;
	/** Kind of source ("file" | "keyring"). */
	source_kind?: "file" | "keyring";
	/** Path to external source file. */
	source_path?: string;
	/** Subscription plan or tier (e.g. "pro", "max", "free"). */
	plan?: string;
	/** User or organization identifier (e.g. email or org id). */
	account?: string;
	/** OAuth scopes granted to this account. */
	scopes?: string[];
	/** Intended token audience or issuer. */
	audience?: string;
	/** ISO timestamp when rotation is required. */
	rotationDue?: string;
	/** Access token expiry timestamp in milliseconds. */
	expiresAt?: number;
	/** Synchronization mode ("machine-only" vs "shared"). */
	sync?: "machine-only" | "shared";
	/** Method used to establish account ("oauth" | "api_key"). */
	login?: "oauth" | "api_key";
}

/**
 * Extracts normalized scope list from an account's metadata.
 *
 * @param account - The account record.
 * @returns Array of scope strings.
 */
export function getAccountScopes(account: AccountRecord): string[] {
	const raw = account.metadata?.scopes;
	if (!raw) return [];
	if (Array.isArray(raw)) return raw;
	if (typeof raw === "string") {
		try {
			const parsed = JSON.parse(raw) as unknown;
			if (Array.isArray(parsed)) return parsed.map(String);
		} catch {
			return raw.split(/[,\s]+/).filter(Boolean);
		}
	}
	return [];
}

/**
 * Extracts intended audience or issuer from an account's metadata.
 *
 * @param account - The account record.
 * @returns Audience or issuer string if present.
 */
export function getAccountAudience(account: AccountRecord): string | undefined {
	return account.metadata?.audience ?? account.metadata?.issuer;
}

/**
 * Extracts expiry timestamp in milliseconds from an account's primary OAuth slot or metadata.
 *
 * @param account - The account record.
 * @returns Expiry timestamp in epoch milliseconds, or undefined.
 */
export function getAccountExpiry(account: AccountRecord): number | undefined {
	const oauthSlot = Object.values(account.slots).find((slot) => slot.type === "oauth");
	if (oauthSlot && oauthSlot.type === "oauth" && typeof oauthSlot.expires === "number") {
		return oauthSlot.expires;
	}
	const metaExpiry = account.metadata?.expiresAt;
	if (typeof metaExpiry === "number") return metaExpiry;
	if (typeof metaExpiry === "string") {
		const parsed = Date.parse(metaExpiry);
		if (Number.isFinite(parsed)) return parsed;
	}
	return undefined;
}

/**
 * Extracts rotation due date for an account or returns undefined.
 *
 * @param account - The account record.
 * @returns ISO date string or undefined.
 */
export function getAccountRotationDue(account: AccountRecord): string | undefined {
	return account.metadata?.rotationDue;
}
