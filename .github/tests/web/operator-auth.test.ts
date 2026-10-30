import { describe, expect, test } from "bun:test";
import { createHttpOperatorBroker, postVerifiedIssueComment, type OperatorBroker } from "../../../packages/web/src/operator-auth.ts";
import type { OperatorReadSource } from "../../../packages/web/src/operator-data.ts";
import type { BrowserSession } from "../../../packages/auth/src/types.ts";

const session: BrowserSession = { id: "opaque-123", userId: "reviewer", expiresAt: Date.now() + 60_000 };
const authority = { canRead: true, canMutate: true, isAdmin: false, userId: "reviewer" };
const broker: OperatorBroker = {
	complete: async () => session,
	refresh: async () => session,
	revoke: async () => undefined,
	authority: async () => ({
		userPermissions: { admin: false, push: true, pull: true },
		appAuthority: { installed: true, repositorySelected: true, canRead: true, canWrite: true },
		userId: "reviewer",
	}),
	comment: async () => ({ id: 123 }),
};
const source: OperatorReadSource = {
	read: async () => ({ status: "blocked", detail: "not needed" }),
	issueComments: async () => ({
		items: [{ id: 123, title: "reviewed", body: "reviewed",
			url: "https://github.com/o/r/issues/1#issuecomment-123" }],
		limit: 50,
	}),
};
const valid = { broker, source, authority, sessionId: session.id, repository: "o/r",
	issue: 1, body: "reviewed", expectedUpdatedAt: "2026-10-30T00:00:00Z", idempotencyKey: "request-123" };

describe("permission-aware browser mutation", () => {
	test("rejects before side effects without both effective authorities", async () => {
		let calls = 0;
		const guarded: OperatorBroker = { ...broker, comment: async () => { calls++; return { id: 123 }; } };
		await expect(postVerifiedIssueComment({ ...valid, broker: guarded,
			authority: { ...authority, canMutate: false } })).rejects.toThrow("denied");
		await expect(postVerifiedIssueComment({ ...valid, broker: guarded,
			authority: { ...authority, canRead: false } })).rejects.toThrow("denied");
		expect(calls).toBe(0);
	});
	test("requires receipt and independently observed matching GitHub comment", async () => {
		expect(await postVerifiedIssueComment(valid)).toBe(123);
		await expect(postVerifiedIssueComment({ ...valid, source: {
			...source, issueComments: async () => ({ items: [], limit: 50 }),
		} })).rejects.toThrow("not verified");
		await expect(postVerifiedIssueComment({ ...valid, broker: {
			...broker, comment: async () => ({ id: 0 }),
		} })).rejects.toThrow("invalid receipt");
	});
	test("rejects unsafe broker transport and secret-like response fields", () => {
		expect(() => createHttpOperatorBroker({
			clientId: "public", scope: "", redirectUri: "https://example.test/",
			brokerUrl: "http://example.test",
		})).toThrow();
	});
});
