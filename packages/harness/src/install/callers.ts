/** @packageDocumentation
 * Caller workflow generation.
 *
 * A consumer repository does not copy the pipeline's workflows; it holds one caller per workflow,
 * and every job body comes from the pinned pipeline commit. Adopting an update is a one-line change
 * in the caller, and the diff shows exactly what moved.
 *
 * The registry below is the whole declarative surface: a display name, a trigger block, a
 * permissions block, and whatever inputs and `with:` values the call has to forward. Anything a
 * workflow needs beyond that belongs in the workflow, not here.
 */

import { QUALITY_REQUIRED_CHECK, REQUEST_BINDING_REQUIRED_CHECK } from "../../../capability/src/actions.ts";
import { getWorkflowTemplateContent } from "../ci/templates.ts";

/**
 * One GitHub Actions expression, built from its body.
 *
 * A workflow file spells an expression `${{ ... }}`, which is not a template literal and reads as
 * one to every tool that looks at this string. Assembling the delimiters keeps the two apart.
 */
function expression(body: string): string {
	return `$\{{ ${body} }}`;
}

/**
 * Workflows rendered from a bundled template rather than from the registry.
 *
 * These two are the pipeline run *in this repository* rather than called from another, so they
 * check the runtime out directly. A template is substituted verbatim: no managed header, and no
 * default for the ref, because a caller that falls back to a branch name is not a pin at all.
 */
const DIRECT_WORKFLOW_TEMPLATES: Readonly<Record<string, string>> = Object.freeze({
	ci: "ci.yml",
	"verify-pr-issue": "verify-bound-issue.yml",
});

/** One `workflow_dispatch` input a caller has to declare and forward by name. */
interface DispatchInput {
	/** Human-readable description, rendered as a YAML single-quoted scalar. */
	description: string;
	/** Input type. */
	type: "string" | "boolean";
	/** Whether the workflow refuses to run without it. */
	required: boolean;
	/**
	 * Default value, with `{branch}` substituted by the consumer's default branch.
	 *
	 * A boolean default is emitted unquoted and a string default quoted, so a branch called `true`
	 * or `2.0` is not read back as something other than a string.
	 */
	default?: string;
}

/** One workflow an installation can write a caller for. */
interface WorkflowSpec {
	/**
	 * Display name.
	 *
	 * Beyond cosmetics: `report-failure` watches workflows *by name*, so a caller named anything
	 * else is a workflow its own failure reporter cannot see.
	 */
	name: string;
	/** The `on:` block, with `{branch}` and `{watched}` substituted at render time. */
	on: string;
	/** The `permissions:` block, without its key. */
	permissions: string;
	/** Inputs forwarded verbatim rather than from the caller's `inputs` context. */
	with?: Readonly<Record<string, string>>;
	/** `workflow_dispatch` inputs the caller must declare itself. */
	inputs?: Readonly<Record<string, DispatchInput>>;
}

