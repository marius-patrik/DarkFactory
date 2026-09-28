import { describe, expect, test } from "bun:test";
import { pipelineEnvironment } from "../../src/pipeline/handler-context.ts";
import {
	parseRunnerArgs,
	RUNNER_COMMANDS,
	type RunnerArgs,
	type RunnerPorts,
	runCommand,
	runnerMain,
} from "../../src/pipeline/main.ts";
import { reviewDigest } from "../../src/pipeline/review-convergence.ts";
import { AGENT_ERROR_PREFIX } from "../../src/pipeline/signals.ts";
import {
	handlerContext,
	operations,
	postedComments,
	recordingIo,
	recordingWorkspace,
	type WorkspaceBehaviour,
	workspaceOperations,
} from "./handlers.ts";

const REPO = "marius-patrik/DarkFactory";
const ISSUE = 1148;
const PLAN = 1150;
const PR = 1160;

/** A plan whose file scope the deterministic gate can decide on, for the stages that read one. */
const PLAN_BODY = [
	"### Implementation Plan",
	"",
	"## File Scope",
	"- `packages/harness/src/pipeline/plan-scope.ts`",
	"",
	"## Verification",
	"Run the suite.",
].join("\n");

/** A pull request carrying the work, so the stages that check one out have a branch to name. */
const PULL = { body: "", comments: [], headRefName: "fix/scope-gate" };

/** The event an `issues`-labelled event carries, so `dispatch` has something to route. */
const EVENT_PAYLOAD = { action: "labeled", issue: { number: ISSUE, labels: [{ name: "Interpret" }] } };

/** The one finding a self-review posts, in the marker form the fix stage reads back. */
const FINDING = "`checkScope` never excludes test files.";

/** The review comment iteration 1 left behind, exactly as the review stage posts it. */
const FINDINGS_COMMENT = [
	"### Self-Review — iteration 1",
	`1. ${FINDING}`,
	`<!-- darkfactory-self-review iteration=1 findings=1 digest=${reviewDigest([FINDING])} -->`,
].join("\n");

/** What a test can see of the run the entry point made. */
interface RunnerHandle {
	/** The ports, so a test can read what the run did through them. */
	ports: RunnerPorts;
	/** Every line the run reported, on either stream, in order. */
	reported: string[];
	/** The agent's answers, and the requests it was given, for asserting on routing. */
	agent: ReturnType<typeof handlerContext>["agent"];
	/** Board moves, in order. */
	board: Array<{ number: number; isPr: boolean; status: string }>;
	/** The recording GitHub port. */
	recording: ReturnType<typeof recordingIo>;
	/** The recording working copy. */
	workspace: ReturnType<typeof recordingWorkspace>;
	/** What each stage dispatch was handed, in order. */
	stageCalls: unknown[];
}

/** What a test tells the assembled ports to do differently. */
interface RunnerOptions {
	/** The agent's answers, in call order. */
	answers?: readonly string[];
	/** The issues the port serves, keyed by number. */
	issues?: Parameters<typeof recordingIo>[0];
	/** The pull requests the port serves, keyed by number. */
	pulls?: Parameters<typeof recordingIo>[2];
	/** The event payload the `dispatch` branch reads, or `undefined` for a file that is not there. */
	event?: unknown;
	/** Runs instead of the account setup, so a test can make the setup fail. */
	setupAccounts?: () => Promise<void>;
	/** The environment the run reads. */
	env?: Record<string, string | undefined>;
	/** What the working copy's `git` prints, keyed by the joined arguments. */
	workspaceGit?: WorkspaceBehaviour["gitOutput"];
	/** The base references the working copy resolves. */
	workspaceBaseRefs?: string[];
}

/**
 * The ports a command runs against, wired to recording doubles.
 *
 * The entry point assembles real ones; a test supplies these so the command surface can be proved
 * without a GitHub token or a working copy, which is the whole point of testing routing rather than
 * each body's behaviour - the bodies have their own tests.
 */
