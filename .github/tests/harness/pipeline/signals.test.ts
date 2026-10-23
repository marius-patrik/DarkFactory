/**
 * The classification rules the attempt ladder decides on.
 *
 * Each case here is a report that used to be read the wrong way, so the assertion is written
 * against the specific wording that caused it rather than against a generic example.
 */

import { describe, expect, test } from "bun:test";
import {
	AGENT_ERROR_PREFIX,
	AUTH_FAILED_NOTICE,
	boundedTail,
	isAgentErrorNotice,
	isAuthFailure,
	isBotOrAgentComment,
	isPrintTimeout,
	isQuotaExhausted,
	isQuotaExhaustionNotice,
	isShortFailureReport,
	isWorkflowPermissionError,
	QUOTA_EXHAUSTED_NOTICE,
	redactSecrets,
	rewriteFileLinks,
	SHORT_REPORT_LIMIT,
} from "../../src/pipeline/signals.ts";

describe("quota exhaustion", () => {
	test.each([
		"Error: 429 Too Many Requests",
		"RESOURCE_EXHAUSTED",
		"quota exceeded for this model",
		"rate limit reached",
		"the model is overloaded",
	])("detects %p", (message) => {
		expect(isQuotaExhausted(message)).toBe(true);
	});

	test.each(["compilation failed: expected `;`", "test failure in tests/test_codec.py", ""])(
		"does not mistake %p for exhaustion",
		(message) => {
			expect(isQuotaExhausted(message)).toBe(false);
		},
	);

	test("a provider that says daily limit reached is detected", () => {
		// The phrasing that escaped detection when the list only knew the words quota and rate limit.
		expect(isQuotaExhausted("Your daily limit has been reached")).toBe(true);
	});
});

describe("authentication failure", () => {
	test.each([
		"HTTP 401 Unauthorized",
		"status code 403",
		"invalid_grant",
		"invalid API key",
		"the token expired",
		"authentication failed",
	])("detects %p", (message) => {
		expect(isAuthFailure(message)).toBe(true);
	});

	test("quota wording is not an auth failure", () => {
		// Quota is checked first and stays as it was, so the two classifications must not overlap.
		expect(isAuthFailure("429 Too Many Requests")).toBe(false);
	});
});

describe("print-mode timeout", () => {
	test("detects the CLI's own wording", () => {
		expect(isPrintTimeout("print timeout after 5m0s")).toBe(true);
		expect(isPrintTimeout("print-timeout 5m0s")).toBe(true);
	});

	test("the wording is ambiguous by design, which is why the caller restricts it to stderr", () => {
		// An answer that discusses timeouts carries the same wording a truncation does, so this
		// function cannot tell them apart and must not be handed an answer. The attempt ladder only
		// calls it on stderr, where the CLI reports its own budget; the answer is read from stdout
		// and never reaches this predicate.
		const answer = "The print timeout is too short: the request timed out before the response.";
		expect(isPrintTimeout(answer)).toBe(true);
		expect(isPrintTimeout("")).toBe(false);
	});
});

describe("the ladder's own notices", () => {
	test("only the exhaustion notice counts as exhaustion", () => {
		expect(isQuotaExhaustionNotice(`${QUOTA_EXHAUSTED_NOTICE} across every harness and model (agy): 429`)).toBe(true);
		expect(isQuotaExhaustionNotice(AUTH_FAILED_NOTICE)).toBe(false);
	});

	test("an answer discussing quota is posted, not swallowed", () => {
		// Request #220 asked for rate-limit handling and its interpretation was dropped silently
		// because it mentioned 429s.
		const answer = "Classify opencode `429 Too Many Requests` and rate limit output as quota exhausted.";
		expect(isQuotaExhaustionNotice(answer)).toBe(false);
		expect(isAgentErrorNotice(answer)).toBe(false);
	});

	test("every error report carries the one prefix", () => {
		expect(isAgentErrorNotice(QUOTA_EXHAUSTED_NOTICE)).toBe(true);
		expect(isAgentErrorNotice(`${AGENT_ERROR_PREFIX}: something else`)).toBe(true);
		expect(isAgentErrorNotice("a real answer")).toBe(false);
	});
});

describe("short failure reports", () => {
	test("a terse exhaustion report on stdout is a failed attempt", () => {
		expect(isShortFailureReport("Error: 429 Too Many Requests")).toBe(true);
	});

	test("a long answer about quota is an answer", () => {
		const answer = `### 1. Verbatim Request Summary\n${"rate limits and quotas ".repeat(30)}`;
		expect(answer.length).toBeGreaterThan(SHORT_REPORT_LIMIT);
		expect(isShortFailureReport(answer)).toBe(false);
	});

	test("a terse report with no rotation wording is an answer", () => {
		expect(isShortFailureReport("Done.")).toBe(false);
	});
});

