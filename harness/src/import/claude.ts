import { accountId, type FileCredentialStore } from "../credentials.ts";
import { CLAUDE_CREDENTIALS_SERVICE_PREFIX, decodeKeychainPayload, type ClaudeKeyring } from "./keyring.ts";
import type { HomeReader } from "./reader.ts";
import { epochMsFromMilliseconds, parseJson, record, stringField } from "./shared.ts";

export const ANTHROPIC_TOKEN_ENDPOINT = "https://console.anthropic.com/v1/oauth/token";

export interface ImportedClaudeLogin {
	accessToken: string;
	refreshToken?: string;
	refreshTokenExpiresAt?: number;
	subscriptionType?: string;
	scopes: string[];
	expiresAt?: number;
	organizationUuid?: string;
}

export type ClaudeLoginWithSource = ImportedClaudeLogin & { source: string };

function claudeOauthEntry(document: Record<string, unknown>): ImportedClaudeLogin | null {
	const oauth = record(document.claudeAiOauth);
	const accessToken = oauth ? stringField(oauth, "accessToken") : null;
	if (!oauth || !accessToken) return null;
	const refreshToken = stringField(oauth, "refreshToken");
	return {
		accessToken,
		...(refreshToken ? { refreshToken } : {}),
		...(epochMsFromMilliseconds(oauth.refreshTokenExpiresAt) !== undefined ? { refreshTokenExpiresAt: epochMsFromMilliseconds(oauth.refreshTokenExpiresAt)! } : {}),
		...(stringField(oauth, "subscriptionType") ? { subscriptionType: stringField(oauth, "subscriptionType")! } : {}),
		scopes: Array.isArray(oauth.scopes) ? oauth.scopes.filter((entry): entry is string => typeof entry === "string") : [],
		...(epochMsFromMilliseconds(oauth.expiresAt) !== undefined ? { expiresAt: epochMsFromMilliseconds(oauth.expiresAt)! } : {}),
		...(stringField(document, "organizationUuid") ? { organizationUuid: stringField(document, "organizationUuid")! } : {}),
	};
}

export interface ClaudeFindOptions {
	home: string;
	homeReader: HomeReader;
	keyring: ClaudeKeyring;
}

/**
 * Find every Claude Code login in `~/.claude/.credentials.json` and in macOS
 * keychain items whose service starts `Claude Code-credentials`. Mirrors
 * dsh-stack `claude-credentials.ts:69-151`: the file is the whole story outside
 * macOS; the keychain carries one item per profile and every suffixed item is
 * walked because they are previous logins the owner may still want.
 */
export async function findClaudeLogins(options: ClaudeFindOptions): Promise<ClaudeLoginWithSource[]> {
	const logins: ClaudeLoginWithSource[] = [];
	const file = await options.homeReader.read(".claude/.credentials.json");
	const document = parseJson(file ?? null, "~/.claude/.credentials.json");
	if (document) {
		const login = claudeOauthEntry(document);
		if (login) logins.push({ ...login, source: ".claude/.credentials.json" });
	}
	const services = await options.keyring.listServices();
	for (const service of [...new Set(services)].sort()) {
		const raw = await options.keyring.read(service);
		if (!raw) continue;
		const document = parseJson(decodeKeychainPayload(raw), `macOS keychain service ${service}`);
		if (!document) continue;
		const login = claudeOauthEntry(document);
		if (login) logins.push({ ...login, source: `${CLAUDE_CREDENTIALS_SERVICE_PREFIX}${service.slice(CLAUDE_CREDENTIALS_SERVICE_PREFIX.length)}` });
	}
	return logins;
}

/**
 * Import the first Claude Code login into a df account. The df OAuth slot cannot
 * represent a login without a refresh token (it cannot self-heal and pi refuses
 * the credential), so such a login is rejected with a clear message instead of
 * being half-imported. Mirrors dsh-stack's `no refresh token: this login cannot
 * self-heal` finding (claude-credentials.ts:58-63).
 */
export async function importClaudeAccount(
	store: FileCredentialStore,
	label: string,
	options: ClaudeFindOptions,
	provider: string,
): Promise<void> {
	const logins = await findClaudeLogins(options);
	if (logins.length === 0) throw new Error("No Claude Code login was found in ~/.claude/.credentials.json or the macOS keychain");
	const login = logins[0]!;
	if (!login.refreshToken) throw new Error("Claude Code login has no refresh token; it cannot self-heal and cannot be imported as an OAuth account");
	if (!login.expiresAt || !Number.isFinite(login.expiresAt)) throw new Error("Claude Code login has no valid access token expiry");
	const accessToken = login.accessToken;
	const refreshToken = login.refreshToken;
	const expiresAt = login.expiresAt;
	const id = accountId(provider, label);
	await store.modifyAccount(id, async (current) => ({
		id,
		provider,
		label,
		metadata: {
			...(current?.metadata ?? {}),
			ownership: "df-owned", sync: "machine-only",
			importedFrom: "claude",
			...(login.organizationUuid ? { account: login.organizationUuid } : {}),
			...(login.subscriptionType ? { plan: login.subscriptionType } : {}),
			source: login.source,
		},
		slots: {
			...(current?.slots ?? {}),
			oauth: { type: "oauth", access: accessToken, refresh: refreshToken, expires: expiresAt },
		},
	}));
}
