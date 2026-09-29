/**
 * Test doubles for the ported pipeline handlers.
 *
 * A handler's behaviour is the *order* of the GitHub calls it makes and the agent calls it makes
 * between them, so the doubles record both as one ordered list of operations. A handler can then be
 * called with a realistic comment body against a realistic issue and the test can read off what it
 * did, rather than asserting that a function exists.
 */

import type { AgentDispatchPayload } from "../../src/pipeline/dispatch.ts";
import {
	type AgentPromptRequest,
	type PipelineContext,
	pipelineContext,
	pipelineEnvironment,
} from "../../src/pipeline/handler-context.ts";
import type { ImplementContext } from "../../src/pipeline/implement.ts";
import type { AreaTaxonomy } from "../../src/pipeline/labels.ts";
import type {
	ClosingIssue,
	IssueCommentRow,
	IssueField,
	IssueView,
	PipelineIo,
	PrCreateInput,
	PrField,
	PrView,
} from "../../src/pipeline/pipeline-io.ts";
import type { VerificationResult, WorkspaceIo } from "../../src/pipeline/workspace-io.ts";

/** One recorded operation, in the order the handler performed it. */
interface RecordedCall {
	/** The `PipelineIo` method, or `agent` for the agent prompt runner. */
	op: string;
	/** The arguments it was called with. */
	args: unknown[];
}

/** A `PipelineIo` that records instead of talking to GitHub, with overridable behaviour. */
export interface RecordingIo extends PipelineIo {
	/** Every call made so far, in order. */
	readonly calls: RecordedCall[];
	/** The `PipelineIo` methods, with a recording wrapper for each. */
	readonly io: PipelineIo;
}

/** Per-operation behaviour: a value to return, or an `Error` to throw. */
interface IoBehaviour extends Partial<Record<keyof PipelineIo, unknown | Error>> {
	/**
	 * What `prNumbersForBranch` answers, one entry per call.
	 *
	 * A handler that opens a pull request probes for an existing one and then polls for the new one,
	 * so the two calls have to be able to disagree, and either can be an `Error` the port throws. An
	 * exhausted sequence answers empty, which is "no open pull request for this branch".
	 */
	prNumberSequence?: Array<number[] | Error>;
}

/** The issue a {@link RecordingIo} serves when a handler reads one. */
interface IssueFixture {
	/** The issue title. */
	title?: string;
	/** The issue body. */
	body?: string;
	/** The labels already on the issue. */
	labels?: Array<{ name?: string } | string>;
	/** The issue's comment bodies, oldest first. */
	comments?: string[];
	/** The comment ids GitHub would have assigned, in creation order. */
	commentIds?: number[];
	/** The parent of a sub-issue, when the handler asks for it. */
	parentIssue?: number;
}

const EMPTY_ISSUE: Required<IssueFixture> = {
	title: "",
	body: "",
	labels: [],
	comments: [],
	commentIds: [],
	parentIssue: 0,
};

/** The pull request a {@link RecordingIo} serves when a handler reads one. */
interface PullFixture {
	/** The pull request body. */
	body?: string;
	/** The pull request's comment bodies, oldest first. */
	comments?: string[];
	/** The issues the pull request closes. */
	closingIssues?: Array<{ number: number; labels?: Array<{ name?: string } | string>; title?: string }>;
	/** The branch carrying the work, served only when a handler asks for it. */
	headRefName?: string;
}

/** An empty pull request, with unread fields left out. */
function pullView(fixture: PullFixture, fields: readonly PrField[]): PrView {
	return {
		body: fields.includes("body") ? (fixture.body ?? "") : "",
		comments: fields.includes("comments") ? (fixture.comments ?? []) : [],
		closingIssues: fields.includes("closingIssues")
			? (fixture.closingIssues ?? []).map(
					(issue): ClosingIssue => ({
						number: issue.number,
						labels: issue.labels ?? [],
						title: issue.title ?? "",
					}),
				)
			: [],
		headRefName: fields.includes("headRefName") ? fixture.headRefName : undefined,
	};
}

/**
 * A recording `PipelineIo`.
 *
 * Every method returns a plausible empty value unless the caller supplies a fixture or an override,
 * and an override that is an `Error` is thrown. Handlers that must not reach a particular call
 * simply are not asserted on; the recording exists so a test can assert on the calls that were made.
 *
 * @param issues - Issues to serve by number, so a handler reading issue 7 and issue 3 gets each.
 * @param behaviour - Per-operation overrides, applied ahead of the issue fixtures.
 * @param pullRequests - Pull requests to serve by number.
 * @returns The recording port and its call log.
 */
