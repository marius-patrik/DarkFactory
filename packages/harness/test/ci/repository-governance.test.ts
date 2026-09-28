import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REQUEST_BINDING_REQUIRED_CHECK, requiredChecksForDetectedQuality } from "@darkfactory/capability/actions";
import type { Workflow } from "./pipeline-source.ts";
import {
	allSteps,
	declaredAreas,
	declaredSlug,
	expression,
	issueTemplateDir,
	jobScripts,
	pagesPayload,
	parseWorkflow,
	repoConfig,
	repoRoot,
	steps,
	stepsUsing,
	triggers,
	workflowNames,
	workflowScripts,
	workflowSource,
} from "./pipeline-source.ts";

// The statuses DF-RULE-009 fixes, and the required checks the pipeline gates merges on, are declared
// in TypeScript. The claims below are the sync between that single owner and every artefact that
// has to agree with it: the normative rule, the board options, and the workflows that report the
// required check contexts. Re-owning a second copy of either list here is what made the Python
// `STATUS_OPTIONS == STATUS_NAMES` assertion necessary in the first place.

/** Every workflow the rules reference is present. */
const EXPECTED_WORKFLOWS = [
	"agent.yml",
	"ci.yml",
	"deploy-docs.yml",
	"open-pr.yml",
	"pr-approval-automerge.yml",
	"project-automation.yml",
	"report-failure.yml",
	"update-submodules.yml",
	"install.yml",
	"verify-pr-issue.yml",
	"quota-resume.yml",
];

/** Issue chooser and templates. */
const EXPECTED_ISSUE_TEMPLATES = ["request.yml", "epic.yml", "decision.yml", "config.yml", "configure.yml"];

/** Workflows that run *in* this repository rather than being called from another. */
const NOT_CALLABLE = ["install.yml", "ci.yml", "branch-policy.yml", "deploy-docs.yml", "preview-docs.yml"];

/** Workflows that write to GitHub on the pipeline's behalf and must therefore authenticate as the App. */
const APP_AUTHENTICATED_WORKFLOWS = [
	"agent.yml",
	"install.yml",
	"open-pr.yml",
	"pr-approval-automerge.yml",
	"project-automation.yml",
	"report-failure.yml",
	"update-submodules.yml",
];

/**
 * Workflows holding a line that deliberately prefers the user's token, and how many such lines.
 *
 * An installation token cannot write a user-owned Projects v2 board, administer a repository
 * (`/pages`) or list secrets, and none of those is an exception to this rule: every workflow
 * authenticates as the App and carries the user's token in a *separate* variable that only those
 * calls read. Preferring a token and carrying one for a specific purpose are different things, and
 * only the first is a licence worth policing - which is why this map is empty and should stay so.
 */
const USER_TOKEN_EXCEPTIONS: Record<string, number> = {};

/** The credential the App's own key comes from, declared for callers but never handed to the container. */
const APP_PRIVATE_KEY = "DARKFACTORY_APP_PRIVATE_KEY";

/** The env names that authenticate a call, as opposed to the env names that carry a credential. */
const TOKEN_VARIABLES = ["GH_TOKEN", "token"];

/**
 * The env entries of every step of a workflow that reach for the user's token before the App's.
 *
 * Returns `[job, step, variable, value]` for each offending entry, in declaration order.
 */
function userFirstTokenEntries(workflow: Workflow): Array<[string, string, string, string]> {
	const offenders: Array<[string, string, string, string]> = [];
	for (const { job, step } of allSteps(workflow)) {
		for (const [variable, value] of Object.entries(step.env ?? {})) {
			if (!TOKEN_VARIABLES.includes(variable)) continue;
			if (!value.includes("GH_PROJECT_TOKEN")) continue;
			const app = value.indexOf("app-token.outputs.token");
			if (app !== -1 && app < value.indexOf("GH_PROJECT_TOKEN")) continue;
			offenders.push([job, step.name ?? job, variable, value]);
		}
	}
	return offenders;
}

