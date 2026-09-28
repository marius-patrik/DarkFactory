import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { REGISTRY } from "../../src/install/harness-registry.ts";
import type { QuotaBlockStore } from "../../src/pipeline/agent-failures.ts";
import {
	ANSWER_CONTRACT,
	agentPromptRunner,
	type CommandResult,
	HarnessBinaryMissing,
	type ProcessRunner,
} from "../../src/pipeline/agent-prompt.ts";
import { type Checkpoint, loadCheckpoint } from "../../src/pipeline/checkpoint.ts";
import { QUOTA_PROVIDERS_VARIABLE, quotaRunVariable } from "../../src/pipeline/quota.ts";
import { AGENT_ERROR_PREFIX, AUTH_FAILED_NOTICE, QUOTA_EXHAUSTED_NOTICE } from "../../src/pipeline/signals.ts";
import {
	operations,
	postedComments,
	type RecordingIo,
	type RecordingWorkspace,
	recordingIo,
	recordingWorkspace,
} from "./handlers.ts";

/** 2026-09-15T12:00:00Z, which is 05:00 in Los Angeles. */
const NOW = 1789473600;

/** A `df run --json` stream whose last segment is the answer. */
function dfStream(...deltas: string[]): string {
	return `${deltas.map((delta) => JSON.stringify({ type: "text_delta", delta })).join("\n")}\n`;
}

/** What one scripted invocation of the harness did, as the ladder sees it. */
interface RecordedRun {
	/** The argv the ladder rendered. */
	argv: string[];
	/** The environment the child would have run in. */
	env: Record<string, string | undefined>;
	/** The prompt the child could have read, captured before the file is removed. */
	prompt: string;
	/** Whether the prompt file still existed at the moment the child was invoked. */
	promptFileExisted: boolean;
	/** The subscription login the child could have read, captured before the attempt removed it. */
	loginFile: string | undefined;
}

/** Everything a test reads off one ladder run. */
interface LadderRun {
	/** The text the runner returned, or the error it threw. */
	result: string | Error;
	/** Every invocation the ladder made, in order. */
	runs: RecordedRun[];
	/** Every message reported, on either stream, in order. */
	reported: string[];
	/** The GitHub calls the ladder made. */
	io: RecordingIo;
	/** The working-copy calls the ladder made. */
	workspace: RecordingWorkspace;
	/** The board moves the ladder made. */
	board: Array<{ number: number; isPr: boolean; status: string }>;
	/** The repository variables the ladder wrote. */
	variables: Array<{ repo: string; name: string; value: string }>;
	/** How long the ladder asked to wait, in milliseconds. */
	slept: number[];
}

/** What a test tells the ladder to do. */
interface LadderOptions {
	/** One entry per invocation, in order; the last entry repeats once the list runs out. */
	invocations?: Array<CommandResult | Error>;
	/** Environment the run is given. */
	env?: Record<string, string | undefined>;
	/** Binaries on `PATH`; anything else is absent. */
	onPath?: string[];
	/** A checkpoint context for the quota and empty-output tails. */
	checkpoint?: Partial<Checkpoint> | undefined;
	/** The print-mode timeout the caller asks for, overriding the default. */
	timeout?: string;
	/** What each git invocation prints, so a working copy can be given staged changes. */
	gitOutput?: Record<string, string>;
}

let workspaceDir = "";

/**
 * Run the ladder over a scripted harness and hand back everything it did.
 *
 * @param options - What each invocation does, what the environment holds, and what is on `PATH`.
 * @returns The outcome, the invocations, and every side effect the run left behind.
 */
