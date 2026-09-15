import { accountId, type FileCredentialStore } from "../credentials.ts";
import type { HomeReader } from "./reader.ts";
import { epochMsFromMilliseconds, epochMsFromSeconds, parseJson, stringField } from "./shared.ts";

/**
 * Import a Kimi Code account credential into the DF credential store.
 *
 * Reads a Kimi Code credentials file at `path` using `homeReader`, validates the
 * required OAuth fields and stores them under the generated account ID.
 *
 * @param store - The credential store to modify.
 * @param label - Human‑readable label for the imported account.
 * @param homeReader - Reader for home‑relative files; used to fetch the JSON
 *   credential file.
 * @param provider - Provider identifier (e.g. "kimi").
 * @param path - Relative path within the home directory where the Kimi file lives.
 * @throws When the file cannot be read, is missing required fields, or the token
 *   expiry is invalid.
 * @returns A promise that resolves when the account has been imported.
 */
export async function importKimiAccount(store: FileCredentialStore, label: string, homeReader: HomeReader, provider: string, path: string): Promise<void> {
	const document = parseJson(await homeReader.read(path) ?? null, `~/${path}`);
	if (!document) throw new Error(`No Kimi Code login was found in ~/${path}`);
	const access = stringField(document, "access_token");
	const refresh = stringField(document, "refresh_token");
	const rawExpiry = document.expires_at;
	const expires = typeof rawExpiry === "number" && rawExpiry < 100_000_000_000
		? epochMsFromSeconds(rawExpiry)
		: epochMsFromMilliseconds(rawExpiry);
	if (!access || !refresh) throw new Error("Kimi Code login has incomplete OAuth token fields");
	if (!expires) throw new Error("Kimi Code login has no valid access token expiry");
	const id = accountId(provider, label);
	await store.modifyAccount(id, async (current) => ({
		id, provider, label,
		metadata: { ...(current?.metadata ?? {}), ownership: "df-owned", sync: "machine-only", importedFrom: "kimi", source: "kimi-code-credentials" },
		slots: { ...(current?.slots ?? {}), oauth: { type: "oauth", access, refresh, expires } },
	}));
}