/** The env entries that authenticate as the user with no App path at all. */
function userOnlyTokenEntries(workflow: Workflow): Array<[string, string, string]> {
	const offenders: Array<[string, string, string]> = [];
	for (const { job, step } of allSteps(workflow)) {
		for (const [variable, value] of Object.entries(step.env ?? {})) {
			if (!TOKEN_VARIABLES.includes(variable)) continue;
			if (value.includes("GH_PROJECT_TOKEN") && !value.includes("app-token.outputs.token")) {
				offenders.push([job, step.name ?? job, `${variable}: ${value}`]);
			}
		}
	}
	return offenders;
}

describe("workflow inventory", () => {
	for (const name of EXPECTED_WORKFLOWS) {
		it(`test_workflow_exists: ${name}`, () => {
			expect(existsSync(join(repoRoot, ".github", "workflows", name))).toBe(true);
		});
	}

	it("test_every_workflow_is_valid_yaml: a malformed workflow is silently ignored by GitHub", () => {
		const malformed: string[] = [];
		for (const name of workflowNames()) {
			try {
				parseWorkflow(name);
			} catch {
				malformed.push(name);
			}
		}
		expect(malformed).toEqual([]);
	});
});

describe("ci.yml", () => {
	const ci = parseWorkflow("ci.yml");

	it("test_ci_quality_matrix_is_detector_driven: quality comes from repository evidence", () => {
		const detect = steps(ci, "detect").map((step) => step.name);
		expect(detect).toContain("Resolve detected quality matrix");
		expect(ci.jobs["quality-run"]?.strategy).toEqual({
			"fail-fast": false,
			matrix: { include: expression("fromJSON(needs.detect.outputs.matrix)") },
		});
		expect(steps(ci, "quality-run").map((step) => step.name)).toContain("Run detected quality action");
		const serialized = JSON.stringify(ci);
		expect(serialized).not.toContain("hashFiles('Cargo.toml')");
		for (const handwritten of ["rust", "harness", "pipeline", "paper", "math", "web", "docs"]) {
			expect(Object.keys(ci.jobs)).not.toContain(handwritten);
		}
	});

	it("test_ci_has_one_aggregate_quality_context: branch protection consumes one stable result", () => {
		expect(ci.jobs.quality).toBeDefined();
		expect(ci.jobs.quality?.name).toBe("quality");
		expect(ci.jobs.quality?.needs).toEqual(["detect", "quality-run", "docs-check"]);
	});

	it("test_python_actions_and_docs_have_separate_final_owners: capability actions versus the native compiler", () => {
		const scripts = workflowScripts(ci);
		expect(scripts).not.toContain("pytest -v tests");
		expect(steps(ci, "quality-run").find((step) => step.name === "Run detected quality action")?.env).toHaveProperty(
			"DF_ACTION_COMMAND",
		);
		expect(workflowSource("ci.yml")).toContain("repo.dfconfig");
		expect(scripts).toContain('bun "$ROOT/scripts/build-docs.ts"');
	});

	it("test_ci_is_a_direct_detector_driven_workflow: installed directly, never caller-prefixed", () => {
		const declared = triggers(ci);
		expect(Object.keys(declared)).not.toContain("workflow_call");
		expect(Object.keys(declared)).toContain("merge_group");
		expect(ci.jobs.quality?.name).toBe("quality");
	});

	it("test_ci_still_runs_for_this_repository_itself: a caller-only file leaves upstream untested", () => {
		const declared = Object.keys(triggers(ci));
		expect(declared).toContain("push");
		expect(declared).toContain("pull_request");
	});

	it("test_consumer_ci_uses_a_pinned_darkfactory_runtime_checkout: detector code from the pinned checkout", () => {
		const runtime = steps(ci, "detect").find((step) => step.with?.path === ".darkfactory-runtime");
		expect(runtime?.with?.repository).toBe(declaredSlug());
		expect(workflowSource("ci.yml")).not.toContain("PYTHONPATH");
	});

	it("test_runtime_checkout_is_skipped_when_running_in_place: no recursive checkout of ourselves", () => {
		const identity = repoConfig().identity;
		const guarded = allSteps(ci).filter((entry) => entry.step.with?.path === ".darkfactory-runtime");
		expect(guarded.length).toBeGreaterThan(0);
		for (const { step } of guarded) {
			expect(step.if).toContain(`github.repository != '${identity.owner}/${identity.repo}'`);
		}
	});

	it("test_the_docs_job_uses_the_native_docs_contract: the combined block compiles natively", () => {
		const scripts = jobScripts(ci, "docs-check");
		expect(scripts).toContain("repo.dfconfig");
		expect(scripts).toContain("config.dfconfig");
		expect(scripts).toContain(".dfconfig");
		expect(scripts).not.toContain('"repo.df"');
		expect(scripts).not.toContain('"config.df"');
		expect(scripts).toContain("DF_CONFIG_DIR");
		expect(scripts).toContain('bun "$ROOT/scripts/build-docs.ts"');
		expect(scripts).not.toContain("packages/docs");
		expect(scripts).not.toContain("packages/web");
	});

	it("test_the_docs_job_tolerates_a_repository_with_no_documentation: a no-op is a successful check", () => {
		const noDocs = steps(ci, "docs-check").find((step) => step.if === "steps.docs.outputs.present != 'true'");
		expect(noDocs?.name).toBe("No documentation configured");
	});

	it("test_ci_docs_job_runs_the_native_bun_compiler: the direct docs-check job uses the Bun workspace", () => {
		const scripts = jobScripts(ci, "docs-check");
		expect(stepsUsing(ci, "oven-sh/setup-bun").length).toBeGreaterThan(0);
		expect(scripts).toContain("bun install --frozen-lockfile");
		expect(scripts).toContain('bun "$ROOT/scripts/build-docs.ts"');
	});
});