async function runLadder(options: LadderOptions = {}): Promise<LadderRun> {
	const invocations = options.invocations ?? [{ exitCode: 0, stdout: dfStream("the answer"), stderr: "" }];
	// The image carries exactly the chain's binaries, so an unlisted harness is genuinely absent and a
	// chain override is genuinely runnable.
	const chain = (options.env?.AGENT_HARNESS_CHAIN ?? "df")
		.split(",")
		.map((name) => name.trim())
		.filter(Boolean);
	const onPath = options.onPath ?? chain.map((name) => REGISTRY[name]?.binary ?? name);
	const io = recordingIo();
	const workspace = recordingWorkspace({ gitOutput: options.gitOutput });
	const board: LadderRun["board"] = [];
	const variables: LadderRun["variables"] = [];
	const reported: string[] = [];
	const slept: number[] = [];
	const runs: RecordedRun[] = [];

	const quotaBlocks: QuotaBlockStore = {
		read: async () => undefined,
		write: async (repo, name, value) => {
			variables.push({ repo, name, value });
		},
	};

	let call = 0;
	const run: ProcessRunner = async (argv, env) => {
		// The prompt file is removed the moment the attempt ends, so what the child would have read has
		// to be captured here rather than afterwards.
		const promptPath = argv[argv.indexOf("--prompt-file") + 1];
		const promptFileExisted = promptPath !== undefined && existsSync(promptPath);
		const loginPath = env.HOME ? join(env.HOME, ".codex", "auth.json") : "";
		runs.push({
			argv: [...argv],
			env,
			prompt: promptFileExisted ? readFileSync(promptPath as string, "utf8") : (argv[argv.length - 2] ?? ""),
			promptFileExisted,
			loginFile: loginPath && existsSync(loginPath) ? readFileSync(loginPath, "utf8") : undefined,
		});
		const scripted = invocations[Math.min(call, invocations.length - 1)] as CommandResult | Error;
		call += 1;
		if (scripted instanceof Error) throw scripted;
		return scripted;
	};

	const runner = agentPromptRunner({
		io: io.io,
		workspace: workspace.io,
		board: (entity, status) => board.push({ ...entity, status }),
		run,
		quotaBlocks,
		env: { GITHUB_WORKSPACE: workspaceDir, GITHUB_REPOSITORY: "marius-patrik/DarkFactory", ...options.env },
		which: (binary) => (onPath.includes(binary) ? `/usr/local/bin/${binary}` : null),
		sleep: async (ms) => {
			slept.push(ms);
		},
		now: () => NOW,
		say: (message) => reported.push(message),
		warn: (message) => reported.push(message),
	});

	let result: string | Error;
	try {
		result = await runner({
			prompt: "Interpret issue #42.",
			kind: "classify",
			...(options.timeout ? { timeout: options.timeout } : {}),
			...(options.checkpoint ? { checkpoint: options.checkpoint } : {}),
		});
	} catch (error) {
		result = error instanceof Error ? error : new Error(String(error));
	}
	return { result, runs, reported, io, workspace, board, variables, slept };
}

beforeEach(() => {
	workspaceDir = mkdtempSync(join(tmpdir(), "df-agent-prompt-"));
});

afterEach(() => {
	rmSync(workspaceDir, { recursive: true, force: true });
});

