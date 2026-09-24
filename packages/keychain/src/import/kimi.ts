import { accountId, type FileCredentialStore } from "../credentials.ts";
import type { HomeReader } from "./reader.ts";
import { epochMsFromMilliseconds, epochMsFromSeconds, parseJson, stringField } from "./shared.ts";

export async function importKimiAccount(store: FileCredentialStore, label: string, homeReader: HomeReader, provider: string, path: string): Promise<void> {
	const document = parseJson(await homeReader.read(path) ?? null, `~/${path}`);
	if (!document) throw new Error(`No Kimi Code login was found in ~/${path}`);
	const access = stringField(document, "access_token");
	const refresh = stringField(document, "refresh_token");
	const rawExpiry = document.expires_at;
	const scopes = typeof document.scope === "string" ? document.scope.split(/\s+/).filter(Boolean) : [];
	const expires = typeof rawExpiry === "number" && rawExpiry < 100_000_000_000
		? epochMsFromSeconds(rawExpiry)
		: epochMsFromMilliseconds(rawExpiry);
	if (!access || !refresh) throw new Error("Kimi Code login has incomplete OAuth token fields");
	if (!expires) throw new Error("Kimi Code login has no valid access token expiry");
	const id = accountId(provider, label);
	await store.modifyAccount(id, async (current) => ({
		id, provider, label,
		auth: { ...(current?.auth ?? {}), scopes },
		metadata: { ...(current?.metadata ?? {}), ownership: "df-owned", sync: "machine-only", importedFrom: "kimi", source: "kimi-code-credentials" },
		slots: { ...(current?.slots ?? {}), oauth: { type: "oauth", access, refresh, expires } },
	}));
}