function ports(options: RunnerOptions = {}): RunnerHandle {
	const recording = recordingIo(options.issues ?? {}, {}, options.pulls ?? { [PR]: PULL });
	const workspace = recordingWorkspace({
		baseRefs: options.workspaceBaseRefs,
		gitOutput: options.workspaceGit,
	});
	const base = handlerContext({
		io: recording.io,
		answers: options.answers ?? ["An answer."],
		repo: REPO,
		developmentBranch: "develop",
	});
	const board: RunnerHandle["board"] = [];
	const reported = base.reported;
	const stageCalls: unknown[] = [];
	const stage = async (payload: unknown): Promise<void> => {
		stageCalls.push(payload);
	};

	return {
		recording,
		workspace,
		agent: base.agent,
		board,
		reported,
		stageCalls,
		ports: {
			io: recording.io,
			board: (entity, status) => {
				board.push({ ...entity, status });
			},
			workspace: workspace.io,
			env: options.env ?? { GITHUB_REPOSITORY: REPO },
			environment: pipelineEnvironment({ GITHUB_REPOSITORY: REPO }),
			runAgentPrompt: base.context.runAgentPrompt,
			stages: {
				selfReview: stage,
				selfReviewFix: stage,
				prFeedbackFix: stage,
				resume: stage,
			},
			taxonomy: base.context.taxonomy,
			developmentBranch: "develop",
			repo: REPO,
			say: (message) => reported.push(message),
			warn: (message) => reported.push(message),
			readEvent: () => options.event,
			setupAccounts: options.setupAccounts ?? (async () => undefined),
			settle: async () => undefined,
		},
	};
}

/** The parsed surface for an invocation, with the environment the workflows set. */
function surface(argv: readonly string[]): Promise<RunnerArgs> {
	return parseRunnerArgs(argv, { env: { GITHUB_REPOSITORY: REPO } });
}

