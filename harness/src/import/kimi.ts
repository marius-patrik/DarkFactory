import { accountId, type FileCredentialStore } from "../credentials.ts";
import type { HomeReader } from "./reader.ts";
import { epochMsFromMilliseconds, epochMsFromSeconds, parseJson, stringField } from "./shared.ts";

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
		metadata: { ...(current?.metadata ?? {}), ownership: "borrowed", sync: "machine-only", source: "kimi-code-credentials", source_path: path },
		slots: { ...(current?.slots ?? {}), oauth: { type: "oauth", access, refresh, expires } },
	}));
}
