import { afterEach, describe, expect, test } from "bun:test";
import { MemoryAuthTokenStore, createBrokerSession, refreshBrokerSession } from "../../../packages/auth/src/broker.ts";
import { assertMergeAuthorization, mergeProposalFingerprint } from "../../../packages/harness/src/graph/approval-evidence.ts";
import { evaluateChecksGate } from "../../../packages/harness/src/graph/checks-gate.ts";
import { translateGitHubEvent } from "../../../packages/harness/src/graph/events.ts";
import type { WorkflowGraph } from "../../../packages/harness/src/graph/types.ts";

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function oauthResponse(access: string): Response {
	return new Response(
		JSON.stringify({
			access_token: access,
			refresh_token: "refresh",
			token_type: "bearer",
			expires_in: 3600,
			refresh_token_expires_in: 7200,
		}),
		{ status: 200, headers: { "content-type": "application/json" } },
	);
}

describe("DF-14 adversarial security acceptance", () => {
	test("SEC-AUTH-01: broker refresh must not extend the declared maximum browser session lifetime", async () => {
		let requests = 0;
		globalThis.fetch = (async () => oauthResponse(`access-${++requests}`)) as typeof fetch;
		const config = { clientId: "test-app", clientSecret: "in-memory-only", sessionTtlMs: 1_000 };
		const store = new MemoryAuthTokenStore();
		const initial = await createBrokerSession(
			config,
			{ code: "authorization", codeVerifier: "verifier", redirectUri: "https://example.test/oauth" },
			store,
			{ sessionId: "session", now: 10_000 },
		);
		expect(initial.expiresAt).toBe(11_000);
		const refreshed = await refreshBrokerSession(config, initial.id, store, 10_900);
		expect(requests).toBe(2);
		// A maximum session lifetime must be measured from session creation, not renewed on every refresh.
		expect(refreshed.expiresAt).toBeLessThanOrEqual(initial.expiresAt);
	});

	test("SEC-GH-01: multi-PR check suite must not silently choose an arbitrary first pull request", () => {
		const translated = translateGitHubEvent("check_suite", {
			action: "completed",
			check_suite: {
				conclusion: "success",
				head_sha: "a".repeat(40),
				pull_requests: [{ number: 101 }, { number: 202 }],
			},
		});
		// One translated event has only one subject. A multi-PR delivery must fan out
		// explicitly or fail closed instead of silently losing the second PR's checks.
		expect(translated.kind).toBe("skip");
	});

	test("SEC-MERGE-01: changing reviewed SHA or external check binding revokes approval", () => {
		const sha = "b".repeat(40);
		const outputs: Record<string, unknown> = {
			pr_number: 17,
			commit_sha: sha,
			external_checks_head_sha: sha,
			aligned: true,
			planning_context: { issue: 9 },
			plan_artifact: { steps: ["implement"] },
			implementation_artifact: { diff: "approved" },
		};
		outputs.merge_authorization = {
			fingerprint: mergeProposalFingerprint(outputs),
			prNumber: 17,
			headSha: sha,
			actor: "human-maintainer",
			approvedAt: "2026-10-31T10:00:00.000Z",
		};
		expect(assertMergeAuthorization(outputs).headSha).toBe(sha);
		outputs.commit_sha = "c".repeat(40);
		expect(() => assertMergeAuthorization(outputs)).toThrow("Missing or stale");
		outputs.commit_sha = sha;
		outputs.external_checks_head_sha = "c".repeat(40);
		expect(() => assertMergeAuthorization(outputs)).toThrow();
	});

	test("SEC-CHECKS-01: one green job never overrides missing, pending or failed required checks", async () => {
		const graph: WorkflowGraph = {
			version: 1,
			nodes: [],
			edges: [],
			checks: [
				{ name: "quality", required: true },
				{ name: "security", required: true },
			],
		};
		const sha = "d".repeat(40);
		const source = (states: Map<string, "success" | "pending" | "failure">) => ({
			checkStates: async (ref: string) => {
				expect(ref).toBe(sha);
				return states;
			},
		});
		expect(
			(await evaluateChecksGate(graph, source(new Map([["quality", "success"]])), sha)).conclusion,
		).toBe("pending");
		expect(
			(
				await evaluateChecksGate(
					graph,
					source(new Map([["quality", "success"], ["security", "failure"]])),
					sha,
				)
			).conclusion,
		).toBe("failed");
		expect(
			(
				await evaluateChecksGate(
					graph,
					source(new Map([["quality", "success"], ["security", "pending"]])),
					sha,
				)
			).conclusion,
		).toBe("pending");
	});
});