export function recordingIo(
	issues: Record<number, IssueFixture> = {},
	behaviour: IoBehaviour = {},
	pullRequests: Record<number, PullFixture> = {},
): RecordingIo {
	const calls: RecordedCall[] = [];

	/** Reads an issue, preferring an explicit override so a test can inject a failure. */
	// `_repo` because the parameter exists to mirror `PipelineIo.issueView`, not to be read.
	const readIssue = (_repo: string, issue: number, fields: readonly IssueField[]): IssueView => {
		if (behaviour.issueView instanceof Error) throw behaviour.issueView;
		const fixture = { ...EMPTY_ISSUE, ...(issues[issue] ?? {}) };
		return {
			title: fixture.title,
			body: fixture.body,
			labels: fields.includes("labels") ? fixture.labels : [],
			comments: fields.includes("comments") ? fixture.comments : [],
			parentIssue: fields.includes("parent") && fixture.parentIssue ? fixture.parentIssue : undefined,
		};
	};

	/** Lists an issue's comments, pairing each body with the id GitHub assigned it. */
	const readComments = (_repo: string, issue: number): IssueCommentRow[] => {
		if (behaviour.issueComments instanceof Error) throw behaviour.issueComments;
		// A pull request's conversation comment *is* an issue comment, so a handler reading the
		// comments on a pull request is served from either fixture. The review and fix stages read
		// the pull request's own comments, and would otherwise see none.
		const fixture = { ...(pullRequests[issue] ?? {}), ...(issues[issue] ?? {}) } as PullFixture & IssueFixture;
		const bodies = fixture.comments ?? [];
		const ids = (fixture as IssueFixture).commentIds ?? bodies.map((_, index) => 1000 + index);
		return bodies.map((body, index) => ({ id: ids[index] ?? index, body }));
	};

	/** Records a call, then returns a configured value or throws a configured error. */
	function record<T>(op: keyof PipelineIo, args: unknown[], fallback: T): T {
		calls.push({ op, args });
		const configured = behaviour[op];
		if (configured instanceof Error) throw configured;
		return (configured === undefined ? fallback : configured) as T;
	}

	const io: PipelineIo = {
		issueView: async (repo, issue, fields) => {
			calls.push({ op: "issueView", args: [repo, issue, fields] });
			return readIssue(repo, issue, fields);
		},
		issueComments: async (repo, issue) => {
			calls.push({ op: "issueComments", args: [repo, issue] });
			return readComments(repo, issue);
		},
		addComment: async (repo, number, body) => {
			record("addComment", [repo, number, body], undefined);
		},
		changeLabels: async (repo, number, change) => {
			record("changeLabels", [repo, number, change], undefined);
		},
		prView: async (repo, pr, fields) => record("prView", [repo, pr, fields], pullView(pullRequests[pr] ?? {}, fields)),
		prDiff: async (repo, pr) => record("prDiff", [repo, pr], ""),
		prReady: async (repo, pr) => {
			record("prReady", [repo, pr], undefined);
		},
		prNumbersForBranch: async (repo, head, base) => {
			calls.push({ op: "prNumbersForBranch", args: [repo, head, base] });
			if (behaviour.prNumberSequence) {
				const next = behaviour.prNumberSequence.shift();
				if (next === undefined) return [];
				if (next instanceof Error) throw next;
				return next;
			}
			return record("prNumbersForBranch", [repo, head, base], [] as number[]);
		},
		prCreate: async (repo, input: PrCreateInput) => {
			record("prCreate", [repo, input], undefined);
		},
		runWorkflow: async (repo, workflow, inputs, ref) => {
			record("runWorkflow", [repo, workflow, inputs, ref], undefined);
		},
		dispatchAgentStage: async (repo, clientPayload: AgentDispatchPayload) => {
			record("dispatchAgentStage", [repo, clientPayload], undefined);
		},
	};

	return { ...io, calls, io };
}

/**
 * The taxonomy this repository declares in `repo.dfconfig`, in declaration order: the first area
 * whose keywords hit wins, so the specific areas come before the general ones.
 */
const DARKFACTORY_TAXONOMY: AreaTaxonomy = {
	defaultArea: "ci",
	areaKeywords: {
		agents: ["agent", "harness", "persona", "provider", "llm", "prompt", "approval", "model", "quota"],
		governance: ["governance", "rule", "protection", "policy", "board", "taxonomy", "label", "permission"],
		release: ["release", "version", "versioning", "tag", "semver", "changelog", "package", "artifact"],
		docs: ["doc", "docs", "documentation", "tsdoc", "typedoc", "content", "readme", "site"],
		ci: ["ci", "action", "workflow", "pipeline", "docker", "runner", "automation", "container"],
	},
};

/** The agent answers, and the prompts it was asked, from a {@link handlerContext}. */
interface AgentDouble {
	/** Every prompt request the handler made, in order. */
	readonly requests: AgentPromptRequest[];
	/** The text handed back for the nth call, or the last one once the list runs out. */
	answer(index: number): string;
}

