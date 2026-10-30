/** Opaque-session operator authentication. The confidential broker owns all token exchange and mutation authority. */
import {
	clearSession,
	completeAuthCallback,
	initiateAuth,
	persistSession,
	projectAuthority,
	restoreSessionWithRefresh,
} from "../../auth/src/index.ts";
import type { BrowserSession } from "../../auth/src/types.ts";
import type { OperatorReadSource } from "./operator-data.ts";

export interface EffectiveAuthority {
	canRead: boolean;
	canMutate: boolean;
	isAdmin: boolean;
	userId: string;
}
export interface BrokerAuthority {
	userPermissions: { admin: boolean; push: boolean; pull: boolean };
	appAuthority: {
		installed: boolean;
		repositorySelected: boolean;
		canRead: boolean;
		canWrite: boolean;
		canAdminister?: boolean;
	};
	userId: string;
}
export interface OperatorBroker {
	/** Returns opaque session only, never GitHub OAuth tokens. */
	complete(code: string, codeVerifier: string): Promise<BrowserSession>;
	refresh(sessionId: string): Promise<BrowserSession>;
	revoke(sessionId: string): Promise<void>;
	authority(sessionId: string, repository: string): Promise<BrokerAuthority>;
	/** Server must check current user, issue version, App scope, gate rules and idempotency. */
	read?(sessionId: string, repository: string, path: string, signal?: AbortSignal): Promise<unknown>;
	comment(input: {
		sessionId: string;
		repository: string;
		issue: number;
		body: string;
		expectedUpdatedAt: string;
		idempotencyKey: string;
	}): Promise<{ id: number }¶»§q«^