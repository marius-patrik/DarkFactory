import { describe, expect, test } from "bun:test";
import { postVerifiedIssueComment, type OperatorBroker } from "../../../packages/web/src/operator-auth.ts";
import type { OperatorReadSource } from "../../../packages/web/src/operator-data.ts";
import type { BrowserSession } from "../../../packages/auth/src/types.ts";

const session: BrowserSession = { id: "opaque-123", userId: "reviewer", expiresAt: Date.now() + 60000 };
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
		items: [
			{
				id: 123,
				title: "reviewed",
				body: "reviewed",
				url: "https://github.com/o/r/issues/1#issuecomment-123",
				subtitle: "reviewer",
			},
		],
		limit: 50,
	}),
};
describe("permission-aware browser mutation", () => {
	test("denies before broker side effects when effective authority is absent", async () => {
		let calls = 0;
		const guarded: OperatorBroker = {
			...broker,
			comment: async () => {
				calls++;
				return { id: 123 };
			}¶»§q«^