describe("the command surface: every command is reachable and reaches its own body", () => {
	test("dispatch runs on a bare invocation and routes an event", async () => {
		// The event workflows name no command at all. If the default moved, every event would reach
		// a body that expects flags the workflow does not pass.
		const args = await surface([]);
		expect(args.command).toBe("dispatch");

		const handle = ports({
			event: { action: "agent-dispatch", client_payload: { stage: "self-review", pr: PR, plan: PLAN } },
			env: { GITHUB_REPOSITORY: REPO, GITHUB_EVENT_NAME: "repository_dispatch", GITHUB_EVENT_PATH: "/e.json" },
		});
		const outcome = await runCommand(args, handle.ports);

		expect(outcome).toEqual({ kind: "ran", command: "dispatch" });
		// Routed to a stage dispatch rather than run inline, which is what the Python did: each
		// iteration is its own workflow run.
		expect(handle.stageCalls).toEqual([{ stage: "self-review", pr: PR, plan: PLAN, iteration: 1 }]);
	});

	test("dispatch reads the event name and path from the environment, as the workflows set them", async () => {
		const handle = ports({ event: undefined, env: { GITHUB_REPOSITORY: REPO } });
		await runCommand(await surface(["dispatch"]), handle.ports);

		// An unset `GITHUB_EVENT_PATH` is the empty string, which is a path that is not there - not
		// the current directory, and not a crash.
		expect(handle.reported.some((line) => line.includes("Event path") && line.includes("not found"))).toBe(true);
	});

	test("interpret classifies and then interprets the issue it was given", async () => {
		const handle = ports({ issues: { [ISSUE]: { body: "Please port main." } } });
		const outcome = await runCommand(await surface(["interpret", "--issue", String(ISSUE)]), handle.ports);

		expect(outcome).toEqual({ kind: "ran", command: "interpret" });
		expect(handle.agent.requests[0]?.kind).toBe("classify");
		expect(handle.agent.requests[0]?.prompt).toContain("Please port main.");
		expect(postedComments(handle.recording).join("\n")).toContain("DarkFactory Agent Interpretation");
	});

	test("plan posts a plan on the plan issue, naming the parent Request", async () => {
		const handle = ports({ issues: { [PLAN]: { body: PLAN_BODY } } });
		const outcome = await runCommand(
			await surface(["plan", "--request-issue", String(ISSUE), "--plan-issue", String(PLAN)]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "plan" });
		expect(handle.agent.requests[0]?.kind).toBe("plan");
		const posted = postedComments(handle.recording).join("\n");
		expect(posted).toContain("Implementation Plan (Autogenerated by the DarkFactory Agent)");
		expect(posted).toContain(`- **Parent Request**: #${ISSUE}`);
		expect(handle.recording.calls.at(-1)?.args[1]).toBe(PLAN);
	});

	test("implement works the branch and asks for a pull request against it", async () => {
		const handle = ports({ issues: { [PLAN]: { body: PLAN_BODY } } });
		const outcome = await runCommand(
			await surface(["implement", "--plan-issue", String(PLAN), "--request-issue", String(ISSUE)]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "implement" });
		expect(handle.agent.requests[0]?.kind).toBe("implement");
		expect(operations(handle.recording)).toContain("prNumbersForBranch");
		expect(workspaceOperations(handle.workspace)).toContain("git");
	});

	test("self-review reads the pull request's diff and reviews it", async () => {
		const handle = ports({
			issues: { [PLAN]: { body: PLAN_BODY } },
			pulls: { [PR]: PULL },
			answers: ["NO_FINDINGS"],
		});
		const outcome = await runCommand(
			await surface(["self-review", "--pr-number", String(PR), "--plan-issue", String(PLAN)]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "self-review" });
		expect(operations(handle.recording)).toContain("prDiff");
		expect(handle.agent.requests[0]?.kind).toBe("review");
		// The Plan's scope travelled with the review prompt, so this is the review body and not the
		// plan-alignment gate - which asks for the same `review` kind.
		expect(handle.agent.requests[0]?.prompt).toContain("packages/harness/src/pipeline/plan-scope.ts");
	});

	test("self-review-fix applies the findings the review left on the pull request", async () => {
		const handle = ports({
			issues: { [PLAN]: { body: PLAN_BODY } },
			pulls: { [PR]: { ...PULL, comments: [FINDINGS_COMMENT] } },
			answers: ["Fixed the finding."],
			workspaceGit: {
				"rev-parse HEAD": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
				"status --porcelain": ` M packages/harness/src/pipeline/plan-scope.ts`,
			},
			workspaceBaseRefs: ["origin/develop...HEAD", "origin/develop"],
		});
		const outcome = await runCommand(
			await surface([
				"self-review-fix",
				"--pr-number",
				String(PR),
				"--plan-issue",
				String(PLAN),
				"--request-issue",
				String(ISSUE),
			]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "self-review-fix" });
		expect(handle.agent.requests[0]?.kind).toBe("fix");
		expect(handle.agent.requests[0]?.prompt).toContain(FINDING);
		expect(workspaceOperations(handle.workspace)).toContain("git");
	});

	test("plan-alignment reads the diff and posts the alignment verdict", async () => {
		const handle = ports({
			issues: { [PLAN]: { body: PLAN_BODY } },
			pulls: { [PR]: PULL },
			answers: ["MATCHES_PLAN_YES"],
		});
		const outcome = await runCommand(
			await surface([
				"plan-alignment",
				"--pr-number",
				String(PR),
				"--plan-issue",
				String(PLAN),
				"--request-issue",
				String(ISSUE),
			]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "plan-alignment" });
		expect(handle.agent.requests[0]?.kind).toBe("review");
		expect(operations(handle.recording)).toContain("prDiff");
		expect(postedComments(handle.recording).join("\n")).toContain("### Implementation Review");
	});

	test("respond answers the comment, carrying its text", async () => {
		const handle = ports({ answers: ["It needed the guard back."] });
		const outcome = await runCommand(
			await surface(["respond", "--issue", String(ISSUE), "--comment", "Why did the guard go?"]),
			handle.ports,
		);

		expect(outcome).toEqual({ kind: "ran", command: "respond" });
		expect(handle.agent.requests[0]?.kind).toBe("chat");
		expect(handle.agent.requests[0]?.prompt).toContain("Why did the guard go?");
		expect(handle.agent.requests[0]?.checkpoint?.isPr).toBe(false);
	});

	test("respond on a pull request carries --is-pr into the checkpoint", async () => {
		const handle = ports({ answers: ["Renamed."] });
		await runCommand(
			await surface(["respond", "--issue", String(PR), "--comment", "rename this", "--is-pr"]),
			handle.ports,
		);

		expect(handle.agent.requests[0]?.checkpoint?.isPr).toBe(true);
	});

	test("token-refresh reports the account setup it already performed, and reaches no handler", async () => {
		const handle = ports();
		const outcome = await runCommand(await surface(["token-refresh"]), handle.ports);

		expect(outcome).toEqual({ kind: "ran", command: "token-refresh" });
		expect(handle.reported).toContain("df account setup completed successfully.");
		expect(handle.agent.requests).toEqual([]);
		expect(operations(handle.recording)).toEqual([]);
	});

	test("every declared command has an invocation that reaches a body", async () => {
		// A command added to the surface without a branch would be silently unreachable, which is the
		// one thing this module exists to prevent.
		const invocations: Record<string, string[]> = {
			dispatch: [],
			interpret: ["--issue", String(ISSUE)],
			plan: ["--request-issue", String(ISSUE), "--plan-issue", String(PLAN)],
			implement: ["--plan-issue", String(PLAN), "--request-issue", String(ISSUE)],
			"self-review": ["--pr-number", String(PR), "--plan-issue", String(PLAN)],
			"self-review-fix": ["--pr-number", String(PR), "--plan-issue", String(PLAN), "--request-issue", String(ISSUE)],
			"plan-alignment": ["--pr-number", String(PR), "--plan-issue", String(PLAN), "--request-issue", String(ISSUE)],
			respond: ["--issue", String(ISSUE)],
			"token-refresh": [],
		};

		expect(Object.keys(invocations).sort()).toEqual([...RUNNER_COMMANDS].sort());
		for (const command of RUNNER_COMMANDS) {
			const handle = ports({
				issues: { [ISSUE]: { body: "Please port main." }, [PLAN]: { body: PLAN_BODY } },
				pulls: { [PR]: { ...PULL, comments: [FINDINGS_COMMENT] } },
				event: EVENT_PAYLOAD,
				answers: ["NO_FINDINGS"],
				workspaceGit: { "rev-parse HEAD": "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678" },
				workspaceBaseRefs: ["origin/develop...HEAD", "origin/develop"],
			});
			const outcome = await runCommand(await surface([command, ...(invocations[command] as string[])]), handle.ports);
			expect({ command, outcome: outcome.kind }).toEqual({ command, outcome: "ran" });
		}
	});
});

