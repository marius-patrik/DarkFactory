import { accountId, type FileCredentialStore } from "../credentials.ts";
import type { HomeReader } from "./reader.ts";
import { claimString, epochMsFromSeconds, jwtClaims, parseJson, record, stringField } from "./shared.ts";

export const OPENAI_TOKEN_ENDPOINT = "https://auth.openai.com/oauth/token";

export interface ImportedCodexOAuth {
	accessToken: string;
	refreshToken?: string;
	plan?: string;
	account?: string;
	accountId?: string;
	authMode?: string;
	lastRefresh?: string;
	expiresAt?: number;
	scopes: string[];
}

/** Parse the ChatGPT OAuth triad out of `~/.codex/auth.json` (dsh-stack `codex-auth-json.ts:44-84`). */
export function parseCodexOAuthDocument(document: Record<string, unknown>): ImportedCodexOAuth | null {
	const tokens = record(document.tokens);
	const accessToken = tokens ? stringField(tokens, "access_token") : null;
	if (!tokens || !accessToken) return null;
	const idClaims = jwtClaims(stringField(tokens, "id_token") ?? "");
	const accessClaims = jwtClaims(accessToken);
	const idAuth = record(idClaims?.["https://api.openai.com/auth"]);
	const accessAuth = record(accessClaims?.["https://api.openai.com/auth"]);
	const auth = idAuth ?? accessAuth;
	const refreshToken = stringField(tokens, "refresh_token");
	const plan = auth ? stringField(auth, "chatgpt_plan_type") : null;
	const account = claimString(idClaims, "email") ?? (tokens ? stringField(tokens, "account_id") : null);
	// pi-ai's openai-codex OAuth reads `chatgpt_account_id` from the *access* token's
	// auth claims (dist/auth/oauth/openai-codex.js:323-336); fall back to the id_token
	// claims the way dsh-stack reads the plan. Carry it so an imported login has the
	// same identity as a freshly logged-in one.
	const accountId = claimString(accessAuth, "chatgpt_account_id") ?? claimString(idAuth, "chatgpt_account_id");
	const authMode = stringField(document, "auth_mode");
	const lastRefresh = stringField(document, "last_refresh");
	const expiresAt = epochMsFromSeconds(accessClaims?.exp);
	const scopes = typeof accessClaims?.scope === "string" ? String(accessClaims.scope).split(/\s+/).filter(Boolean) : [];
	return {
		accessToken,
		...(refreshToken ? { refreshToken } : {}),
		...(plan ? { plan } : {}),
		...(account ? { account } : {}),
		// pi-ai's openai-codex OAuth derives its account slot from this exact JWT claim
		// (dist/auth/oauth/openai-codex.js:323-336); carry it so an imported login has
		// the same identity as a freshly logged-in one.
		...(accountId ? { accountId } : {}),
		...(authMode ? { authMode } : {}),
		...(lastRefresh ? { lastRefresh } : {}),
		...(expiresAt !== undefined ? { expiresAt } : {}),
		scopes,
	};
}

export interface CodexFindOptions {
	homeReader: HomeReader;
}

export interface CodexImport {
	document: Record<string, unknown> | null;
	oauth: ImportedCodexOAuth | null;
	apiKey: string | null;
}

export async function findCodexAuth(options: CodexFindOptions): Promise<CodexImport> {
	const file = await options.homeReader.read(".codex/auth.json");
	const document = parseJson(file ?? null, "~/.codex/auth.json");
	if (!document) return { document, oauth: null, apiKey: null };
	return {
		document,
		oauth: parseCodexOAuthDocument(document),
		apiKey: stringField(document, "OPENAI_API_KEY"),
	};
}

/**
 * Import the ChatGPT login from `~/.codex/auth.json`. The OAuth triad becomes an
 * `oauth` slot; a metered `OPENAI_API_KEY` (a different product, billed per token)
 * becomes an `api_key` slot. A tokens block with no refresh token is rejected the
 * same way as Claude (dsh-stack notes it as "cannot self-heal").
 */
export async function importCodexAccount(
	store: FileCredentialStore,
	label: string,
	homeReader: HomeReader,
	provider: string,
	apiKeyProvider: string | undefined,
): Promise<void> {
	const found = await findCodexAuth({ homeReader });
	if (found.oauth) {
		const oauth = found.oauth;
		if (!oauth.refreshToken)
			throw new Error(
				"Codex login has no refresh token; it cannot self-heal and cannot be imported as an OAuth account",
			);
		if (!oauth.expiresAt || !Number.isFinite(oauth.expiresAt))
			throw new Error("Codex access token JWT has no valid exp claim");
		const accessToken = oauth.accessToken;
		const refreshToken = oauth.refreshToken;
		const expiresAt = oauth.expiresAt;
		const accountIdValue = oauth.accountId;
		const id = accountId(provider, label);
		await store.modifyAccount(id, async (current) => ({
			id,
			provider,
			label,
			auth: { ...(current?.auth ?? {}), scopes: [...oauth.scopes] },
			metadata: {
				...(current?.metadata ?? {}),
				ownership: "df-owned",
				sync: "machine-only",
				importedFrom: "codex",
				...(oauth.account ? { account: oauth.account } : {}),
				...(oauth.plan ? { plan: oauth.plan } : {}),
				...(oauth.authMode ? { auth_mode: oauth.authMode } : {}),
				...(oauth.lastRefresh ? { last_refresh: oauth.lastRefresh } : {}),
				source: "codex-auth-json",
			},
			slots: {
				...(current?.slots ?? {}),
				oauth: {
					type: "oauth",
					access: accessToken,
					refresh: refreshToken,
					expires: expiresAt,
					...(accountIdValue ? { accountId: accountIdValue } : {}),
				},
			},
		}));
		return;
	}
	if (found.apiKey) {
		if (!apiKeyProvider) throw new Error("Codex API-key importer has no configured apiKeyTargetProvider");
		const id = accountId(apiKeyProvider, label);
		await store.modifyAccount(id, async (current) => ({
			id,
			provider: apiKeyProvider,
			label,
			metadata: {
				...(current?.metadata ?? {}),
				ownership: "df-owned",
				sync: "machine-only",
				importedFrom: "codex",
				source: "codex-auth-json",
				plan: "metered_api_key",
			},
			slots: { ...(current?.slots ?? {}), api_key: { type: "api_key", value: found.apiKey! } },
		}));
		return;
	}
	throw new Error("No Codex login was found in ~/.codex/auth.json");
}
