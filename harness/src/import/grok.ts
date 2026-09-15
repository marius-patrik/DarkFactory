import { accountId, type FileCredentialStore } from "../credentials.ts";
import type { HomeReader } from "./reader.ts";
import { epochMsFromSeconds, epochMsFromText, jwtClaims, parseJson, record, stringField } from "./shared.ts";

/**
 * Represents a Grok CLI login entry parsed from `auth.json`.
 */
export interface ImportedGrokEntry {
	/** The raw key string of the entry. */
	sourceEntry: string;
	/** The issuer identifier (e.g. "Grok"). */
	issuer: string;
	/** The access token for the Grok API. */
	accessToken: string;
	/** The refresh token, if present. */
	refreshToken?: string;
	/** The email address associated with the account. */
	email?: string;
	/** The epoch timestamp (ms) when the token expires. */
	expiresAt?: number;
	/** The list of OAuth scopes granted. */
	scopes: string[];
}

/** Parse one `<issuer>::<client id>` entry (dsh-stack `grok-auth-json.ts:27-61`). */
export function parseGrokEntry(key: string, value: unknown): ImportedGrokEntry | null {
	const entry = record(value);
	const accessToken = entry ? stringField(entry, "key") : null;
	if (!entry || !accessToken) return null;
	const refreshToken = stringField(entry, "refresh_token");
	const accessClaims = jwtClaims(accessToken);
	const email = stringField(entry, "email");
	const expiresAt = epochMsFromText(entry.expires_at) ?? epochMsFromSeconds(accessClaims?.exp);
	const issuer = key.split("::")[0]?.trim();
	if (!issuer) return null;
	return {
		sourceEntry: key,
		issuer,
		accessToken,
		...(refreshToken ? { refreshToken } : {}),
		...(email ? { email } : {}),
		...(expiresAt !== undefined ? { expiresAt } : {}),
		scopes: typeof accessClaims?.scope === "string" ? String(accessClaims.scope).split(/\s+/) : [],
	};
}

/**
 * Options for locating Grok authentication files.
 */
export interface GrokFindOptions {
	/** Utility to read files from the user's home directory. */
	homeReader: HomeReader;
}

/**
 * Find all Grok CLI login entries in `~/.grok/auth.json`.
 *
 * @param options - Find options containing the home reader.
 * @returns A list of parsed Grok login entries.
 */
export async function findGrokEntries(options: GrokFindOptions): Promise<ImportedGrokEntry[]> {
	const file = await options.homeReader.read(".grok/auth.json");
	const document = parseJson(file ?? null, "~/.grok/auth.json");
	if (!document) return [];
	const entries: ImportedGrokEntry[] = [];
	for (const [key, value] of Object.entries(document)) {
		const entry = parseGrokEntry(key, value);
		if (entry) entries.push(entry);
	}
	return entries;
}

/**
 * Import the first Grok CLI login from `~/.grok/auth.json`. The df OAuth slot and
 * refresh flow need a refresh token (device login rotates it), so a login without
 * one is rejected rather than imported in a state that cannot self-heal.
 */
export async function importGrokAccount(store: FileCredentialStore, label: string, homeReader: HomeReader, provider: string): Promise<void> {
	const entries = await findGrokEntries({ homeReader });
	if (entries.length === 0) throw new Error("No Grok CLI login was found in ~/.grok/auth.json");
	const entry = entries[0]!;
	if (!entry.refreshToken) throw new Error("Grok CLI login has no refresh token; it cannot self-heal and cannot be imported as an OAuth account");
	if (!entry.expiresAt || !Number.isFinite(entry.expiresAt)) throw new Error("Grok CLI login has no valid access token expiry");
	const accessToken = entry.accessToken;
	const refreshToken = entry.refreshToken;
	const expiresAt = entry.expiresAt;
	const id = accountId(provider, label);
	await store.modifyAccount(id, async (current) => ({
		id,
		provider,
		label,
		metadata: {
			...(current?.metadata ?? {}),
			ownership: "df-owned", sync: "machine-only",
			importedFrom: "grok",
			...(entry.email ? { account: entry.email } : {}),
			issuer: entry.issuer,
			source: "grok-auth-json",
		},
		slots: {
			...(current?.slots ?? {}),
			oauth: { type: "oauth", access: accessToken, refresh: refreshToken, expires: expiresAt },
		},
	}));
}