/** Every workflow an installation can write a caller for. */
export const WORKFLOWS: Readonly<Record<string, WorkflowSpec>> = Object.freeze({
	ci: {
		name: "CI",
		on: "push:\n    branches: [{branch}]\n  pull_request:\n  workflow_dispatch:",
		permissions: "contents: read",
	},
	release: {
		name: "Release",
		on: "push:\n    branches: [{branch}]\n  workflow_dispatch:",
		permissions: "contents: write",
	},
	"project-automation": {
		name: "Project Board Automation",
		on:
			"issues:\n    types: [opened, labeled, unlabeled, closed, reopened]\n" +
			"  pull_request:\n    types: [opened, edited, closed, ready_for_review, reopened]\n" +
			"  workflow_dispatch:",
		permissions: "contents: read\n  issues: write\n  pull-requests: write\n" + "  repository-projects: write",
	},
	"report-failure": {
		name: "Report Pipeline Failure",
		// The watch list is filled in by renderCaller from the workflows actually installed.
		// `workflow_run` matches by *display name*, and a name matching nothing is not an error -
		// it simply never fires, which is how agent failures went unreported for as long as the
		// pipeline watched a workflow called "Agent" that had been renamed "Autonomous Agent".
		on: "workflow_run:\n    workflows: [{watched}]\n    types: [completed]",
		permissions: "contents: read\n  issues: write",
	},
	"update-submodules": {
		name: "Update Submodules",
		on: 'schedule:\n    - cron: "17 4 * * *"\n  workflow_dispatch:',
		permissions: "contents: write\n  pull-requests: write",
	},
	agent: {
		name: "Autonomous Agent",
		on:
			"issues:\n    types: [opened]\n" +
			"  issue_comment:\n    types: [created]\n" +
			"  pull_request_review_comment:\n    types: [created]\n" +
			"  workflow_dispatch:",
		permissions:
			"contents: write\n  issues: write\n  pull-requests: write\n" + "  repository-projects: write\n  actions: write",
		// `AGENT_ENABLED` is a repository variable rather than a manifest key: it is a switch a
		// person flips to stop the agent, and a switch that needs a commit is not a switch.
		with: { "agent-enabled": expression("vars.AGENT_ENABLED") },
	},
	"verify-pr-issue": {
		name: "Verify Bound Issue",
		on: "pull_request:\n    types: [opened, edited, synchronize, reopened]",
		permissions: "contents: read",
	},
	"pr-approval-automerge": {
		name: "PR Approval and Auto-Merge",
		on:
			"pull_request_review:\n    types: [submitted]\n" +
			"  issue_comment:\n    types: [created]\n" +
			"  workflow_dispatch:",
		permissions: "pull-requests: write\n  contents: write\n  issues: write\n" + "  repository-projects: write",
	},
	"open-pr": {
		name: "Open Pull Request",
		// Dispatch-only, and the only workflow whose inputs a caller has to declare and forward by
		// name: a called workflow receives nothing from the caller's `inputs` context on its own.
		on: "workflow_dispatch:",
		permissions: "contents: write\n  pull-requests: write\n  actions: write",
		inputs: {
			branch: {
				description: "Head branch name (e.g. feature/my-feature)",
				type: "string",
				required: true,
			},
			title: { description: "Pull Request title", type: "string", required: true },
			body: { description: "Pull Request description", type: "string", required: true },
			base: { description: "Target base branch", type: "string", required: false, default: "{branch}" },
			draft: { description: "Create as draft PR", type: "boolean", required: false, default: "true" },
		},
	},
});

/**
 * Unprefixed check name to the caller whose job reports it.
 *
 * A repository calling the pipeline as a reusable workflow sees every check prefixed with the
 * caller's job name, so `pipeline (3.12)` arrives as `ci / pipeline (3.12)`. Branch protection
 * matches contexts by string, and a protected branch waiting on a name nothing reports blocks every
 * merge - which is exactly what a *re-install* did to ChessWithQuests, whose protection still named
 * the job the previous caller happened to use.
 */
export const CHECK_SOURCES: Readonly<Record<string, string>> = Object.freeze({
	[REQUEST_BINDING_REQUIRED_CHECK]: "verify-pr-issue",
});

/** The caller reporting every check not named in {@link CHECK_SOURCES}. */
export const DEFAULT_CHECK_SOURCE = "ci";

/**
 * The stable direct status-check contexts the installed workflows report.
 *
 * @param installed Workflow file names being installed.
 * @returns Contexts to protect, one per installed workflow that always reports a conclusion.
 */
export function requiredContexts(installed: readonly string[]): string[] {
	const contexts: string[] = [];
	// Imported rather than spelled out: these are the same two constants the workflows report and the
	// protection code matches on. A literal copy here could drift from the reporter and re-apply a
	// protection rule naming a check nothing produces, which blocks every merge on that branch.
	if (installed.includes("ci")) contexts.push(QUALITY_REQUIRED_CHECK);
	if (installed.includes("verify-pr-issue")) contexts.push(REQUEST_BINDING_REQUIRED_CHECK);
	return contexts;
}

/**
 * Chooses the workflows worth installing, from what the repository actually holds.
 *
 * @param hasGitmodules Whether the repository holds submodules, offering to keep them current.
 * @returns Workflow file names, without the `.yml` suffix.
 */
export function relevantWorkflows(hasGitmodules = false): string[] {
	const chosen = [
		// The governed flow. Without these an installation reports on work it cannot do: issues get
		// no interpretation, because no workflow on the default branch is listening for them.
		"agent",
		"open-pr",
		"pr-approval-automerge",
		"verify-pr-issue",
		// The reporting half.
		"ci",
		"release",
		"project-automation",
		"report-failure",
	];
	// Installing a submodule updater in a repository with no submodules is noise.
	if (hasGitmodules) chosen.push("update-submodules");
	return chosen;
}

/**
 * The display names `report-failure` should watch.
 *
 * @param installed Workflow file names being installed.
 * @returns Display names, excluding the reporter itself - watching its own failures would loop.
 */
