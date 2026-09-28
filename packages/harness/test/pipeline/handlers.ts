/**
 * Test doubles for the ported pipeline handlers.
 *
 * A handler's behaviour is the *order* of the GitHub calls it makes and the agent calls it makes
 * between them, so the doubles record both as one ordered list of operations. A handler can then be
 * called with a realistic comment body against a realistic issue and the test can read off what it
 * did, rather than asserting that a function exists.
 */

import type { AgentDispatchPayload } from "../../src/pipeline/dispatch.ts";
import { type AgentPromptRequest, type PipelineContext, pipelineContext } from "../../src/pipeline/handler-context.ts";
import type { AreaTaxonomy } from "../../src/pipeline/labels.ts";
import type {
	IssueCommentRow,
	IssueField,
	IssueView,
	PipelineIo,
	PrCreateInput,
} from "../../src/pipeline/pipeline-io.ts";

/** One recorded operation, in the order the handler performed it. */
export interface RecordedCall {
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
export type IoBehaviour = Partial<Record<keyof PipelineIo, unknown | Error>>;

/** The issue a {@link RecordingIo} serves when a handler reads one. */
export interface IssueFixture {
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
}

const EMPTY_ISSUE: Required<IssueFixture> = { title: "", body: "", labels: [], comments: [], commentIds: [] };

/**
 * A recording `PipelineIo`.
 *
 * Every method returns a plausible empty value unless the caller supplies a fixture or an override,
 * and an override that is an `Error` is thrown. Handlers that must not reach a particular call
 * simply are not asserted on; the recording exists so a test can assert on the calls that were made.
 *
 * @param issues - Issues to serve by number, so a handler reading issue 7 and issue 3 gets each.
 * @param behaviour - Per-operation overrides, applied ahead of the issue fixtures.
 * @returns The recording port and its call log.
 */
export function recordingIo(issues: Record<number, IssueFixture> = {}, behaviour: IoBehaviour = {}): RecordingIo {
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
		};
	};

	/** Lists an issue's comments, pairing each body with the id GitHub assigned it. */
	const readComments = (_repo: string, issue: number): IssueCommentRow[] => {
		if (behaviour.issueComments instanceof Error) throw behaviour.issueComments;
		const fixture = issues[issue] ?? EMPTY_ISSUE;
		const ids = fixture.commentIds ?? (fixture.comments ?? []).map((_, index) => 1000 + index);
		return (fixture.comments ?? []).map((body, index) => ({ id: ids[index] ?? index, body }));
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
		prDiff: async (repo, pr) => record("prDiff", [repo, pr], ""),
		prReady: async (repo, pr) => {
			record("prReady", [repo, pr], undefined);
		},
		prNumbersForBranch: async (repo, head, base) => record("prNumbersForBranch", [repo, head, base], [] as number[]),
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
export const DARKFACTORY_TAXONOMY: AreaTaxonomy = {
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
export interface AgentDouble {
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
export interface HandlerContextHandle {
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