describe("bounded log tails", () => {
	test("short text is returned compacted", () => {
		expect(boundedTail("  boom  ")).toBe("boom");
	});

	test("long text keeps the end and says how much was dropped", () => {
		const tail = boundedTail(`${"a".repeat(50)}TAIL`, 10);
		expect(tail).toContain("TAIL");
		expect(tail).toContain("44 characters omitted");
	});

	test("empty text stays empty", () => {
		expect(boundedTail("")).toBe("");
	});
});

describe("workflow permission refusals", () => {
	test.each([
		"remote: refusing to allow a GitHub App to create or update workflow without workflows permission",
		"ERROR: refusing to allow a GitHub App to create or update workflow `.github/workflows/ci.yml`",
	])("detects %p", (message) => {
		expect(isWorkflowPermissionError(message)).toBe(true);
	});

	test("an ordinary push failure is not a permission problem", () => {
		expect(isWorkflowPermissionError("! [rejected] main -> main (non-fast-forward)")).toBe(false);
	});
});

describe("the agent's own comments", () => {
	test("a bot login is never answered", () => {
		expect(isBotOrAgentComment("github-actions[bot]", "anything")).toBe(true);
	});

	test("the pipeline's branding is recognised whoever posted it", () => {
		expect(isBotOrAgentComment("someone", "<!-- darkfactory-agent -->\nInterpretation")).toBe(true);
		expect(isBotOrAgentComment("someone", "### DarkFactory Agent Response\n\nDone")).toBe(true);
	});

	test("a predecessor's branding is still recognised", () => {
		expect(isBotOrAgentComment("someone", "<!-- omnis-agent -->\nInterpretation")).toBe(true);
	});

	test("a person saying approve is not chatter", () => {
		expect(isBotOrAgentComment("marius-patrik", "approve")).toBe(false);
	});
});

describe("secret redaction", () => {
	const env = { PROVIDER_KEY: "sk-live-abcdefgh", SHORT: "tiny" };

	test("a populated credential is replaced", () => {
		expect(redactSecrets("calling with sk-live-abcdefgh now", ["PROVIDER_KEY"], env)).toBe("calling with *** now");
	});

	test("the GitHub tokens are redacted without being declared", () => {
		const withToken = { GH_TOKEN: "ghp_0123456789abcdef" };
		expect(redactSecrets("used ghp_0123456789abcdef", [], withToken)).toBe("used ***");
	});

	test("a value too short to be a credential is left alone", () => {
		expect(redactSecrets("a tiny value", ["SHORT"], env)).toBe("a tiny value");
	});

	test("a secret that is a prefix of another is replaced whole", () => {
		const overlapping = { A: "prefix-abcdefgh", B: "prefix-abcdefgh-longer" };
		expect(redactSecrets("prefix-abcdefgh-longer", ["A", "B"], overlapping)).toBe("***");
	});

	test("empty text is returned unchanged", () => {
		expect(redactSecrets("", ["PROVIDER_KEY"], env)).toBe("");
	});
});

describe("file links in agent output", () => {
	test("a file URL becomes a repository blob link", () => {
		const out = rewriteFileLinks("see file:///harnesses.py for details", "marius-patrik/DarkFactory", "darkfactory");
		expect(out).not.toContain("file://");
		expect(out).toContain("https://github.com/marius-patrik/DarkFactory/blob/darkfactory/harnesses.py");
	});

	test("without a repository slug a plain code path remains", () => {
		const out = rewriteFileLinks("see file:///.github/scripts/harnesses.py");
		expect(out).not.toContain("file://");
		expect(out).toContain(".github/scripts/harnesses.py");
	});

	test("an owner/repo prefix directly in front of a root marker is stripped", () => {
		const out = rewriteFileLinks("file:///a/b/src/src/harness/cli.ts", "o/r", "develop");
		expect(out).toContain("https://github.com/o/r/blob/develop/src/harness/cli.ts");
	});

	test("a path whose fourth segment is not a root marker is left whole", () => {
		// The prefix strip only fires when the segment directly after `owner/repo/` is itself a
		// root marker, so a nested source directory is not mistaken for the repository root. Guessing
		// a repository-relative path out of an unrecognised shape produces a link that 404s, which
		// is worse than a link that merely repeats the directory the agent printed.
		const out = rewriteFileLinks(
			"file:///home/runner/work/DarkFactory/DarkFactory/packages/harness/src/cli.ts",
			"o/r",
			"develop",
		);
		expect(out).toContain("https://github.com/o/r/blob/develop/DarkFactory/DarkFactory/packages/harness/src/cli.ts");
	});

	test("machine configuration is reduced to its basename", () => {
		expect(rewriteFileLinks("file:///etc/ssl/certs/ca.pem", "o/r", "develop")).toBe("`ca.pem`");
	});

	test("plain text passes through unchanged", () => {
		expect(rewriteFileLinks("no links here")).toBe("no links here");
	});
});