/** What a {@link handlerContext} is built from. */
export interface HandlerContextOptions {
	/** The GitHub port to run against. */
	io: PipelineIo;
	/** The texts the agent answers with, in call order. */
	answers?: readonly string[];
	/** The repository slug; the handlers under test name one explicitly. */
	repo?: string;
	/** The branch pull requests open against; the repository declares `develop`. */
	developmentBranch?: string;
	/** The area taxonomy; the handlers classify with this. */
	taxonomy?: AreaTaxonomy;
	/** Collected instead of written, so a test can read what the run reported. */
	reported?: string[];
}

/** A handler context plus the doubles behind it. */
interface HandlerContextHandle {
	/** The context to hand a handler. */
	context: PipelineContext;
	/** The agent double, for asserting on prompts. */
	agent: AgentDouble;
	/** Every message the run reported, in order, on either stream. */
	reported: string[];
}

/**
 * A handler context wired to a recording port and a scripted agent.
 *
 * @param options - The port, the agent's answers, and the repository's declarations.
 * @returns The context and the doubles behind it.
 */
export function handlerContext(options: HandlerContextOptions): HandlerContextHandle {
	const answers = options.answers ?? [];
	const requests: AgentPromptRequest[] = [];
	const reported = options.reported ?? [];
	const agent: AgentDouble = {
		requests,
		answer: (index: number) => answers[index] ?? answers[answers.length - 1] ?? "",
	};
	const context = pipelineContext({
		io: options.io,
		runAgentPrompt: async (request) => {
			requests.push(request);
			return agent.answer(requests.length - 1);
		},
		taxonomy: options.taxonomy ?? DARKFACTORY_TAXONOMY,
		repo: options.repo ?? "marius-patrik/DarkFactory",
		developmentBranch: options.developmentBranch ?? "develop",
		env: { GITHUB_REPOSITORY: "marius-patrik/DarkFactory", GITHUB_WORKSPACE: "/workspace" },
		say: (message) => reported.push(message),
		warn: (message) => reported.push(message),
	});
	return { context, agent, reported };
}

/** The operation names on a recording, in the order they were performed. */
export function operations(recording: RecordingIo): string[] {
	return recording.calls.map((call) => call.op);
}

/** The bodies of every comment a handler posted, in order. */
export function postedComments(recording: RecordingIo): string[] {
	return recording.calls.filter((call) => call.op === "addComment").map((call) => call.args[2] as string);
}

/** The label changes a handler made, in order, as `{ number, labels, add }`. */
export function labelChanges(
	recording: RecordingIo,
): Array<{ number: number; labels: readonly string[]; add: boolean }> {
	return recording.calls
		.filter((call) => call.op === "changeLabels")
		.map((call) => {
			const change = call.args[2] as { labels: readonly string[]; add: boolean };
			return { number: call.args[1] as number, labels: change.labels, add: change.add };
		});
}

/** A `WorkspaceIo` that records instead of touching a working copy, with overridable behaviour. */
export interface RecordingWorkspace extends WorkspaceIo {
	/** Every call made so far, in order. */
	readonly calls: RecordedCall[];
	/** The `WorkspaceIo` methods, with a recording wrapper for each. */
	readonly io: WorkspaceIo;
}

/** What a {@link recordingWorkspace} does when a handler asks it to do something. */
export interface WorkspaceBehaviour {
	/**
	 * Standard output per git invocation, keyed by the arguments joined with a space.
	 *
	 * A git call with no entry returns an empty string, which is what a command that prints nothing
	 * returns; the keys that matter are the ones a handler branches on, such as `branch -r` and
	 * `status --porcelain`.
	 */
	gitOutput?: Record<string, string>;
	/** Git stderr per invocation, keyed the same way; the call throws with this as its message. */
	gitError?: Record<string, string>;
	/** Notices the git identity configuration reports, as it does for a read-only `$HOME`. */
	identityNotices?: string[];
	/** Notices the formatter pass reports, as it does for a formatter that ran and failed. */
	formatNotices?: string[];
	/** The names the formatter pass reports as having run. */
	formattersRan?: string[];
	/** The test-suite result. Defaults to a passing `bun test` run. */
	verification?: VerificationResult;
	/** The refs `resolveBaseRefs` finds; the first is the one a diff is taken against. */
	baseRefs?: string[];
	/** The message `resolveBaseRefs` throws, naming the base it could not resolve. */
	baseRefsError?: string;
	/**
	 * What `removePath` finds at a path, as `"file"`, `"directory"` or `undefined`.
	 *
	 * Keyed by the path, and `undefined` is a real answer - the Python's `os.path.isfile` and
	 * `os.path.isdir` both say no, and the caller then reaches for no git command at all.
	 */
	removedPaths?: Record<string, "file" | "directory">;
}

