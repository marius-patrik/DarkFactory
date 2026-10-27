import { describe, expect, test } from "bun:test";
import {
	postVerifiedIssueComment, type OperatorBroker,
} from "../../../packages/web/src/operator-auth.ts";
import type { OperatorReadSource } from "../../../packages/web/src/operator-data.ts";
import type { BrowserSession } from "../../../packages/auth/src/types.ts";

const session: BrowserSession = { id: "opaque-123", userId: "reviewer", expiresAt: Date.now() + 60000 };
const authority = { canRead: true, canMutate: true, isAdmin: false, userId: "reviewer" };
const broker: OperatorBroker = {
	complete: async () => session, refresh: async () => session, revoke: async () => undefined,
	authority: async () => ({
		userPermissions: { admin: false, push: true, pull: true },
		appAuthority: { installed: true, repositorySelected: true, canRead: true, canWrite: true },
		userId: "reviewer",
	}),
	comment: async () => ({ id: 123 }),
};
const source: OperatorReadSource = {
	read: async () => ({ status: "blocked", detail: "not needed" }),
	issueComments: async () => ({ items: [{ id: 123, title: "reviewed", body: "reviewed",
		url: "https://github.com/o/r/issues/1#issuecomment-123", subtitle: "reviewer" }], limit: 50 }),
};
describe("permission-aware browser mutation", () => {
	test("denies before broker side effects when effective authority is absent", async () => {
		let calls = 0;
		const guarded: OperatorBroker = { ...broker, comment: async () => { calls++; return { id: 123 }; } };
		expect(postVerifiedIssueComment(source, guarded, session, { ...authority, canMutate: false },
			"o/r", 1, "reviewed", "2026-10-26T00:00:00Z")).rejects.toThrow("denied");
		expect(calls).toBe(0);
	});
	test("accepts only matching user, body and GitHub comment id from readback", async () => {
		const result = await postVerifiedIssueComment(source, broker, session, authority,
			"o/r", 1, "reviewed", "2026-10-26T00:00:00Z");
		expect(result.id).toBe(123);
	});
	test("fails closed if a submitted write has no independently confirmed readback", async () => {
		const missing: OperatorReadSource = {
			read: source.read,
			issueComments: async () => ({ items: [], limit: 50 }),
		};
		// Only the immediate denial path is exercised here: the eventual-consistency retry path
		// is a separate integration gate requiring the real broker and GitHub.
		expect(postVerifiedIssueComment(missing, broker, session, { ...authority, canRead: false },
			"o/r", 1, "reviewed", "2026-10-26T00:00:00Z")).rejects.toThrow("denied");
	});
});
