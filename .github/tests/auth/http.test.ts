import { describe, expect, test } from "bun:test";
import {
	createConfidentialBrokerHandler,
	MemoryMutationReceiptJournal,
	type GitHubBrokerTransport,
} from "../../../packages/auth/src/http.ts";
import { MemoryAuthTokenStore } from "../../../packages/auth/src/broker.ts";

const origin = "https://operator.example.test";
const config = { clientId: "client", clientSecret: "secret" };
const app = { installed: true, repositorySelected: true, canRead: true, canWrite: true };
function transport(): GitHubBrokerTransport {
	return {
		authority: async ({ userId }) => ({
			userId, userPermissions: { admin: true, push: true, pull: true }, appAuthority: app,
		}),
		issueUpdatedAt: async () => "2026-10-31T00:00:00Z",
		createComment: async ({ repository, issue, body }) => ({ id: 7 }),
		readComment: async ({ repository, issue }) => ({ id: 7, repository, issue, body: "hello" }),
	};
}
function req(path: string, payload: Record<string, unknown>, from = origin): Request {
	return new Request(`https://broker.example.test/${path}`, {
		method: "POST",
		headers: { Origin: from, "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
}
const intent = {
	sessionId: "opaque",
	repository: "org/repo",
	issue: 42,
	body: "hello",
	expectedUpdatedAt: "2026-10-31T00:00:00Z",
	idempotencyKey: "mutation-unique-0001",
};
describe("confidential broker server boundary", () => {
	test("cross-origin requests are denied before session access", async () => {
		const broker = createConfidentialBrokerHandler({
			client: config, store: new MemoryAuthTokenStore(), journal: new MemoryMutationReceiptJournal(),
			transport: transport(), allowedOrigins: [origin], redirectUris: ["https://operator.example.test/callback"],
		});
		const response = await broker(req("authority", { sessionId: "opaque", repository: "org/repo" }, "https://attacker.example"));
		expect(response.status).toBe(403);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
	});
	test("unknown sessions and missing GitHub installation scope fail closed", async () => {
		const store = new MemoryAuthTokenStore();
		const broker = createConfidentialBrokerHandler({
			client: config, store, journal: new MemoryMutationReceiptJournal(),
			transport: transport(), allowedOrigins: [origin], redirectUris: ["https://operator.example.test/callback"],
		});
		expect((await broker(req("authority", { sessionId: "opaque", repository: "org/repo" }))).status).toBe(401);
		await store.set("opaque", {
			token: { access_token: "private", token_type: "bearer" }, userId: "octocat",
			sessionExpiresAt: Date.now() + 3600_000, accessExpiresAt: Date.now() + 3600_000,
		});
		const blocked = createConfidentialBrokerHandler({
			client: config, store, journal: new MemoryMutationReceiptJournal(),
			transport: { ...transport(), authority: async () => ({
				userId: "octocat", userPermissions: { admin: true, pull: true, push: true },
				appAuthority: { ...app, repositorySelected: false },
			}) },
			allowedOrigins: [origin], redirectUris: ["https://operator.example.test/callback"],
		});
		expect((await blocked(req("issues/comment", intent))).status).toBe(403);
		const valid = await broker(req("authority", { sessionId: "opaque", repository: "org/repo" }));
		expect(JSON.stringify(await valid.json())).not.toContain("private");
	});
	test("deduplicates verified mutations but rejects idempotency-key reuse with different intent", async () => {
		const store = new MemoryAuthTokenStore();
		await store.set("opaque", {
			token: { access_token: "private", token_type: "bearer" }, userId: "octocat",
			sessionExpiresAt: Date.now() + 3600_000,
		});
		let posted = 0;
		const broker = createConfidentialBrokerHandler({
			client: config, store, journal: new MemoryMutationReceiptJournal(),
			transport: { ...transport(), createComment: async () => { posted++; return { id: 7 }; } },
			allowedOrigins: [origin], redirectUris: ["https://operator.example.test/callback"],
		});
		const first = await broker(req("issues/comment", intent));
		const second = await broker(req("issues/comment", intent));
		expect(first.status).toBe(200);
		expect(second.status).toBe(200);
		expect(posted).toBe(1);
		expect((await broker(req("issues/comment", { ...intent, body: "different" }))).status).toBe(409);
	});
});