describe("required check contexts", () => {
	const ci = parseWorkflow("ci.yml");
	const verify = parseWorkflow("verify-pr-issue.yml");

	it("test_verify_bound_issue_job_name_is_stable: the required check name is the job id", () => {
		expect(Object.keys(verify.jobs)).toContain("verify-bound-issue");
	});

	it("test_required_checks_match_final_stable_contexts: deletion-bound metadata mirrors the TS contract", () => {
		const declared = requiredChecksForDetectedQuality({ packages: [], gaps: [] } as never);
		expect(declared.map((check) => check.name)).toEqual(["quality", REQUEST_BINDING_REQUIRED_CHECK]);
		expect(ci.jobs.quality?.name).toBe("quality");
		// The bound-issue check is a job id, and the job id is what a check run is named after.
		// The file the TypeScript contract names is the template a consumer is installed, so the
		// claim here is made against whichever workflow in this repository carries that job.
		const reporting = workflowNames().filter((name) =>
			Object.keys(parseWorkflow(name).jobs).includes(REQUEST_BINDING_REQUIRED_CHECK),
		);
		expect(reporting).toEqual(["verify-pr-issue.yml"]);
	});
});

describe("agent.yml", () => {
	const agent = parseWorkflow("agent.yml");
	const container = steps(agent, "run-agent").find((step) => step.name === "Dispatch agent in container");
	const declaredSecrets = (triggers(agent).workflow_call as { secrets: Record<string, { required?: boolean }> })
		.secrets;

	it("test_agent_workflow_never_leaks_secrets_into_the_log: secrets are container env, never echoed", () => {
		const run = container?.run ?? "";
		for (const secret of [
			"GEMINI_API_KEY",
			"DF_ACCOUNT_OPENAI_CODEX",
			"DF_ACCOUNT_GROK_SUB",
			"OPENROUTER_API_KEY",
			"GROQ_API_KEY",
		]) {
			expect(run).toContain(`-e ${secret} \\`);
			expect(workflowSource("agent.yml")).not.toContain(`echo \${{ secrets.${secret}`);
		}
		for (const removed of ["CODEX_AUTH_JSON", "GROK_AUTH_JSON"]) {
			expect(workflowSource("agent.yml")).not.toContain(removed);
		}
	});

	it("test_agent_workflow_forwards_every_declared_credential_without_interpolation: secrets reach the container through step env", () => {
		// The App private key is consumed by the token-minting step, not by the container; every
		// other declared credential has to reach `docker run` through the step environment and `-e`.
		for (const secret of Object.keys(declaredSecrets).filter((name) => name !== APP_PRIVATE_KEY)) {
			expect(container?.env?.[secret], `${secret} must reach the container through step env`).toBe(
				`\${{ secrets.${secret} }}`,
			);
			expect(container?.run).toContain(`-e ${secret}`);
		}
		const mint = steps(agent, "run-agent").find((step) => step.uses?.startsWith("actions/create-github-app-token@"));
		expect(mint?.with?.["private-key"]).toBe(`\${{ secrets.${APP_PRIVATE_KEY} }}`);
		expect(container?.run).not.toContain(`-e ${APP_PRIVATE_KEY}`);
	});

	it("test_agent_workflow_cannot_reenable_the_removed_harnesses: the chain overrides are not forwarded", () => {
		for (const reference of [
			"vars.AGENT_HARNESS_CHAIN",
			"vars.AGENT_HARNESS_CONFIG",
			"-e AGENT_HARNESS_CHAIN",
			"-e AGENT_HARNESS_CONFIG",
		]) {
			expect(workflowSource("agent.yml")).not.toContain(reference);
		}
	});

	it("test_the_agent_is_callable_and_declares_every_credential: a called workflow sees no secret unpassed", () => {
		expect(Object.keys(triggers(agent))).toContain("workflow_call");
		const referenced = new Set(
			[...workflowSource("agent.yml").matchAll(/secrets\.([A-Z0-9_]+)/g)].map((match) => match[1] as string),
		);
		referenced.delete("GITHUB_TOKEN");
		expect([...referenced].filter((name) => !(name in declaredSecrets)).sort()).toEqual([]);
	});

	it("test_every_agent_credential_is_optional: a repository with three harnesses gets a shorter chain", () => {
		for (const [name, spec] of Object.entries(declaredSecrets)) {
			expect(spec.required, `${name} must be optional`).toBe(false);
		}
	});

	it("test_the_agent_image_is_built_from_the_pipeline: consumers run the same runner", () => {
		const build = steps(agent, "run-agent").find((step) => step.name === "Build agent container");
		expect(build?.run).toContain('CONTEXT=".darkfactory-pipeline"');
		expect(build?.run).toContain("$CONTEXT/docker/Dockerfile.agent");
	});

	it("test_bot_comments_do_not_start_an_agent_container: a bot comment is dropped before the build", () => {
		const condition = agent.jobs["run-agent"]?.if ?? "";
		expect(condition).toContain("endsWith(github.event.comment.user.login, '[bot]')");
		expect(condition.split("!endsWith").length - 1).toBe(1);
	});
});

