/** Opaque browser sessions and fail-closed GitHub App broker authority. No access tokens in this module. */
import { clearSession, completeAuthCallback, initiateAuth, persistSession, projectAuthority, restoreSessionWithRefresh } from "../../auth/src/index.ts";
import { parseBrowserSession, type BrowserSession } from "../../auth/src/types.ts";
import type { OperatorReadSource } from "./operator-data.ts";

export interface EffectiveAuthority { canRead: boolean; canMutate: boolean; isAdmin: boolean; userId: string }
export interface BrokerAuthority {
	userPermissions: { admin: boolean; push: boolean; pull: boolean };
	appAuthority: { installed: boolean; repositorySelected: boolean; canRead: boolean; canWrite: boolean; canAdminister?: boolean };
	userId: string;
}
export interface OperatorBroker {
	complete(code: string, codeVerifier: string): Promise<BrowserSession>;
	refresh(sessionId: string): Promise<BrowserSession>;
	revoke(sessionId: string): Promise<void>;
	authority(sessionId: string, repository: string): Promise<BrokerAuthority>;
	read?(sessionId: string, repository: string, path: string, signal?: AbortSignal): Promise<unknown>;
	comment(input: {
		sessionId: string; repository: string; issue: number; body: string;
		expectedUpdatedAt: string; idempotencyKey: string;
	}): Promise<{ id: number }>;
}
export interface BrowserLoginConfig { clientId: string; scope: string; redirectUri: string; brokerUrl: string }
export type AuthState =
	| { status: "signed-out" | "checking"; detail?: string }
	| { status: "authenticated"; session: BrowserSession; authority: EffectiveAuthority }
	| { status: "denied"; detail: string };
function object(value: unknown): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid broker response");
	return value as Record<string, unknown>;
}
/** The server, not the UI, must validate identity, installation, issue version, and idempotency. */
export function createHttpOperatorBroker(config: BrowserLoginConfig, fetcher: typeof fetch = fetch): OperatorBroker {
	const base = new URL(config.brokerUrl);
	if (base.protocol !== "https:" || base.username || base.password || base.search || base.hash)
		throw new Error("Confidential broker must be a clean HTTPS origin/path");
	async function post(path: string, payload: unknown): Promise<unknown> {
		const response = await fetcher(new URL(path, base).toString(), {
			method: "POST", credentials: "omit", redirect: "error",
			headers: { "Content-Type": "application/json", Accept: "application/json" },
			body: JSON.stringify(payload),
		});
		if (!response.ok) throw new Error(`Confidential broker rejected request (HTTP ${response.status})`);
		return response.json() as Promise<unknown>;
	}
	return {
		complete: async (code, codeVerifier) => parseBrowserSession(await post("oauth/exchange", { code, codeVerifier, redirectUri: config.redirectUri })),
		refresh: async sessionId => parseBrowserSession(await post("session/refresh", { sessionId })),
		revoke: async sessionId => { await post("session/revoke", { sessionId }); },
		authority: async (sessionId, repository) => {
			const input = object(await post("authority", { sessionId, repository }));
			const user = object(input.userPermissions);
			const app = object(input.appAuthority);
			if (typeof input.userId !== "string" || !input.userId) throw new Error("Missing broker identity");
			return {
				userId: input.userId,
				userPermissions: { admin: user.admin === true, push: user.push === true, pull: user.pull === true },
				appAuthority: {
					installed: app.installed === true, repositorySelected: app.repositorySelected === true,
					canRead: app.canRead === true, canWrite: app.canWrite === true,
					canAdminister: app.canAdminister === true,
				},
			};
		},
		comment: async payload => {
			const result = object(await post("issues/comment", payload));
			if (!Number.isSafeInteger(result.id) || (result.id as number) < 1) throw new Error("Invalid broker mutation receipt");
			return { id: result.id as number };
		},
		// Intentionally no private reader until an authoritative broker read endpoint exists.
	};
}
export async function beginOperatorLogin(config: BrowserLoginConfig): Promise<void> {
	const url = await initiateAuth(config.clientId, config.redirectUri, config.scope);
	window.location.assign(url);
}
export async function finishOperatorLogin(broker: OperatorBroker, query: string): Promise<BrowserSession> {
	const { code, codeVerifier } = completeAuthCallback(query);
	const session = parseBrowserSession(await broker.complete(code, codeVerifier));
	if (session.expiresAt <= Date.now()) throw new Error("Broker issued an expired session");
	persistSession(session);
	return session;
}
export async function operatorSession(broker: OperatorBroker): Promise<BrowserSession | null> {
	return restoreSessionWithRefresh(id => broker.refresh(id));
}
export async function resolveAuthority(
	broker: OperatorBroker, session: BrowserSession, repository: string,
): Promise<EffectiveAuthority> {
	const raw = await broker.authority(session.id, repository);
	if (raw.userId !== session.userId && session.userId) throw new Error("Authenticated identity mismatch");
	return projectAuthority(raw.userPermissions, raw.appAuthority, raw.userId);
}
export async function logoutOperator(broker: OperatorBroker, session: BrowserSession): Promise<void> {
	// Never keep an authenticated browser state after explicit logout, even if revocation fails.
	try { await broker.revoke(session.id); } finally { clearSession(); }
}
/** A mutation is successful only when its exact GitHub receipt is independently observed. */
export async function postVerifiedIssueComment(input: {
	broker: OperatorBroker; source: OperatorReadSource; authority: EffectiveAuthority;
	sessionId: string; repository: string; issue: number; body: string;
	expectedUpdatedAt: string; idempotencyKey: string;
}): Promise<number> {
	if (!input.authority.canMutate || !input.authority.canRead || !input.sessionId)
		throw new Error("Mutation denied: effective repository authority is missing");
	if (!Number.isSafeInteger(input.issue) || input.issue < 1 ||
		!input.body.trim() || !input.expectedUpdatedAt || !input.idempotencyKey)
		throw new Error("Mutation denied: incomplete verified intent");
	const receipt = await input.broker.comment({
		sessionId: input.sessionId, repository: input.repository, issue: input.issue, body: input.body,
		expectedUpdatedAt: input.expectedUpdatedAt, idempotencyKey: input.idempotencyKey,
	});
	if (!Number.isSafeInteger(receipt.id) || receipt.id < 1) throw new Error("Broker returned an invalid receipt");
	const comments = await input.source.issueComments(input.issue);
	if (!comments.items.some(item => item.id === receipt.id && item.body === input.body))
		throw new Error("Mutation not verified by independent GitHub readback");
	return receipt.id;
}