describe("the command surface: what the flags mean", () => {
	test("--repo defaults to GITHUB_REPOSITORY", async () => {
		expect((await surface(["dispatch"])).repo).toBe(REPO);
	});

	test("--repo overrides the environment", async () => {
		expect((await surface(["dispatch", "--repo", "other/project"])).repo).toBe("other/project");
	});

	test("--iteration defaults to the first review", async () => {
		expect((await surface(["dispatch"])).iteration).toBe(1);
	});

	test("--iteration is carried to the stage that uses it", async () => {
		expect((await surface(["self-review", "--iteration", "3"])).iteration).toBe(3);
	});

	test("--is-pr is absent unless the flag was given", async () => {
		expect((await surface(["respond"])).isPr).toBe(false);
		expect((await surface(["respond", "--is-pr"])).isPr).toBe(true);
	});

	test("an absent --comment reads as empty, which is the one call site's own default", async () => {
		expect((await surface(["respond"])).comment).toBe("");
	});

	test("both --flag value and --flag=value are accepted", async () => {
		expect((await surface(["respond", "--comment", "a"])).comment).toBe("a");
		expect((await surface(["respond", "--comment=b"])).comment).toBe("b");
		expect((await surface(["respond", "--issue=42"])).issue).toBe(42);
	});

	test("a flag's value may look like an option, because argparse took it unconditionally", async () => {
		expect((await surface(["respond", "--comment", "-1"])).comment).toBe("-1");
	});

	test("a self-review naming no Request still runs, on its Plan's terms", async () => {
		// The Python's `args.request_issue or args.plan_issue`. A self-review is still reviewable
		// against its Plan alone, so this is the difference between running and falling through.
		const handle = ports({
			issues: { [PLAN]: { body: PLAN_BODY } },
			pulls: { [PR]: PULL },
			answers: ["NO_FINDINGS", "MATCHES_PLAN_YES"],
		});
		const outcome = await runCommand(
			await surface(["self-review", "--pr-number", String(PR), "--plan-issue", String(PLAN)]),
			handle.ports,
		);

		expect(outcome.kind).toBe("ran");
		// The clean review delegates to plan alignment, and the verdict is posted on the Request the
		// substitution supplied. An `undefined` there would have posted nowhere, which is the
		// difference between substituting the Plan and not.
		expect(postedComments(handle.recording).join("\n")).toContain("### Implementation Review");
		expect(handle.recording.calls.at(-1)?.args[1]).toBe(PLAN);
	});
});