export function watchedWorkflows(installed: readonly string[]): string[] {
	return installed
		.filter((name) => name !== "report-failure")
		.map((name) => WORKFLOWS[name]?.name)
		.filter((name): name is string => name !== undefined);
}

/**
 * A YAML single-quoted scalar.
 *
 * Single quotes rather than double because that is the style the pipeline's callers have always
 * been generated in, and rewriting the style as well as the value would put churn in every
 * consumer's diff for no gain.
 *
 * YAML escapes a single quote inside a single-quoted scalar by *doubling* it. Escaping it with a
 * backslash instead - which is what producing the value through a language's own string repr does -
 * yields a document no YAML parser accepts, so a description carrying an apostrophe would take the
 * whole caller with it.
 */
function singleQuoted(value: string): string {
	return `'${value.replaceAll("'", "''")}'`;
}

/**
 * The `workflow_dispatch` inputs block a caller has to declare.
 *
 * @param spec The workflow's registry entry.
 * @param branch Default branch of the consuming repository, substituted into defaults.
 * @returns The indented input block, or an empty string when the workflow takes none.
 */
export function renderDispatchInputs(spec: WorkflowSpec, branch: string): string {
	const inputs = spec.inputs;
	if (!inputs) return "";
	const lines = ["    inputs:"];
	for (const [name, input] of Object.entries(inputs)) {
		lines.push(`      ${name}:`);
		lines.push(`        description: ${singleQuoted(input.description)}`);
		lines.push(`        required: ${String(input.required).toLowerCase()}`);
		lines.push(`        type: ${input.type}`);
		if (input.default !== undefined) {
			const rendered = input.default.replaceAll("{branch}", branch);
			lines.push(`        default: ${input.type === "boolean" ? rendered : singleQuoted(rendered)}`);
		}
	}
	return `${lines.join("\n")}\n`;
}

/** How to render one caller. */
export interface RenderCallerOptions {
	/** `owner/name` of the repository holding the pipeline. */
	pipelineRepo: string;
	/** Commit the caller pins. */
	ref: string;
	/** Default branch of the consuming repository. */
	branch?: string;
	/** The workflows being installed alongside this one, which is what `report-failure` watches. */
	installed?: readonly string[];
}

/**
 * Renders one caller workflow.
 *
 * @param workflow Workflow file name without its suffix.
 * @param options The pin, the branch, and the workflows installed alongside this one.
 * @returns The file contents.
 * @throws When the workflow is neither a bundled template nor a registry entry.
 */
export function renderCaller(workflow: string, options: RenderCallerOptions): string {
	const { pipelineRepo, ref } = options;
	const branch = options.branch ?? "main";

	const template = DIRECT_WORKFLOW_TEMPLATES[workflow];
	if (template !== undefined) {
		return getWorkflowTemplateContent(template)
			.replaceAll("{{pipeline_repo}}", pipelineRepo)
			.replaceAll("{{pipeline_ref}}", ref)
			.replaceAll("{{default_branch}}", branch);
	}

	const spec = WORKFLOWS[workflow];
	if (!spec) throw new Error(`no workflow specification for ${workflow}`);

	const installed = options.installed ?? relevantWorkflows();
	const trigger = spec.on
		.replaceAll("{branch}", branch)
		.replaceAll("{watched}", watchedWorkflows(installed).join(", "));

	// A called workflow receives nothing from the caller's `inputs` context automatically, so a
	// dispatch input has to be declared here and forwarded by name.
	const forwarded: Record<string, string> = {};
	for (const name of Object.keys(spec.inputs ?? {})) forwarded[name] = expression(`inputs.${name}`);
	Object.assign(forwarded, spec.with ?? {});
	const extras = Object.entries(forwarded)
		.map(([key, value]) => `      ${key}: ${value}\n`)
		.join("");

	return (
		`name: ${spec.name}\n\n` +
		"# A caller, not a copy: every job body comes from the pinned pipeline commit, so adopting\n" +
		"# an update is a one-line change here and the diff shows exactly what moved.\n" +
		`on:\n  ${trigger}\n` +
		`${renderDispatchInputs(spec, branch)}\n` +
		`permissions:\n  ${spec.permissions}\n\n` +
		`jobs:\n  ${workflow}:\n` +
		`    uses: ${pipelineRepo}/.github/workflows/${workflow}.yml@${ref}\n` +
		"    with:\n" +
		`${extras}` +
		`      pipeline-repo: ${pipelineRepo}\n` +
		`      pipeline-ref: "${ref}"\n` +
		"    secrets: inherit\n"
	);
}
