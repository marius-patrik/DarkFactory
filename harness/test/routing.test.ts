import { describe, expect, test } from "bun:test";
import type { DfConfig } from "../src/config.ts";

const DEFAULT_CHAIN = "google/gemini-3.8-flash@default,groq/openai/gpt-oss-120b@default";

import { defaultSensitiveDataHook, resolveRouting } from "../src/harness/routing.ts";

const config: DfConfig = {
	defaultChain: DEFAULT_CHAIN,
	hardReasoningChain: "anthropic/claude-hard@work,openai/gpt-hard@backup",
	sensitiveChain: "local/private@sensitive,anthropic/claude-safe@backup",
};

describe("model routing policy", () => {
	test("uses Gemini 3.8 Flash by default and has no Antigravity default", async () => {
		const route = await resolveRouting({ defaultChain: DEFAULT_CHAIN }, { prompt: "hello" });
		expect(route.source).toBe("default");
		expect(route.chain.slice(0, 3).map((entry) => `${entry.provider}/${entry.model}@${entry.account}`)).toEqual([
			"google/gemini-3.8-flash@default",
			"groq/openai/gpt-oss-120b@default",
		]);
		expect(new Set(route.chain.map((entry) => entry.provider)).size).toBe(2);
		expect(JSON.stringify(route.chain)).not.toContain("antigravity");
	});

	test("explicit user and graph routes override every automatic policy", async () => {
		const explicit = await resolveRouting(config, {
			prompt: "password=very-secret-value",
			reasoning: "hard",
			explicitChain: "grok-sub/grok-4.6@main,google/gemini-backup@default",
			node: { chain: "local/node@private", reasoning: "hard" },
		});
		expect(explicit.source).toBe("explicit");
		expect(explicit.chain.map((item) => item.provider)).toEqual(["grok-sub", "google"]);

		const graph = await resolveRouting(config, {
			prompt: "password=very-secret-value",
			reasoning: "hard",
			node: { model: "openai/node-model@work" },
		});
		expect(graph).toMatchObject({
			source: "graph",
			chain: [{ provider: "openai", model: "node-model", account: "work" }],
		});
	});

	test("GitHub noreply and bot addresses in commit metadata are not personal data", async () => {
		// Pipeline prompts carry authors and trailers such as these; treating them as PII sent every
		// such task to the sensitive chain (or failed it when none was configured).
		for (const prompt of [
			"Commit with author marius-patrik <marius-patrik@users.noreply.github.com>",
			"Co-authored-by: Claude <noreply@anthropic.com>",
			"Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
			"darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>",
		]) {
			expect((await resolveRouting(config, { prompt })).source).toBe("default");
		}
		expect(
			(await resolveRouting(config, { prompt: "author x@users.noreply.github.com, contact jane.doe@proton.me" }))
				.source,
		).toBe("sensitive");
	});

	test("addresses on reserved example and test domains are not personal data", async () => {
		// Test fixtures and verify output quote such addresses; counting them as PII made chunk prompts unroutable.
		for (const address of [
			"dev@example.com",
			"a@mail.example.org",
			"test@example.invalid",
			"bot@ci.test",
			"x@users.example",
			"root@localhost.localhost",
		]) {
			expect((await resolveRouting(config, { prompt: `author ${address}` })).source).toBe("default");
		}
		expect((await resolveRouting(config, { prompt: "author dev@example.com.evil.io" })).source).toBe("sensitive");
		expect((await resolveRouting(config, { prompt: "author dev@notexample.com" })).source).toBe("sensitive");
	});

	test("sensitive prompts and tool results select the configured sensitive failover chain", async () => {
		expect((await resolveRouting(config, { prompt: "contact jane.doe@proton.me" })).source).toBe("sensitive");
		expect(
			(
				await resolveRouting(config, {
					prompt: "inspect output",
					toolResults: [{ token: "access_token=fixture-secret-123" }],
				})
			).source,
		).toBe("sensitive");
		expect(
			(
				await resolveRouting(config, {
					prompt: "custom classification",
					sensitiveHook: { detect: async () => true },
				})
			).source,
		).toBe("sensitive");
	});

	test("hard routing retains the whole configured cross-provider failover chain", async () => {
		const route = await resolveRouting(config, { prompt: "prove this", reasoning: "hard" });
		expect(route.source).toBe("hard");
		expect(route.chain.map((item) => item.provider)).toEqual(["anthropic", "openai"]);
	});

	test("default detector ignores prose that names credentials without containing one", () => {
		expect(defaultSensitiveDataHook.detect({ prompt: "Explain how an API key works", toolResults: [] })).toBe(false);
	});

	test("regression case: PR #366 self-review handles fixture/example strings in source/test diffs without triggering sensitive routing", async () => {
		const pr366DiffPrompt = `
diff --git a/harness/test/routing.test.ts b/harness/test/routing.test.ts
--- a/harness/test/routing.test.ts
+++ b/harness/test/routing.test.ts
@@ -10,2 +10,4 @@
+	test("sensitive detector test fixture sk-1234567890abcdef AIzaSyFakeKey", () => {
+		expect(sensitive("sk-1234567890abcdef")).toBe(true);
+	});
`;
		expect(await defaultSensitiveDataHook.detect({ prompt: pr366DiffPrompt, toolResults: [] })).toBe(false);
		expect((await resolveRouting(config, { prompt: pr366DiffPrompt })).source).toBe("default");
	});

	test("control case: actual credential-like value in runtime/tool-result context triggers sensitive routing", async () => {
		const realSecretPrompt =
			"Here is the production access_token=sk-proj-liveProductionSecretKeyWithRealValue1234567890abcdef";
		expect(await defaultSensitiveDataHook.detect({ prompt: realSecretPrompt, toolResults: [] })).toBe(true);
		expect((await resolveRouting(config, { prompt: realSecretPrompt })).source).toBe("sensitive");
	});
});