describe("the command surface: a rejected invocation", () => {
	test("an unknown command is rejected, listing the nine", async () => {
		const handle = ports();
		const status = await runnerMain(["nosuch"], { ports: handle.ports, warn: () => undefined });

		expect(status).toBe(2);
		expect(operations(handle.recording)).toEqual([]);
	});

	test("an unknown flag is rejected", async () => {
		await expect(surface(["dispatch", "--nope", "1"])).rejects.toThrow("unrecognized arguments: --nope");
	});

	test("a non-integer where a number is required is rejected", async () => {
		await expect(surface(["interpret", "--issue", "twelve"])).rejects.toThrow("invalid int value: 'twelve'");
	});

	test("a flag missing its value is rejected", async () => {
		await expect(surface(["respond", "--comment"])).rejects.toThrow("expected one argument");
	});

	test("a second positional is rejected", async () => {
		await expect(surface(["dispatch", "interpret"])).rejects.toThrow("unrecognized arguments: interpret");
	});
});

describe("a required flag that is absent is a no-op, exactly as it was", () => {
	test("the fall-through is reported as a skip, not as a run and not as a failure", async () => {
		// The Python's chain simply ended: no branch matched, the function returned, the process
		// exited 0. Reading that as "ran" would claim a stage happened; reading it as a failure would
		// file noise on every stage with nothing to name.
		const handle = ports();
		const outcome = await runCommand(await surface(["interpret"]), handle.ports);

		expect(outcome).toEqual({ kind: "skipped", command: "interpret" });
	});

	test("interpret without --issue reaches no body and does not fail", async () => {
		const handle = ports();
		const status = await runnerMain(["interpret"], { ports: handle.ports });

		expect(status).toBe(0);
		expect(operations(handle.recording)).toEqual([]);
		expect(handle.agent.requests).toEqual([]);
	});

	test("each guarded command without its flags reaches no body", async () => {
		const commands = [
			["interpret"],
			["plan", "--request-issue", String(ISSUE)],
			["implement", "--plan-issue", String(PLAN)],
			["self-review", "--pr-number", String(PR)],
			["self-review-fix", "--pr-number", String(PR), "--plan-issue", String(PLAN)],
			["plan-alignment", "--pr-number", String(PR), "--plan-issue", String(PLAN)],
			["respond"],
		];

		for (const argv of commands) {
			const handle = ports();
			const status = await runnerMain(argv, { ports: handle.ports });
			expect({ argv: argv.join(" "), status, reached: operations(handle.recording) }).toEqual({
				argv: argv.join(" "),
				status: 0,
				reached: [],
			});
		}
	});

	test("a flag of zero is absent, because the guards read truthiness rather than presence", async () => {
		// `--issue 0` names no issue on GitHub, and the Python's `args.command == "interpret" and
		// args.issue` treated it as absent. Reporting an error here would be a new behaviour.
		const handle = ports();
		const status = await runnerMain(["interpret", "--issue", "0"], { ports: handle.ports });

		expect(status).toBe(0);
		expect(operations(handle.recording)).toEqual([]);
	});
});