describe("secrets reach every workflow safely", () => {
	const workflows = workflowNames().map((name) => [name, parseWorkflow(name)] as const);

	it("test_no_script_interpolates_a_secret: pasted into a run script, JSON loses its quotes and $(...) runs", () => {
		const offenders: string[] = [];
		for (const [name, workflow] of workflows) {
			for (const { job, step } of allSteps(workflow)) {
				if (/\$\{\{[^}]*\bsecrets\./.test(step.run ?? "")) offenders.push(`${name}:${job}:${step.name}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("test_no_step_condition_reads_the_secrets_context: the workflow fails with no jobs and no readable error", () => {
		const offenders: string[] = [];
		for (const [name, workflow] of workflows) {
			for (const { job, step } of allSteps(workflow)) {
				if (String(step.if ?? "").includes("secrets.")) offenders.push(`${name}:${job}:${step.name ?? job}`);
			}
		}
		expect(offenders).toEqual([]);
	});
});

describe("board automation workflows", () => {
	for (const name of ["project-automation.yml", "pr-approval-automerge.yml"]) {
		it(`test_board_workflows_receive_project_coordinates: ${name}`, () => {
			const workflow = parseWorkflow(name);
			const carried = allSteps(workflow).flatMap(({ step }) => Object.keys(step.env ?? {}));
			expect(carried).toContain("PROJECT_OWNER");
			expect(carried).toContain("PROJECT_NUMBER");
		});
	}
});

describe("status taxonomy", () => {});

describe("issue templates", () => {
	for (const name of EXPECTED_ISSUE_TEMPLATES) {
		it(`test_issue_templates_present: ${name}`, () => {
			expect(existsSync(join(issueTemplateDir, name))).toBe(true);
		});
	}

	it("test_issue_templates_point_at_this_repository: a chooser pointing elsewhere hands over another project's rules", () => {
		const slug = declaredSlug();
		for (const name of ["config.yml", "configure.yml", "decision.yml", "epic.yml", "request.yml"]) {
			const content = readFileSync(join(issueTemplateDir, name), "utf8");
			for (const match of content.matchAll(/https:\/\/github\.com\/([^/\s]+\/[^/\s]+)/g)) {
				expect(match[1], `${name} links to ${match[1]}`).toBe(slug);
			}
		}
	});

	it("test_request_template_requires_verbatim_wording: DF-RULE-012 depends on the unedited request", () => {
		const template = Bun.YAML.parse(readFileSync(join(issueTemplateDir, "request.yml"), "utf8")) as {
			labels: string[];
			body: Array<{ attributes: { label?: string } }>;
		};
		expect(template.body.map((block) => block.attributes.label)).toContain("Verbatim User Request");
		expect(template.labels).toEqual(["Request"]);
	});

	it("test_area_lists_match_the_manifest: the hand-written taxonomy agrees with the one declaration", () => {
		const content = readFileSync(join(issueTemplateDir, "request.yml"), "utf8");
		const found: Record<string, string> = {};
		for (const match of content.matchAll(/^\s+- "([a-z]+) - (.+) \(area:\1\)"$/gm)) {
			found[match[1] as string] = match[2] as string;
		}
		expect(Object.keys(found).length).toBeGreaterThan(0);
		expect(found).toEqual(declaredAreas());
	});

	it("test_pull_request_template_uses_manifest_scopes_without_copying_them", () => {
		const content = readFileSync(join(repoRoot, ".github", "PULL_REQUEST_TEMPLATE.md"), "utf8");
		expect(content).toContain("Closes #");
		expect(content).toContain("repo.dfconfig-declared scope(s)");
		expect(content).toContain("detected/capability-resolved quality actions");
		expect(content).not.toMatch(/^- \[ \] `area:[a-z]+`/m);
		expect(content).toContain("Conventional Commit type");
	});
});

describe("ignored runtime state", () => {
	it("test_gitignore_excludes_generated_documentation_data: generated JSON is a CI output", () => {
		const lines = readFileSync(join(repoRoot, ".gitignore"), "utf8").split("\n");
		expect(lines).toContain(".darkfactory/generated/");
	});
});

describe("documentation publishing", () => {
	const deploy = parseWorkflow("deploy-docs.yml");
	const preview = parseWorkflow("preview-docs.yml");

	it("test_pages_source_matches_the_deploy_workflow: the manifest and the workflow agree on the source", () => {
		expect(pagesPayload()).toEqual({ build_type: "workflow" });
		expect(stepsUsing(deploy, "actions/upload-pages-artifact").length).toBeGreaterThan(0);
		expect(stepsUsing(deploy, "actions/deploy-pages").length).toBeGreaterThan(0);
		expect(workflowSource("deploy-docs.yml")).not.toContain("gh-pages");
	});

	it("test_pages_deploy_does_not_clobber_pull_request_previews: a full replace deletes every live preview", () => {
		const source = workflowSource("deploy-docs.yml");
		if (source.includes("clean: true")) {
			expect(source).toContain("clean-exclude");
			expect(source).toContain("pr-*");
		}
	});

	it("test_the_deploy_workflow_uses_the_native_docs_compiler: one shared compiler and renderer", () => {
		expect(workflowScripts(deploy)).toContain("bun scripts/build-docs.ts");
		expect(stepsUsing(deploy, "actions/upload-pages-artifact").length).toBeGreaterThan(0);
		expect(stepsUsing(deploy, "actions/deploy-pages").length).toBeGreaterThan(0);
	});

	it("test_the_deploy_workflow_has_no_second_paper_renderer: domain artifacts belong to capabilities", () => {
		const source = workflowSource("deploy-docs.yml");
		for (const renderer of ["environment.configure", "typst-community/setup-typst", "texlive-latex"]) {
			expect(source).not.toContain(renderer);
		}
	});

	it("test_the_deploy_workflow_is_main_actions_release: production documentation is a direct main deploy", () => {
		const declared = triggers(deploy);
		expect(Object.keys(declared)).not.toContain("workflow_call");
		expect((declared.push as { branches: string[] }).branches).toEqual(["main"]);
		expect(Object.keys(declared)).toContain("workflow_dispatch");
	});

	it("test_native_docs_owners_are_present: the current compiler, renderer and configuration exist", () => {
		expect(existsSync(join(repoRoot, "repo.dfconfig"))).toBe(true);
		for (const legacy of ["repo.df", "config.dfconfig", ".dfconfig"]) {
			expect(existsSync(join(repoRoot, legacy))).toBe(false);
		}
		for (const legacy of ["repo.df", "config.df", "repo.dfconfig", "config.dfconfig", ".dfconfig"]) {
			expect(existsSync(join(repoRoot, ".darkfactory", legacy))).toBe(false);
		}
		expect(existsSync(join(repoRoot, "packages", "docs", "src", "content.ts"))).toBe(true);
		expect(existsSync(join(repoRoot, "packages", "web", "src", "docs.ts"))).toBe(true);
	});

	it("test_preview_validates_without_publishing: production Pages remains main-only", () => {
		const source = workflowSource("preview-docs.yml");
		expect(steps(preview, "validate").map((step) => step.name)).toContain("Validate documentation projections");
		expect(workflowScripts(preview)).toContain("bun scripts/build-docs.ts");
		expect(source).not.toContain("deploy-pages");
		expect(source).not.toContain("gh-pages");
		expect(source).not.toContain("target-folder: pr-");
	});

	it("test_preview_uses_the_same_native_docs_compiler: preview and deploy render the same content graph", () => {
		const scripts = workflowScripts(preview);
		expect(scripts).toContain("bun scripts/build-docs.ts");
		expect(scripts).toContain("--check");
		expect(workflowSource("preview-docs.yml")).not.toContain("deploy-pages");
	});
});

describe("release.yml", () => {
	const release = parseWorkflow("release.yml");

	it("test_release_workflow_fetches_full_history: tags decide the current version", () => {
		// Matched by action name, not by a pinned ref: the workflows pin actions by digest, and
		// which digest is current is not the invariant. A depth is asserted wherever one is
		// declared, so a job that is later made shallow to save time has to say so out loud.
		const checkouts = allSteps(release)
			.map((entry) => entry.step)
			.filter((step) => step.uses?.startsWith("actions/checkout@"));
		const declared = checkouts.map((step) => step.with?.["fetch-depth"]);
		expect(declared.filter((depth) => depth !== undefined).length).toBeGreaterThan(0);
		expect(declared.filter((depth) => depth !== undefined)).not.toContain(1);
		expect(declared).toContain(0);
	});

	it("test_release_workflow_is_idempotent_on_an_existing_tag: push and dispatch can both fire", () => {
		expect(workflowScripts(release)).toContain("git rev-parse");
	});

	it("test_release_workflow_blocks_on_metadata_disagreement: a contradicting tag is worse than none", () => {
		const scripts = workflowScripts(release);
		expect(scripts).toContain("metadata_problems");
		// The step used to be a Python heredoc and this read for its `sys.exit(1)`. It is a shell
		// `exit 1` beside the same field now; the claim is unchanged and only the language moved.
		expect(scripts).toContain("exit 1");
	});

	it("test_release_workflow_offers_an_explicit_bump: PrideVer's PROUD cannot be derived", () => {
		const declared = triggers(release);
		expect(Object.keys(declared)).toContain("workflow_dispatch");
		expect((declared.workflow_dispatch as { inputs: Record<string, unknown> }).inputs).toHaveProperty("bump");
		const carried = allSteps(release).flatMap(({ step }) => Object.keys(step.env ?? {}));
		expect(carried).toContain("REQUESTED_BUMP");
	});

	it("test_release_workflow_tolerates_a_repository_with_no_build: a tag and notes, not a failure", () => {
		const scripts = workflowScripts(release);
		expect(scripts.includes("no assets") || scripts.includes("Nothing to build")).toBe(true);
	});
});

describe("branch roles", () => {
	it("test_workflows_separate_development_from_release_pushes: quality on develop, release on main", () => {
		const identity = repoConfig().identity;
		expect(identity.default_branch).toBe("main");
		expect(identity.development_branch).toBe("develop");
		for (const name of ["ci.yml", "project-automation.yml"]) {
			const push = triggers(parseWorkflow(name)).push as { branches: string[] };
			expect(push.branches, `${name} must follow the development branch`).toEqual(["develop"]);
		}
		for (const name of ["deploy-docs.yml", "release.yml"]) {
			const push = triggers(parseWorkflow(name)).push as { branches: string[] };
			expect(push.branches, `${name} must follow the stable release branch`).toEqual(["main"]);
		}
	});

	it("test_main_source_gate_requires_develop_from_the_same_repository: a PR to main is a promotion", () => {
		const policy = parseWorkflow("branch-policy.yml");
		const pullRequest = triggers(policy).pull_request as { branches: string[] };
		expect(pullRequest.branches).toEqual(["main"]);
		const gate = steps(policy, "main-source").find((step) => step.name === "Require the repository develop branch");
		expect(policy.jobs["main-source"]?.env?.HEAD_REPOSITORY).toBe(
			expression("github.event.pull_request.head.repo.full_name"),
		);
		expect(policy.jobs["main-source"]?.env?.HEAD_BRANCH).toBe(expression("github.event.pull_request.head.ref"));
		expect(gate?.run).toContain('test "$HEAD_BRANCH" = "develop"');
		expect(gate?.run).toContain('test "$HEAD_REPOSITORY" = "$GITHUB_REPOSITORY"');
	});
});

describe("shared workflow contracts", () => {
	it("test_every_shared_workflow_is_callable: a workflow a consumer cannot call is one it copies", () => {
		for (const name of workflowNames()) {
			if (NOT_CALLABLE.includes(name)) continue;
			expect(Object.keys(triggers(parseWorkflow(name))), `${name} cannot be shared`).toContain("workflow_call");
		}
	});

	it("test_script_paths_resolve_against_the_pinned_pipeline: a hardcoded path finds nothing in a consumer", () => {
		for (const name of workflowNames()) {
			for (const line of workflowSource(name).split("\n")) {
				expect(line).not.toMatch(/python3?\s+\.github\/scripts\//);
			}
		}
	});

	it("test_open_pr_forwards_its_dispatch_inputs_to_callers: a called workflow receives no inputs automatically", () => {
		const declared = triggers(parseWorkflow("open-pr.yml"));
		const dispatch = new Set(Object.keys((declared.workflow_dispatch as { inputs: object }).inputs));
		const called = new Set(Object.keys((declared.workflow_call as { inputs: object }).inputs));
		expect([...dispatch].filter((name) => !called.has(name))).toEqual([]);
	});
});

describe("the pipeline's GitHub identity", () => {
	it("test_the_app_installation_is_recorded: the installation id is what a token request needs", () => {
		const app = repoConfig().app;
		expect(app.installation_id).toBe(159771550);
		expect(app.installed_on).toContain("marius-patrik/omnis");
	});

	it("test_repository_documents_name_the_native_docs_contract: normative text points at the current owners", () => {
		const prd = readFileSync(join(repoRoot, "README.md"), "utf8");
		expect(prd).toContain("`docs` block");
		expect(prd).toContain("@darkfactory/docs");
		expect(prd).toContain("@darkfactory/web");
	});
});

describe("token preference", () => {
	for (const name of APP_AUTHENTICATED_WORKFLOWS) {
		it(`test_github_writes_prefer_the_installation_token: ${name}`, () => {
			const workflow = parseWorkflow(name);
			expect(stepsUsing(workflow, "actions/create-github-app-token").length).toBeGreaterThan(0);
			const offenders = userFirstTokenEntries(workflow);
			const allowed = USER_TOKEN_EXCEPTIONS[name] ?? 0;
			expect(
				offenders.length,
				`${name} prefers the user token over the App: ${JSON.stringify(offenders)}`,
			).toBeLessThanOrEqual(allowed);
		});

		it(`test_app_authenticated_workflows_can_receive_the_private_key: ${name}`, () => {
			const declared = triggers(parseWorkflow(name));
			if (!declared.workflow_call) return;
			const secrets = (declared.workflow_call as { secrets: Record<string, unknown> }).secrets ?? {};
			expect(Object.keys(secrets)).toContain(repoConfig().app.private_key_secret);
		});
	}

	it("test_every_declared_user_token_exception_is_a_real_one: an unused exception is a licence left open", () => {
		const actual: Record<string, number> = {};
		for (const name of workflowNames()) {
			const count = userFirstTokenEntries(parseWorkflow(name)).length;
			if (count > 0) actual[name] = count;
		}
		expect(actual).toEqual(USER_TOKEN_EXCEPTIONS);
	});

	it("test_only_board_writes_reach_for_the_user_token_alone: Projects v2 is scoped to organisations", () => {
		const offenders: string[] = [];
		for (const name of workflowNames()) {
			for (const [job, step, entry] of userOnlyTokenEntries(parseWorkflow(name))) {
				offenders.push(`${name}:${job}:${step}: ${entry}`);
			}
		}
		expect(offenders).toEqual([]);
	});

	it("test_the_cross_repository_workflow_scopes_its_token_to_its_target: install.yml writes elsewhere", () => {
		const mint = stepsUsing(parseWorkflow("install.yml"), "actions/create-github-app-token")[0]?.step;
		expect(mint?.with).toHaveProperty("repositories");
		expect(mint?.with).toHaveProperty("owner");
	});

	for (const name of APP_AUTHENTICATED_WORKFLOWS.filter((workflow) => workflow !== "install.yml")) {
		it(`test_same_repository_workflows_do_not_narrow_their_token: ${name}`, () => {
			for (const { step } of stepsUsing(parseWorkflow(name), "actions/create-github-app-token")) {
				expect(step.with, `${name} acts on its own repository and must not scope`).not.toHaveProperty("repositories");
			}
		});
	}
});

describe("install.yml", () => {
	const install = parseWorkflow("install.yml");
	const settingsStep = steps(install, "install").find((step) => step.name === "Reconcile labels, board and settings");
	const pullRequestStep = steps(install, "install").find((step) => step.name === "Open a pull request on the target");
	const issueStep = steps(install, "install").find(
		(step) => step.name === "File the issue the installation pull request binds",
	);

	it("test_the_installer_tells_the_settings_script_which_repository_to_configure: the failure with no symptom", () => {
		expect(settingsStep?.env).toHaveProperty("DARKFACTORY_REPO_ROOT");
		expect(settingsStep?.env?.DARKFACTORY_REPO_ROOT?.split("\n")[0]).toContain("target");
	});

	it("test_the_settings_step_carries_both_tokens: the split only works if both are given", () => {
		expect(settingsStep?.env).toHaveProperty("GH_TOKEN");
		expect(settingsStep?.env).toHaveProperty("GH_PROJECT_TOKEN");
		expect(settingsStep?.env?.GH_TOKEN?.split("\n")[0]).toContain("app-token.outputs.token");
	});

	it("test_the_installation_pull_request_binds_an_issue: verify-bound-issue cannot pass without one", () => {
		expect(pullRequestStep?.run).toContain("Closes #");
		expect(pullRequestStep?.run).toContain("steps.install-issue.outputs.number");
	});

	it("test_the_bound_issue_is_not_the_configuration_issue: that one is a standing invitation", () => {
		const source = workflowSource("install.yml");
		expect(source).toContain("darkfactory: installation");
		expect(source).toContain("darkfactory: configuration");
		expect(pullRequestStep?.run).not.toContain("darkfactory: configuration");
	});

	it("test_a_reinstall_updates_the_pull_request_it_finds: the body carries the issue binding", () => {
		expect(pullRequestStep?.run).toContain("gh pr edit");
		expect(pullRequestStep?.run).not.toContain("already exists");
	});

	it("test_the_install_issue_number_is_validated_before_it_is_used: an empty binding is worse than none", () => {
		expect(issueStep?.run).not.toContain("--json number --jq .number");
		expect(issueStep?.run).toContain("exit 1");
	});
});