describe("the answer a harness produces", () => {
	test("df's event stream becomes the agent's text, and the prompt travels by file", async () => {
		const run = await runLadder({
			invocations: [
				{
					exitCode: 0,
					stdout: `${dfStream("Reading the issue. ")}{"type":"tool_start","name":"read"}\n${dfStream("The scope is ", "the handler.")}`,
					stderr: "",
				},
			],
		});

		expect(run.result).toBe("The scope is the handler.");

		// The prompt is a path, not an argv element, so a long prompt never meets an argument-length
		// limit; and the answer contract rides along in the file rather than being appended to argv.
		const invocation = run.runs[0] as RecordedRun;
		expect(invocation.argv.slice(0, 4)).toEqual(["df", "run", "--json", "--prompt-file"]);
		expect(invocation.argv.slice(5)).toEqual(["--kind", "classify", "--timeout", "5m0s"]);
		// The prompt is a file, not an argv element, so a long prompt never meets an argument-length
		// limit, and the answer contract rides along in it.
		expect(invocation.promptFileExisted).toBe(true);
		expect(invocation.prompt).toBe(`Interpret issue #42.${ANSWER_CONTRACT}`);
		// The file holds the whole run's instruction and must not outlive the attempt.
		expect(existsSync(invocation.argv[4] as string)).toBe(false);
	});

	test("the default is the print-mode budget and a plan pins the longer one", async () => {
		// A plan spans several files and is the longest prompt before implementation, so the caller
		// names a longer budget rather than the ladder guessing one.
		const defaulted = await runLadder();
		expect(defaulted.runs[0]?.argv).toContain("5m0s");

		const planned = await runLadder({ timeout: "15m0s" });
		expect(planned.runs[0]?.argv).toContain("15m0s");
	});

	test("TERM is defaulted for the child and left alone when the workflow set one", async () => {
		const defaulted = await runLadder();
		expect(defaulted.runs[0]?.env.TERM).toBe("xterm-256color");

		const pinned = await runLadder({ env: { TERM: "dumb" } });
		expect(pinned.runs[0]?.env.TERM).toBe("dumb");
	});

	test("an answer that already carries the error prefix reaches the handler exactly as written", async () => {
		const text =
			`${AGENT_ERROR_PREFIX}: Quota exhausted across every harness and model (df): daily limit reached\n` +
			"\nThat is the notice the ladder itself returns, quoted here as an example of the wording.\n" +
			"A real answer can name it without being one.";
		const run = await runLadder({ invocations: [{ exitCode: 0, stdout: dfStream(text), stderr: "" }] });

		// Every handler branches on this prefix, so the ladder must not re-wrap, re-order or redact an
		// answer that happens to contain it.
		expect(run.result).toBe(text);
		expect(run.reported.filter((line) => line.startsWith(AGENT_ERROR_PREFIX))).toEqual([]);
	});

	test("a terse single line carrying the prefix is a report, not an answer", async () => {
		// The one-line limit is what keeps the rule above from catching every report. Rotating past a
		// one-line notice beats posting it as the agent's reply.
		const run = await runLadder({
			env: { AGENT_HARNESS_CHAIN: "df,claude", CLAUDE_CODE_OAUTH_TOKEN: "tok-abcdefgh", HOME: workspaceDir },
			invocations: [
				{ exitCode: 0, stdout: dfStream("Error: 429 Too Many Requests"), stderr: "" },
				{ exitCode: 0, stdout: "the real answer\n", stderr: "" },
			],
		});

		expect(run.result).toBe("the real answer");
		expect(run.reported.join("\n")).toContain("Quota exhausted on df (reported on stdout)");
		expect(run.runs.map((entry) => entry.argv[0])).toEqual(["df", "claude"]);
	});
});

describe("when the image has no usable harness", () => {
	test("a chain whose binaries are all absent returns the no-harness notice and spawns nothing", async () => {
		const run = await runLadder({ onPath: [] });

		// The pipeline has one harness by declaration, so an image that lost it is a diagnosable state
		// rather than a crash, and the run says which binary is missing.
		expect(run.result).toBe(
			`${AGENT_ERROR_PREFIX}: No usable harness. ` +
				"The pipeline runs df as its only agent harness and it is not on PATH.",
		);
		expect(run.runs).toEqual([]);
	});

	test("a chain naming a harness that is not installed skips it and runs the one that is", async () => {
		const run = await runLadder({
			env: { AGENT_HARNESS_CHAIN: "cursor,df" },
			onPath: ["df"],
		});

		expect(run.result).toBe("the answer");
		expect(run.reported).toContain("Harness 'cursor' unavailable (cursor-agent not on PATH); skipping.");
	});
});