describe("account setup never stops the command", () => {
	test("a setup failure is a notice and the command still runs", async () => {
		const handle = ports({
			answers: ["An answer."],
			setupAccounts: async () => {
				throw new Error("df is not installed");
			},
		});
		const status = await runnerMain(["interpret", "--issue", String(ISSUE)], {
			ports: handle.ports,
			env: { GITHUB_REPOSITORY: REPO },
		});

		expect(status).toBe(0);
		expect(handle.reported).toContain("df setup notice: df is not installed");
		expect(postedComments(handle.recording).join("\n")).toContain("DarkFactory Agent Interpretation");
	});

	test("a setup failure does not stop token-refresh either, which still reports it ran", async () => {
		// The Python printed the success line after the `try`/`except`, so a failed setup reported
		// success. That is preserved here rather than corrected: it is the token-refresh contract.
		const handle = ports({
			setupAccounts: async () => {
				throw new Error("df is not installed");
			},
		});
		const status = await runnerMain(["token-refresh"], { ports: handle.ports });

		expect(status).toBe(0);
		expect(handle.reported).toContain("df setup notice: df is not installed");
		expect(handle.reported).toContain("df account setup completed successfully.");
	});

	test("the setup runs before the command, not after it", async () => {
		const order: string[] = [];
		const handle = ports({
			setupAccounts: async () => {
				order.push("setup");
			},
			answers: ["An answer."],
		});
		handle.ports.runAgentPrompt = async () => {
			order.push("agent");
			return "An answer.";
		};
		await runnerMain(["interpret", "--issue", String(ISSUE)], { ports: handle.ports });

		expect(order).toEqual(["setup", "agent"]);
	});
});

describe("the exit status is the entry point's alone", () => {
	test("a posted [Execution Error] ends the process non-zero", async () => {
		// The failure this exists for. The comment goes out, `context.fail` throws, and the process
		// used to return normally - so the container exited 0 and the failure reporter saw a success
		// and filed nothing at all.
		const handle = ports({
			issues: { [ISSUE]: { body: "Please port main." } },
			answers: [`${AGENT_ERROR_PREFIX}: the agent produced nothing`],
		});

		const status = await runnerMain(["interpret", "--issue", String(ISSUE)], {
			ports: handle.ports,
			env: { GITHUB_REPOSITORY: REPO },
		});

		expect(status).toBe(1);
		const posted = postedComments(handle.recording);
		expect(posted.join("\n")).toContain("DarkFactory Agent Execution Error");
		// The notice went out on the issue the run was working, which is what the reporter reads.
		expect(handle.recording.calls.at(-1)?.args[1]).toBe(ISSUE);
	});

	test("a run that completes still exits zero", async () => {
		const handle = ports({ issues: { [ISSUE]: { body: "Please port main." } } });
		const status = await runnerMain(["interpret", "--issue", String(ISSUE)], {
			ports: handle.ports,
			env: { GITHUB_REPOSITORY: REPO },
		});

		expect(status).toBe(0);
	});

	test("a failure thrown outside a posted notice is still non-zero", async () => {
		// Anything that escapes the command is a failed run, and the Python's traceback exited 1.
		const handle = ports();
		handle.ports.readEvent = () => {
			throw new Error("event file is not JSON");
		};
		const reported: string[] = [];
		const status = await runnerMain(["dispatch"], {
			ports: handle.ports,
			env: { GITHUB_REPOSITORY: REPO, GITHUB_EVENT_PATH: "/nowhere/event.json" },
			warn: (message) => reported.push(message),
		});

		expect(status).toBe(1);
		expect(reported.join("\n")).toContain("event file is not JSON");
	});

	test("a board write a failing run started still lands before the process exits", async () => {
		// The Python's `block_entity` was a synchronous call, so an item blocked on the way out was
		// blocked before the process exited. Now that the write is asynchronous, not waiting for it
		// would lose exactly the write that matters most.
		const handle = ports({
			issues: { [ISSUE]: { body: "Please port main." } },
			answers: [`${AGENT_ERROR_PREFIX}: the agent produced nothing`],
		});
		let settled = false;
		handle.ports.settle = async () => {
			await new Promise<void>((resolve) => setTimeout(resolve, 1));
			settled = true;
		};

		const status = await runnerMain(["interpret", "--issue", String(ISSUE)], { ports: handle.ports });

		expect(status).toBe(1);
		expect(settled).toBe(true);
	});
});

describe("dispatch reads the event the workflow wrote", () => {
	test("an event that is not there is reported and reaches nothing", async () => {
		const handle = ports({ event: undefined });
		const outcome = await runCommand(await surface(["dispatch"]), handle.ports);

		expect(outcome).toEqual({ kind: "ran", command: "dispatch" });
		expect(handle.reported.some((line) => line.includes("Event path") && line.includes("not found"))).toBe(true);
		expect(operations(handle.recording)).toEqual([]);
	});
});