/** A passing `bun test` run, the result a repository with a working suite produces. */
const PASSING_SUITE: VerificationResult = {
	args: ["bun", "run", "test"],
	returncode: 0,
	stdout: "1970 pass\n0 fail",
	stderr: "",
};

/** The key a git invocation is looked up under in {@link WorkspaceBehaviour}. */
function gitKey(args: readonly string[]): string {
	return args.join(" ");
}

/**
 * A recording `WorkspaceIo`.
 *
 * Every git call is looked up in {@link WorkspaceBehaviour.gitOutput} by its joined arguments, so a
 * test states the repository's state - "this branch exists on the remote", "there are staged
 * changes" - rather than a script of calls. The calls are still recorded in order, so the sequence
 * remains assertable.
 *
 * @param behaviour - What git prints, what fails, and what the suites return.
 * @returns The recording workspace and its call log.
 */
export function recordingWorkspace(behaviour: WorkspaceBehaviour = {}): RecordingWorkspace {
	const calls: RecordedCall[] = [];
	const record = <T>(op: string, args: unknown[], fallback: T): T => {
		calls.push({ op, args });
		return fallback;
	};

	const git = (args: readonly string[]): string => {
		const key = gitKey(args);
		record("git", [args], "");
		const failure = behaviour.gitError?.[key];
		if (failure !== undefined) throw new Error(failure);
		return behaviour.gitOutput?.[key] ?? "";
	};

	const io: WorkspaceIo = {
		configureGitIdentity: () => record("configureGitIdentity", [], behaviour.identityNotices ?? []),
		git,
		removePath: (path) => {
			record("removePath", [path], behaviour.removedPaths?.[path]);
			return behaviour.removedPaths?.[path];
		},
		resolveBaseRefs: (base) => {
			record("resolveBaseRefs", [base], behaviour.baseRefs ?? [`origin/${base}...HEAD`]);
			if (behaviour.baseRefsError !== undefined) throw new Error(behaviour.baseRefsError);
			return behaviour.baseRefs ?? [`origin/${base}...HEAD`];
		},
		formatRepository: () =>
			record("formatRepository", [], { ran: behaviour.formattersRan ?? [], notices: behaviour.formatNotices ?? [] }),
		verifyRepository: () => record("verifyRepository", [], behaviour.verification ?? PASSING_SUITE),
		sleep: async (ms) => {
			record("sleep", [ms], undefined);
		},
	};

	return { ...io, calls, io };
}

/** What an {@link implementContext} is built from. */
interface ImplementContextOptions extends HandlerContextOptions {
	/** The working copy double. */
	workspace: RecordingWorkspace;
	/** Board moves the handler made, as `{ number, isPr, status }`. */
	board?: Array<{ number: number; isPr: boolean; status: string }>;
	/**
	 * The directory the checkpoint is read from.
	 *
	 * A real directory, because the checkpoint is a file: "a run that left no checkpoint" and "a run
	 * that left a checkpoint naming the steps it completed" are different states of the same
	 * filesystem, and a double that returns either on demand would not say which one the handler
	 * reads.
	 */
	workspaceDir?: string;
}

/** An {@link ImplementContext} plus the doubles behind it. */
interface ImplementContextHandle extends HandlerContextHandle {
	/** The context to hand `handleImplement`. */
	implementContext: ImplementContext;
	/** Board moves, recorded through the injected board port. */
	board: Array<{ number: number; isPr: boolean; status: string }>;
}

/**
 * An `ImplementContext` wired to a recording port, a recording workspace and a scripted agent.
 *
 * @param options - The port, the workspace, the agent's answers, and the repository's declarations.
 * @returns The context and the doubles behind it.
 */
export function implementContext(options: ImplementContextOptions): ImplementContextHandle {
	const base = handlerContext(options);
	const board = options.board ?? [];
	return {
		...base,
		board,
		implementContext: {
			...base.context,
			workspace: options.workspace.io,
			board: (entity, status) => {
				board.push({ ...entity, status });
			},
			environment: pipelineEnvironment({ GITHUB_WORKSPACE: options.workspaceDir ?? "/workspace" }),
		},
	};
}

/** The operation names on a recording workspace, in the order they were performed. */
export function workspaceOperations(recording: RecordingWorkspace): string[] {
	return recording.calls.map((call) => call.op);
}

/** The git arguments a recording workspace saw, in order, each joined into a command line. */
export function gitCommands(recording: RecordingWorkspace): string[] {
	return recording.calls
		.filter((call) => call.op === "git")
		.map((call) => (call.args[0] as readonly string[]).join(" "));
}