describe("when the agent produces nothing", () => {
	test("an empty exit 0 fails the run, posts a notice, and never blocks the item", async () => {
		const run = await runLadder({
			invocations: [{ exitCode: 0, stdout: "", stderr: "" }],
			checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory", completedSteps: ["Read Request #42"] },
		});

		// Silence is the one outcome the pipeline must not report as success: the workflow stays green
		// and the issue waits forever.
		expect(run.result).toBeInstanceOf(Error);
		expect((run.result as Error).message).toBe(
			`${AGENT_ERROR_PREFIX}: No usable agent output was produced across every attempt (df): ` +
				"df produced no output",
		);

		const comment = postedComments(run.io)[0] as string;
		expect(comment.startsWith("<!-- darkfactory-agent -->\n### DarkFactory Agent Execution Error\n\n")).toBe(true);
		expect(comment).toContain("No usable agent output was produced");

		// A failed run is not a blocked run: there is no progress to resume and no `Blocked` label.
		expect(run.board).toEqual([]);
		expect(operations(run.io)).not.toContain("changeLabels");
		expect(loadCheckpoint(workspaceDir)).toBeUndefined();
		expect(run.variables).toEqual([]);
	});

	test("a print-timed-out run is the same failure, and the budget is spent rather than the text missing", async () => {
		const run = await runLadder({
			invocations: [{ exitCode: 0, stdout: dfStream("half an ans"), stderr: "agy: print-timeout after 5m0s" }],
			checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory" },
		});

		expect((run.result as Error).message).toContain("No usable agent output was produced");
		expect(run.reported.join("\n")).toContain("exit 0, empty or print-timed-out");
		expect(postedComments(run.io)).toHaveLength(1);
	});

	test("a failure notice that cannot be posted does not replace the failure being raised", async () => {
		const io = recordingIo({}, { addComment: new Error("503 Service Unavailable") });
		const runner = agentPromptRunner({
			io: io.io,
			workspace: recordingWorkspace().io,
			board: () => {},
			run: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
			quotaBlocks: { read: async () => undefined, write: async () => {} },
			env: { GITHUB_WORKSPACE: workspaceDir, GITHUB_REPOSITORY: "marius-patrik/DarkFactory" },
			which: (binary) => `/usr/local/bin/${binary}`,
			warn: () => {},
		});

		await expect(
			runner({ prompt: "go", kind: "classify", checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory" } }),
		).rejects.toThrow("No usable agent output was produced");
	});
});

describe("when the agent fails outright", () => {
	test("a non-zero exit that is neither quota nor auth ends the run at once, without retrying", async () => {
		const run = await runLadder({
			invocations: [{ exitCode: 1, stdout: "", stderr: "TypeError: cannot read property of undefined" }],
		});

		expect(run.result).toBe(
			`${AGENT_ERROR_PREFIX}: \`df\` invocation failed (exit code 1): ` +
				"TypeError: cannot read property of undefined",
		);
		// Falling through would burn every harness on the same broken prompt.
		expect(run.runs).toHaveLength(1);
		expect(run.reported.join("\n")).toContain("invocation failed (exit code 1)");
	});

	test("a failure the ladder has never seen is surfaced verbatim rather than classified", async () => {
		const run = await runLadder({
			invocations: [new Error("EACCES: permission denied, open '/root/.df/credentials.json'")],
		});

		// Guessing a class for an unknown failure would burn the rest of the chain on the same bug.
		expect(run.result).toBe(
			`${AGENT_ERROR_PREFIX}: Unexpected failure executing df: ` +
				"EACCES: permission denied, open '/root/.df/credentials.json'",
		);
		expect(run.runs).toHaveLength(1);
	});

	test("a credential in an empty attempt's stderr is redacted before the notice is posted", async () => {
		const run = await runLadder({
			env: { GEMINI_API_KEY: "sk-live-0123456789abcdef" },
			invocations: [{ exitCode: 0, stdout: "", stderr: "no key: sk-live-0123456789abcdef" }],
			checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory" },
		});

		// The notice goes onto a public issue, so the credential the provider echoed back is replaced
		// while the account being run stays named.
		expect((run.result as Error).message).not.toContain("sk-live-0123456789abcdef");
		expect((run.result as Error).message).toContain("***");
		expect(postedComments(run.io)[0]).not.toContain("sk-live-0123456789abcdef");
	});
});

describe("when every account and model is out of quota", () => {
	const exhausted = (exitCode: number, stdout: string, stderr: string): CommandResult => ({ exitCode, stdout, stderr });

	test("df's exit code 2 checkpoints the run, blocks the item, and records the resume", async () => {
		const run = await runLadder({
			env: { GITHUB_RUN_ID: "17000000000" },
			invocations: [exhausted(2, '{"type":"error","message":"all candidates exhausted"}\n', "")],
			gitOutput: { "status --porcelain": " M src/pipeline/agent-prompt.ts" },
			checkpoint: {
				issueNumber: 42,
				repo: "marius-patrik/DarkFactory",
				branchName: "interpret-42",
				completedSteps: ["Read Request #42", "Classified as feature/agents"],
			},
		});

		// df's own summary comes first, the captured line is kept because it is not part of that summary,
		// and the exit code is translated last so the single quota check keeps deciding everything.
		expect(run.result).toBe(
			`${QUOTA_EXHAUSTED_NOTICE} across every harness and model (df): ` +
				'all candidates exhausted\n{"type":"error","message":"all candidates exhausted"}\n' +
				"df exit code 2: quota exhausted on every candidate in the chain",
		);
		// Handlers test for the notice prefix and then stop, so this must not read as a generic error.
		expect(String(run.result).startsWith(QUOTA_EXHAUSTED_NOTICE)).toBe(true);

		const checkpoint = loadCheckpoint(workspaceDir);
		expect(checkpoint).toMatchObject({
			issueNumber: 42,
			repo: "marius-patrik/DarkFactory",
			status: "Blocked",
			branchName: "interpret-42",
			completedSteps: ["Read Request #42", "Classified as feature/agents"],
		});

		// The work in flight is pushed before the person is told about it, so a resume has a branch.
		expect(
			run.workspace.calls.filter((call) => call.op === "git").map((call) => (call.args[0] as string[]).join(" ")),
		).toEqual([
			"add -A",
			"status --porcelain",
			"commit -m chore(ci): checkpoint progress on quota exhaustion",
			"push origin interpret-42",
		]);

		const comment = postedComments(run.io)[0] as string;
		expect(comment).toContain("### ⚠️ DarkFactory Agent Quota Exhaustion Notice");
		expect(comment).toContain("- [x] Classified as feature/agents");
		expect(comment).toContain("`interpret-42`");
		expect(comment).toContain("/df resume");

		expect(run.board).toEqual([{ number: 42, isPr: false, status: "Blocked" }]);

		// The resume sweep reads these two variables, so both have to name this run and this item.
		const runVariable = variablesOf(run, quotaRunVariable("17000000000"));
		expect(JSON.parse(runVariable as string)).toMatchObject({
			item: 42,
			isPr: false,
			blockedAt: "2026-09-15T12:00:00Z",
			// No provider named a reset, so the run resumes at the next Pacific midnight.
			resetAt: "2026-09-16T07:00:00Z",
		});
		expect(JSON.parse(variablesOf(run, QUOTA_PROVIDERS_VARIABLE) as string)).toMatchObject({ df: expect.any(Number) });
	});

	test("df's exit code 3 is an auth failure, which is never checkpointed and never blocked", async () => {
		const run = await runLadder({
			env: { GITHUB_RUN_ID: "17000000000" },
			invocations: [exhausted(3, '{"type":"error","message":"every candidate was rejected"}\n', "")],
			checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory", branchName: "interpret-42" },
		});

		expect(run.result).toBe(
			`${AUTH_FAILED_NOTICE} across every harness and model (df): ` +
				'every candidate was rejected\n{"type":"error","message":"every candidate was rejected"}\n' +
				"df exit code 3: authentication failed on every candidate in the chain",
		);
		// Resuming the same stale secrets would fail the same way, so there is nothing to resume.
		expect(run.board).toEqual([]);
		expect(operations(run.io)).not.toContain("changeLabels");
		expect(loadCheckpoint(workspaceDir)).toBeUndefined();
		expect(run.variables).toEqual([]);
	});

	test("a harness whose binary vanished between resolution and invocation moves to the next attempt", async () => {
		const run = await runLadder({
			env: { AGENT_HARNESS_CHAIN: "df,claude", CLAUDE_CODE_OAUTH_TOKEN: "tok-abcdefgh", HOME: workspaceDir },
			invocations: [
				new HarnessBinaryMissing("df"),
				{ exitCode: 0, stdout: "answered by the second harness\n", stderr: "" },
			],
		});

		expect(run.result).toBe("answered by the second harness");
		expect(run.reported.join("\n")).toContain("vanished between resolution and invocation");
	});

	test("a plain-text harness reporting a limit on stdout rotates rather than posting it as the reply", async () => {
		const run = await runLadder({
			env: {
				AGENT_HARNESS_CHAIN: "claude,gemini",
				CLAUDE_CODE_OAUTH_TOKEN: "tok-abcdefgh",
				GEMINI_API_KEY: "key-abcdefgh",
			},
			invocations: [
				{ exitCode: 0, stdout: "Error: 429 Too Many Requests\n", stderr: "" },
				{ exitCode: 0, stdout: "the real answer\n", stderr: "" },
			],
		});

		expect(run.result).toBe("the real answer");
		expect(run.runs.map((entry) => entry.argv[0])).toEqual(["claude", "gemini"]);
		expect(run.reported.join("\n")).toContain("Quota exhausted on claude/opus (reported on stdout)");
		expect(run.reported).toContain("Succeeded on gemini/gemini-3.8-flash after 1 exhausted attempt(s).");
	});

	test("the last attempt waits out a rate limit twice and then gives up, without rotating", async () => {
		const run = await runLadder({
			invocations: [{ exitCode: 1, stdout: "", stderr: "Error: 429 Too Many Requests" }],
			checkpoint: { issueNumber: 42, repo: "marius-patrik/DarkFactory" },
		});

		// One attempt, three invocations: the original plus the two retries the Python allowed.
		expect(run.runs).toHaveLength(3);
		expect(run.slept).toHaveLength(2);
		expect(run.slept[1]).toBeGreaterThan(run.slept[0] as number);
		expect(run.result).toBe(
			`${QUOTA_EXHAUSTED_NOTICE} across every harness and model (df): Error: 429 Too Many Requests`,
		);
		expect(run.board).toEqual([{ number: 42, isPr: false, status: "Blocked" }]);
	});

	test("an exhausted account rotates immediately rather than waiting", async () => {
		const run = await runLadder({
			env: {
				AGENT_HARNESS_CHAIN: "claude,gemini",
				CLAUDE_CODE_OAUTH_TOKEN: "tok-abcdefgh",
				CLAUDE_CODE_OAUTH_TOKEN_2: "tok-ijklmnop",
				GEMINI_API_KEY: "key-abcdefgh",
			},
			invocations: [
				{ exitCode: 1, stdout: "", stderr: "Error: 429 Too Many Requests" },
				{ exitCode: 0, stdout: "second account answered\n", stderr: "" },
			],
		});

		expect(run.result).toBe("second account answered");
		expect(run.slept).toEqual([]);
	});
});

describe("when the credential store cannot be reached", () => {
	test("an unreachable token endpoint skips the account instead of ending the run", async () => {
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async () => {
			throw new Error("connect ECONNREFUSED 10.0.0.1:443");
		}) as unknown as typeof fetch;
		try {
			const run = await runLadder({
				env: {
					AGENT_HARNESS_CHAIN: "antigravity,claude",
					ANTIGRAVITY_REFRESH_TOKEN: "refresh-abcdefgh",
					ANTIGRAVITY_CLIENT_ID: "client-abcdefgh",
					CLAUDE_CODE_OAUTH_TOKEN: "tok-abcdefgh",
					HOME: workspaceDir,
				},
				invocations: [{ exitCode: 0, stdout: "the static credential answered\n", stderr: "" }],
			});

			expect(run.reported.join("\n")).toContain(
				"Could not authenticate antigravity/gemini-3.8-flash-high: unexpected error during token refresh: " +
					"connect ECONNREFUSED",
			);
			// A stale or unreachable store on one account must not strand a healthy one.
			expect(run.result).toBe("the static credential answered");
			expect(run.runs.map((entry) => entry.argv[0])).toEqual(["claude"]);
		} finally {
			globalThis.fetch = realFetch;
		}
	});

	test("a rejected exchange is reported with the endpoint's own status", async () => {
		const realFetch = globalThis.fetch;
		globalThis.fetch = (async () =>
			new Response('{"error":"invalid_grant"}', { status: 400 })) as unknown as typeof fetch;
		try {
			const run = await runLadder({
				env: {
					AGENT_HARNESS_CHAIN: "antigravity",
					ANTIGRAVITY_REFRESH_TOKEN: "refresh-abcdefgh",
				},
				invocations: [{ exitCode: 0, stdout: "never reached\n", stderr: "" }],
			});

			expect(run.reported.join("\n")).toContain(
				'Could not authenticate antigravity/gemini-3.8-flash-high: token refresh failed (400): {"error":"invalid_grant"}',
			);
			// The endpoint was never reached, so nothing was spawned and nothing was reported as an
			// answer.
			expect(run.runs).toEqual([]);
			expect(run.result).toBe(
				`${QUOTA_EXHAUSTED_NOTICE} across every harness and model ` +
					"(antigravity/gemini-3.8-flash-high, antigravity/claude-opus-4-6-thinking): " +
					'token refresh failed (400): {"error":"invalid_grant"}',
			);
		} finally {
			globalThis.fetch = realFetch;
		}
	});
});

describe("the credential one attempt is handed", () => {
	test("a second account's key arrives under the first account's name and the first is cleared", async () => {
		const run = await runLadder({
			env: {
				AGENT_HARNESS_CHAIN: "claude",
				CLAUDE_CODE_OAUTH_TOKEN_2: "second-account-token",
				CLAUDE_CODE_OAUTH_TOKEN_3: "third-account-token",
			},
			invocations: [{ exitCode: 0, stdout: "answered\n", stderr: "" }],
		});

		const childEnv = run.runs[0]?.env as Record<string, string | undefined>;
		// The CLI only ever reads one name, so account two's secret has to arrive under it.
		expect(childEnv.CLAUDE_CODE_OAUTH_TOKEN).toBe("second-account-token");
		// No other account's secret may travel along: leaving one in place lets the CLI authenticate
		// with it and the rotation achieves nothing, silently.
		expect(childEnv.CLAUDE_CODE_OAUTH_TOKEN_2).toBeUndefined();
		expect(childEnv.CLAUDE_CODE_OAUTH_TOKEN_3).toBeUndefined();
		expect(childEnv.ANTHROPIC_API_KEY).toBeUndefined();
	});

	test("a subscription login is written from its secret and removed once the attempt is over", async () => {
		const loginPath = join(workspaceDir, ".codex", "auth.json");
		const run = await runLadder({
			env: {
				AGENT_HARNESS_CHAIN: "codex",
				CODEX_AUTH_JSON: '{"tokens":{"access_token":"abc"}}',
				OPENAI_API_KEY: "key-abcdefgh",
				HOME: workspaceDir,
			},
			invocations: [{ exitCode: 0, stdout: "answered\n", stderr: "" }],
		});

		expect(run.result).toBe("answered");
		// The file carried the secret while the CLI ran, and is gone now, so the secret is not left on
		// disk for the next thing in the container to read.
		expect(run.runs[0]?.argv[0]).toBe("codex");
		expect(run.runs[0]?.loginFile).toBe('{"tokens":{"access_token":"abc"}}');
		expect(existsSync(loginPath)).toBe(false);
	});
});

/** The value the ladder wrote to one repository variable. */
function variablesOf(run: LadderRun, name: string): string | undefined {
	return run.variables.find((entry) => entry.name === name)?.value;
}
