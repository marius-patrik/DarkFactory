import { describe, expect, test } from "bun:test";
import { ModelsError, fauxAssistantMessage } from "@earendil-works/pi-ai";
import { classifyFailure, nextPacificMidnight, proseResetAt } from "../src/quota.ts";
import { BUILTIN_PROVIDER_CONFIG } from "../src/providers/schema.ts";

function providerError(message: string, status?: number, headers?: Record<string, string>): Error {
	const error = new Error(message) as Error & { status?: number; headers?: Headers };
	error.name = "APIError";
	error.status = status;
	error.headers = headers ? new Headers(headers) : undefined;
	return error;
}

describe("classifyFailure", () => {
	test.each([
		["quota text", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: "insufficient_quota" }) }, "quota_exhausted"],
		["HTTP 402", { error: providerError("payment required", 402) }, "quota_exhausted"],
		// Observed 2026-09-15 on Cerebras with a $0 balance: the SDK error carries only its message.
		["402 named in an SDK message without a status", { error: new Error("402 status code (no body)") }, "quota_exhausted"],
		// Observed 2026-09-15 on the lanes: gateways put the status first and df classified them fatal, so failover cycled forever.
		["Cline daily cap with the status first", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: '429: {"code":"INFERENCE_CAP_ERROR","message":"Error 429: Daily free limit reached on model poolside/laguna-s-2.1:free. Try again in 22h 16m"}' }) }, "quota_exhausted"],
		["DeepInfra balance with the status first", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: '402: {"message":"You need positive balance to do inference. Please add balance manually or"}' }) }, "quota_exhausted"],
		["Hugging Face monthly credits", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: '402 "You have depleted your monthly included credits. Purchase pre-paid credits to continue"' }) }, "quota_exhausted"],
		["Ollama Cloud subscription model", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: '402: {"message":"this model requires a subscription or usage credits, upgrade for access"}' }) }, "quota_exhausted"],
		["status-first 429 without quota wording", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: '429: {"message":"slow down"}' }) }, "rate_limited"],
		["HTTP 429", { error: providerError("too many requests", 429) }, "rate_limited"],
		["auth model error", { error: new ModelsError("oauth", "refresh failed") }, "auth"],
		["HTTP auth", { error: providerError("request failed", 401) }, "auth"],
		["server", { error: providerError("upstream", 503) }, "transient"],
		["transport", { error: new TypeError("fetch failed") }, "transient"],
		["unknown", { message: fauxAssistantMessage([], { stopReason: "error", errorMessage: "bad request" }) }, "fatal"],
	] as const)("classifies %s", (_name, input, expected) => {
		expect(classifyFailure(input).kind).toBe(expected);
	});

	test.each([
		[401, "CreditsError: No payment method. Add a payment method here"],
		[403, "Free plan access_terminated_error"],
		[403, "You've reached your usage limit for this billing cycle"],
	] as const)("classifies HTTP %s provider quota wording before auth", (status, wording) => {
		expect(classifyFailure({ error: providerError(wording, status) }).kind).toBe("quota_exhausted");
		expect(classifyFailure({ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: wording }) }).kind).toBe("quota_exhausted");
	});

	test("extracts Retry-After and reset epoch hints", () => {
		const now = 1_700_000_000_000;
		expect(classifyFailure({ error: providerError("429", 429, { "retry-after": "12" }), now }).resetAt).toBe(now + 12_000);
		expect(classifyFailure({ error: providerError("429", 429, { "x-ratelimit-reset": "1700000090" }), now }).resetAt).toBe(1_700_000_090_000);
	});

	test("provider-specific request-shape errors are classified as transient candidates", () => {
		const rules = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!.quota!.rules;
		const error = providerError("Function call is missing a thought_signature in functionCall parts", 400);
		expect(classifyFailure({ error }, { rules, model: "gemini-3.5-flash-lite" }).kind).toBe("transient");
	});

	test("takes the reset a provider only states in prose", () => {
		const now = 1_700_000_000_000;
		const errorMessage = '429: {"code":"INFERENCE_CAP_ERROR","message":"Error 429: Daily free limit reached on model x. Try again in 22h 16m"}';
		const result = classifyFailure({ message: fauxAssistantMessage([], { stopReason: "error", errorMessage }), now });
		expect(result).toMatchObject({ kind: "quota_exhausted", status: 429, resetAt: now + 22 * 3_600_000 + 16 * 60_000 });
		expect(proseResetAt("rate limited, try again in 45s", now)).toBe(now + 45_000);
		expect(proseResetAt("try again later", now)).toBeUndefined();
	});

	describe("AI Studio daily free-tier regression triplet", () => {
		const rules = BUILTIN_PROVIDER_CONFIG.providers.find((entry) => entry.id === "google")!.quota!.rules;
		const now = Date.parse("2026-07-10T12:00:00Z");
		const quotaId = "GenerateRequestsPerDayPerProjectPerModel-FreeTier";
		test("success: daily QuotaFailure is quota_exhausted and uses RetryInfo", () => {
			const body = JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId }] }, { retryDelay: "123s" }] } });
			expect(classifyFailure({ error: providerError(body, 429), now }, { rules, model: "gemini-3.8-flash" })).toMatchObject({ kind: "quota_exhausted", resetAt: now + 123_000, pool: "google-free-daily:gemini-3.8-flash" });
		});

		test("edge-input: missing RetryInfo resets at next Pacific midnight", () => {
			const body = JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", details: [{ violations: [{ quotaId }] }] } });
			expect(classifyFailure({ error: providerError(body, 429), now }, { rules, model: "gemini-3.8-flash" }).resetAt).toBe(nextPacificMidnight(now));
		});

		test("failure: unrelated 429 remains rate_limited", () => {
			expect(classifyFailure({ error: providerError('{"error":{"status":"RESOURCE_EXHAUSTED","message":"burst"}}', 429), now }, { rules, model: "gemini-3.8-flash" }).kind).toBe("rate_limited");
		});

		test("recorded-shape: extracts RetryInfo from a formatted 429 QuotaFailure body", () => {
			const body = {
				error: {
					code: 429,
					message: "Quota exceeded for quota metric GenerateRequestsPerDayPerProjectPerModel-FreeTier",
					status: "RESOURCE_EXHAUSTED",
					details: [
						{ "@type": "type.googleapis.com/google.rpc.QuotaFailure", violations: [{ quotaId }] },
						{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "37s" },
					],
				},
			};
			const formatted = `429: ${JSON.stringify(body)} (request failed)`;
			expect(classifyFailure({ message: fauxAssistantMessage([], { stopReason: "error", errorMessage: formatted }), response: { status: 429, headers: {} }, now }, { rules, model: "gemini-3-flash-preview" })).toMatchObject({
				kind: "quota_exhausted",
				resetAt: now + 37_000,
				pool: "google-free-daily:gemini-3-flash-preview",
			});
		});
	});
});
