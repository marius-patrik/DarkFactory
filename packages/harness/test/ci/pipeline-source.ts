import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Parsed access to the artefacts this repository's pipeline is made of.
 *
 * The governance invariants in this directory are claims about `.github/workflows/**`,
 * `.github/ISSUE_TEMPLATE/**`, `.github/scripts/**` and `repo.dfconfig`. Claims are made against
 * parsed structure wherever the artefact has structure; a `run:` script is shell text, so a claim
 * about one is a claim about text and is written as one.
 *
 * Every path is resolved from this file rather than from `process.cwd()`, because the suite runs
 * from `harness/` and from the repository root.
 */

/** Repository root. */
export const repoRoot = join(import.meta.dir, "..", "..", "..", "..");
/** The workflows this repository ships. */
export const workflowDir = join(repoRoot, ".github", "workflows");
/** The pipeline's shared automation scripts. */
export const scriptDir = join(repoRoot, ".github", "scripts");
/** The issue chooser and its templates. */
export const issueTemplateDir = join(repoRoot, ".github", "ISSUE_TEMPLATE");

/** One step of a job. */
export interface Step {
	name?: string;
	uses?: string;
	run?: string;
	if?: string;
	env?: Record<string, string>;
	with?: Record<string, unknown>;
	[key: string]: unknown;
}

/** One job of a workflow. */
export interface Job {
	name?: string;
	if?: string;
	needs?: string | string[];
	steps?: Step[];
	env?: Record<string, string>;
	[key: string]: unknown;
}

/** One parsed `.github/workflows` document. */
export interface Workflow {
	name?: string;
	on?: Record<string, unknown>;
	permissions?: Record<string, string>;
	jobs: Record<string, Job>;
	[key: string]: unknown;
}

/** The `repo` block of `repo.dfconfig`. */
export interface RepoConfig {
	identity: {
		owner: string;
		repo: string;
		default_branch: string;
		development_branch: string;
	};
	areas?: Record<string, { description: string } | string>;
	app: { installation_id: number; installed_on: string[]; private_key_secret: string };
	pages?: Record<string, unknown>;
	required_checks?: string[];
	[key: string]: unknown;
}

/** Every workflow file name, sorted, `.yml` and `.yaml` alike. */
export function workflowNames(): string[] {
	return readdirSync(workflowDir)
		.filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
		.sort();
}

/** The raw text of one workflow, for the claims that read the document rather than its structure. */
export function workflowSource(name: string): string {
	return readFileSync(join(workflowDir, name), "utf8");
}

/** One workflow, parsed. A malformed document throws here rather than in the test that reads it. */
export function parseWorkflow(name: string): Workflow {
	return Bun.YAML.parse(workflowSource(name)) as Workflow;
}

/**
 * The `on:` mapping of a workflow.
 *
 * A YAML 1.1 parser resolves a bare `on` key to the boolean `true`; a YAML 1.2 one keeps the
 * string. Both are accepted so the helper does not decide which schema a workflow was written
 * against, and a workflow with no trigger mapping at all is a parse failure worth raising.
 */
export function triggers(workflow: Workflow): Record<string, unknown> {
	const declared = workflow.on ?? (workflow as Record<string, unknown>).true;
	if (declared === null || typeof declared !== "object") {
		throw new Error(`workflow has no trigger mapping: ${workflow.name ?? "unnamed"}`);
	}
	return declared as Record<string, unknown>;
}

/** The steps of one job, in order. */
export function steps(workflow: Workflow, jobId: string): Step[] {
	const job = workflow.jobs[jobId];
	if (!job) throw new Error(`no job ${jobId} in ${workflow.name ?? "unnamed"}`);
	return job.steps ?? [];
}

/** The position of the named step, so an ordering claim can be made about parsed structure. */
export function stepIndex(workflow: Workflow, jobId: string, stepName: string): number {
	const index = steps(workflow, jobId).findIndex((step) => step.name === stepName);
	if (index === -1) throw new Error(`no step ${stepName} in job ${jobId}`);
	return index;
}

/** Every step of every job of one workflow, flattened for document-wide claims. */
export function allSteps(workflow: Workflow): Array<{ job: string; step: Step }> {
	return Object.entries(workflow.jobs).flatMap(([job, definition]) =>
		(definition.steps ?? []).map((step) => ({ job, step })),
	);
}

/** The `run` scripts of one job, joined: a shell script is text, so a claim about it is a text claim. */
export function jobScripts(workflow: Workflow, jobId: string): string {
	return steps(workflow, jobId)
		.map((step) => step.run ?? "")
		.join("\n");
}

/** The `run` scripts of every job of one workflow, joined. */
export function workflowScripts(workflow: Workflow): string {
	return allSteps(workflow)
		.map((entry) => entry.step.run ?? "")
		.join("\n");
}

/** The steps of a workflow that invoke the given action. */
export function stepsUsing(workflow: Workflow, action: string): Array<{ job: string; step: Step }> {
	return allSteps(workflow).filter((entry) => entry.step.uses?.startsWith(`${action}@`));
}

/** Every automation script file name, sorted. */
export function scriptNames(): string[] {
	return readdirSync(scriptDir)
		.filter((name) => name.endsWith(".py"))
		.sort();
}

/** The raw text of one automation script. */
export function scriptSource(name: string): string {
	return readFileSync(join(scriptDir, name), "utf8");
}

/** The `repo` block of `repo.dfconfig`, the one declaration the shared automation reads. */
export function repoConfig(): RepoConfig {
	const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")) as { repo: RepoConfig };
	return document.repo;
}

/** The area taxonomy: bare area name to its description. */
export function declaredAreas(): Record<string, string> {
	const declared = repoConfig().areas ?? {};
	const resolved: Record<string, string> = {};
	for (const [name, value] of Object.entries(declared)) {
		if (name.startsWith("$")) continue;
		resolved[name] = typeof value === "string" ? value : (value?.description ?? "");
	}
	return resolved;
}

/** The `owner/repo` slug this repository declares for itself. */
export function declaredSlug(): string {
	const identity = repoConfig().identity;
	return `${identity.owner}/${identity.repo}`;
}

/**
 * One GitHub Actions expression, built from its body.
 *
 * Writing `${{ ... }}` literally in this file would make the assertion text indistinguishable from
 * a template that had been interpolated, so the delimiters are spelled once here.
 */
export function expression(body: string): string {
	return `$\{{ ${body} }}`;
}

/**
 * The request body the Pages API expects, built the way `manifest.pages_payload` builds it.
 *
 * A `legacy` source needs a branch and a path; anything else is a build type on its own.
 */
export function pagesPayload(): Record<string, unknown> {
	const pages = repoConfig().pages ?? {};
	if (pages.build_type === "legacy") {
		return {
			build_type: "legacy",
			source: { branch: pages.branch ?? "gh-pages", path: pages.path ?? "/" },
		};
	}
	return { build_type: pages.build_type ?? "workflow" };
}
