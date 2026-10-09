import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { REQUEST_BINDING_REQUIRED_CHECK, requiredChecksForDetectedQuality } from "../../../capability/src/actions.ts";
import { MANIFEST_PATH } from "../../src/install/manifest.ts";
import { plan } from "../../src/install/plan.ts";
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
	"install-sweep.yml",
];

/** Issue chooser and templates. */
const EXPECTED_ISSUE_TEMPLATES = ["request.yml", "epic.yml", "decision.yml", "config.yml", "configure.yml"];

/**
 * Workflows that run *in* this repository rather than being called from another.
 *
 * `install.yml` is callable so the App sweep reuses it rather than reimplementing the installation,
 * but it stays here too: it is dispatched by hand as well as called, and being callable does not stop
 * it running on its own.
 */
const NOT_CALLABLE = [
	"install.yml",
	"ci.yml",
	"branch-policy.yml",
	"deploy-docs.yml",
	"preview-docs.yml",
	// `install-sweep.yml` is not callable because it is the one workflow a consumer cannot want: it
	// enumerates *this* App's installations, which are the pipeline's own. A consumer calling it would
	// be asking the pipeline to install itself into the pipeline's installations, which it already does
	// on its own schedule.
	"install-sweep.yml",
];

/** Workflows that write to GitHub on the pipeline's behalf and must therefore authenticate as the App. */
const APP_AUTHENTICATED_WORKFLOWS = [
	"agent.yml",
	"install.yml",
	// Signs its App JWT in Bun rather than with `actions/create-github-app-token`, because that action
	// cannot enumerate installations. See `appAuthenticationEvidence`.
	"install-sweep.yml",
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

/**
 * How a workflow shows it authenticates as the App.
 *
 * Either the minting action, or an in-process App credential: a JWT or an installation token supplied
 * to `appIdentityFromManifest`. Returns the evidence so a failure names what was found rather than
 * only reporting a count.
 *
 * @param workflow A workflow parsed from `.github/workflows`.
 * @returns Step names or run-script fragments that evidence App authentication.
 */
function appAuthenticationEvidence(workflow: Workflow): string[] {
	const viaAction = stepsUsing(workflow, "actions/create-github-app-token").map(
		({ step }) => `action: ${step.name ?? "unnamed"}`,
	);
	// In-process, evidenced by the workflow handing a step the App's private key. That is the only way
	// to authenticate as the App without the action, and the key name is one declared fact rather than
	// a literal - so a workflow that spells the secret itself is caught here instead of being mistaken
	// for one that has it. Matching the *script's* contents was tried and is worse: the sweep delegates
	// to `sweep-main.ts`, so the evidence sat in a file rather than the workflow, and the check could
	// only pass if that file happened to name a symbol this one also knew about.
	const secretName = repoConfig().app.private_key_secret;
	const viaProcess = allSteps(workflow)
		.filter(({ step }) =>
			Object.values(step.env ?? {}).some((value) => String(value).includes(`secrets.${secretName}`)),
		)
		.map(({ step }) => `in-process: ${step.name ?? "unnamed"}`);
	return [...viaAction, ...viaProcess];
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

	// The loop: `report-failure.yml` fires on `workflow_run: completed` and opens a
	// `pipeline-failure`-labelled issue when a workflow fails. This job triggers on
	// `issues: [opened]` with no label filter, so it started on each of those, then failed on every
	// run because it ran `bun` with no `setup-bun` step. Each failure produced another issue. 100
	// consecutive Autonomous Agent failures and a 1,411-run Actions backlog came from this alone.
	it("test_the_agent_job_declines_the_pipelines_own_failure_reports: the loop needs one break", () => {
		const gate = String(agent.jobs["run-agent"]?.if ?? "");
		expect(gate, "the job must be gated, not a step: a step cannot skip the ones after it").toContain(
			"pipeline-failure",
		);
		expect(gate).toContain("github.event_name != 'issues'");
	});

	it("test_the_failure_report_gate_is_null_safe: dereferencing a missing event field fails the job", () => {
		// The first version of this gate read `github.event.issue.labels.*.name` unguarded. This
		// workflow also fires on `workflow_call` and `workflow_dispatch`, where there is no `issue`
		// object at all — and a job-level `if` that throws reports the run as **failure with zero
		// jobs**, which is exactly the shape of the 16 failures it caused while looking like the
		// loop it was meant to stop.
		const gate = String(agent.jobs["run-agent"]?.if ?? "");
		expect(gate).toContain("github.event.issue.labels == null");
		// And the guard has to precede the dereference it protects.
		expect(gate.indexOf("github.event.issue.labels == null")).toBeLessThan(
			gate.indexOf("contains(github.event.issue.labels.*.name"),
		);
	});

	it("test_the_agent_workflow_installs_bun_before_it_uses_it: bun is not on a stock runner", () => {
		// `Resolve target environment` runs `bun -e` on the host, before the agent container exists.
		// Without this the step died at `bun: command not found` (exit 127) on every single run.
		const stepsOfJob = steps(agent, "run-agent");
		const installs = stepsOfJob.findIndex((step) => step.uses?.includes("setup-bun"));
		const usesBun = stepsOfJob.findIndex((step) => step.run?.includes("bun "));
		expect(installs, "the job must install Bun").toBeGreaterThan(-1);
		expect(usesBun, "the job uses Bun on the host").toBeGreaterThan(-1);
		expect(installs, "Bun must be installed before the step that calls it").toBeLessThan(usesBun);
	});

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

	it("test_release_detects_the_paper_engine_from_the_tree: a probe cannot detect what it skips installing", () => {
		// The probe used to ask `command -v typst`, which is false on a stock runner, so the
		// conditional `setup-typst` was skipped and the build died at `typst: command not found`
		// (exit 127) — after the version was resolved. It decided not to install the thing whose
		// absence it was detecting.
		const probe = steps(release, "resolve").find((s) => s.name === "Detect the paper domain");
		expect(probe?.run).not.toContain("command -v");
		expect(probe?.run).toContain("main.typ");

		// The install must still be gated on the probe, and the build after it.
		const typed = steps(release, "resolve");
		const probeAt = typed.findIndex((s) => s.name === "Detect the paper domain");
		const installAt = typed.findIndex((s) => s.name === "Set up Typst");
		const buildAt = typed.findIndex((s) => s.name === "Build release assets");
		expect(installAt, "typst must be installed after detection").toBeGreaterThan(probeAt);
		expect(buildAt, "the build must come after the install").toBeGreaterThan(installAt);
		expect(typed[installAt]?.if).toContain("steps.paper.outputs.typst == 'true'");
	});

	it("test_the_paper_probe_would_still_fire_for_a_repository_that_has_one: it is not dead code", () => {
		// This repository no longer has a paper -- it moved to marius-patrik/DarkFactory-Paper -- so the
		// probe legitimately matches nothing here. What must stay true is that the probe still *would*
		// match a repository that has one, and that the install is still gated on it. Otherwise the
		// release would silently stop building a consumer's paper.
		//
		// Asserted by running the probe's own pattern against a synthetic tree rather than against this
		// repository, so the test does not become vacuous when the paper is absent.
		const probe = steps(release, "resolve").find((s) => s.name === "Detect the paper domain");
		expect(probe?.run).toContain("paper/main.typ");
		const typed = steps(release, "resolve");
		const installAt = typed.findIndex((s) => s.name === "Set up Typst");
		expect(typed[installAt]?.if).toContain("steps.paper.outputs.typst == 'true'");
	});

	it("test_both_resolve_steps_receive_the_requested_bump: the gate and the resolver must agree", () => {
		// The gate step (`versioning.ts`) and the resolve step (`cli.ts`) are two invocations of the
		// same decision. `cli.ts` reads `REQUESTED_BUMP` to decide what to release, so it needs the
		// request too — and it did not have it. An explicitly requested version therefore reached the
		// gate, which reported `warranted=true`, and then nothing was resolved, `notes.md` was never
		// written, and the run failed on `No files were found with the provided path`.
		//
		// `manual` mode hid it, because it resolves from `VERSION` and never consults the request.
		// Switching this repository to `zerover` made the request matter and the gap visible.
		const resolveSteps = steps(release, "resolve").filter((s) => /^Resolve /.test(s.name ?? ""));
		expect(resolveSteps.length).toBeGreaterThanOrEqual(2);
		for (const step of resolveSteps) {
			expect(step.env?.REQUESTED_BUMP, `${step.name} must receive REQUESTED_BUMP`).toBeDefined();
		}
	});

	it("test_the_publish_job_uses_the_App_token: GITHUB_TOKEN cannot open a pull request", () => {
		// `Record the released version` opens a pull request to record the release. GitHub withholds
		// `pull_requests: write` from the token a workflow gets for itself, so with `GITHUB_TOKEN` the
		// step died on every release with `GraphQL: Resource not accessible by integration
		// (createPullRequest)` — after the tag, the release and every asset were already published.
		// The App has `Pull requests: Read and write`; its installation token can.
		const publish = steps(release, "publish");
		const record = publish.find((s) => s.name === "Record the released version");
		expect(record?.env?.GH_TOKEN, "the App token must be preferred").toContain("steps.app-token.outputs.token");

		// And the step that mints it has to exist in this job, with the key test hoisted so a
		// step-level `if` can read it.
		const mint = publish.findIndex((s) => s.uses?.includes("create-github-app-token"));
		expect(mint, "the publish job must mint an installation token").toBeGreaterThan(-1);
		expect(release.jobs["publish"]?.env?.HAS_APP_KEY, "HAS_APP_KEY must be readable from a step `if`").toBeDefined();
		expect(publish[mint]?.if).toContain("HAS_APP_KEY");
		// Minting must precede the use.
		expect(mint).toBeLessThan(publish.indexOf(record as never));
	});

	it("test_release_workflow_tolerates_a_repository_with_no_build: a tag and notes, not a failure", () => {
		const scripts = workflowScripts(release);
		expect(scripts.includes("no assets") || scripts.includes("Nothing to build")).toBe(true);
	});
});

describe("branch roles", () => {
	// There is one branch. The integration branch `develop` was renamed onto `main`, so every
	// workflow follows the same ref and the promotion gate that asserted "a pull request into main
	// came from develop" went with it — it was unsatisfiable without a `develop` to require, and it
	// was the weaker of the two gates, so the surviving lane keeps the full one.
	it("test_every_workflow_follows_the_one_branch: quality and release share a trunk", () => {
		const identity = repoConfig().identity;
		expect(identity.default_branch).toBe("main");
		expect(identity.development_branch).toBe("main");
		for (const name of ["ci.yml", "project-automation.yml", "deploy-docs.yml", "release.yml"]) {
			const push = triggers(parseWorkflow(name)).push as { branches: string[] };
			expect(push.branches, `${name} must follow the trunk`).toEqual(["main"]);
		}
		const mergeGroup = triggers(parseWorkflow("ci.yml")).merge_group as { branches: string[] };
		expect(mergeGroup.branches).toEqual(["main"]);
	});

	it("test_the_promotion_gate_is_gone: nothing asserts a develop branch exists", () => {
		const policy = parseWorkflow("branch-policy.yml");
		expect(policy.jobs["main-source"], "main-source must not return").toBeUndefined();
		expect(Object.keys(policy.jobs)).toEqual(["reconcile"]);
		expect(triggers(policy).pull_request, "the pull_request trigger served only main-source").toBeUndefined();
		// The assertion that made it unsatisfiable must not survive in any form.
		expect(workflowSource("branch-policy.yml")).not.toContain('HEAD_BRANCH" = "develop"');
	});

	it("test_no_workflow_is_scoped_to_a_develop_branch: a dead trigger is a silent no-op", () => {
		for (const name of workflowNames()) {
			expect(workflowSource(name), `${name} still references a develop branch`).not.toMatch(/branches: \[develop\]/);
		}
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
			// How the App token is obtained, not which mechanism. Every workflow but `install-sweep.yml`
			// mints with `actions/create-github-app-token`, and requiring that action would have made
			// the sweep impossible: the action resolves *one* installation and exposes no way to
			// enumerate them, so `GET /app/installations` - which GitHub restricts to a JWT - is
			// unreachable through it. The sweep signs in Bun instead, using the same key.
			//
			// The rule being enforced underneath is that the workflow writes as the App and never
			// prefers a person's token; the mechanism is an implementation detail of how it gets there.
			// `USER_TOKEN_EXCEPTIONS` below is still what polices the preference, and it stays empty.
			expect(appAuthenticationEvidence(workflow), `${name} does not authenticate as the App`).not.toEqual([]);
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
	const stageStep = steps(install, "install").find((step) => step.name === "Stage what the installation wrote");

	// Quoted, the way the shell spells it: every one of the array as pathspecs, quoted so a path with a
	// space in it stays one pathspec. Assembled from parts because writing `${...}` inside a string
	// literal reads as a template to a linter and to a person skimming.
	const arrayExpansion = `"${"$"}{paths[@]}"`;

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

	// What the installation *stages* was the one thing nothing asserted. The step said
	// `git add .github repo.df`, and the manifest this pipeline writes is `repo.dfconfig`: an unmatched
	// pathspec is fatal to `git add`, the step ran under `bash -e`, and every run since 2026-09-25
	// aborted with no commit, no push and no pull request. Sixteen days, because a workflow_dispatch
	// nobody dispatched and no test read the staging step.
	//
	// The expected set is derived rather than written down, because a hardcoded copy is the same
	// defect one level down: `repo.dfconfig` written here would be right until the manifest is
	// renamed, and this suite's whole subject is artefacts that have drifted from the code that
	// generates them. So the claim has two halves and both are load-bearing. The generator reports
	// what it wrote - `install/main.ts` writes the list to `GITHUB_OUTPUT`, and
	// `test/install/install.test.ts` proves that list is every path `write`, `retarget` and
	// `reconcileManifest` produced - and the workflow stages that list rather than one of its own.
	// `MANIFEST_PATH` enters as a value, so renaming the manifest moves this assertion with it.
	it("test_the_staged_set_is_the_generator_list_rather_than_a_pathspec_written_here: repo.df was not a file", async () => {
		const planned = Object.keys(await plan({ owner: "o", repo: "r", ref: "abc", root: repoRoot }));
		expect(planned, "the manifest is planned, so it has to reach the stage").toContain(MANIFEST_PATH);
		expect(stageStep?.env?.WRITTEN_PATHS).toBe(expression("steps.generate.outputs.paths"));
		expect(stageStep?.run).toContain(arrayExpansion);
	});

	it("test_the_licence_is_staged_too_and_by_name: the licence step is a separate step and can delete", () => {
		// `applyLicence` writes LICENSE from the manifest's declaration rather than the generator
		// writing it, so the generator's list does not contain it, and its removal - what happens when
		// the declaration is NONE - is staged by naming the path regardless of whether it is there.
		expect(stageStep?.env?.LICENSE_SPDX).toBe(expression("steps.licence.outputs.spdx"));
		expect(stageStep?.run).toContain("LICENSE");
		expect(stageStep?.run, "a removal has to be staged as well as a write").toContain("git add -A");
	});

	it("test_no_git_add_names_a_pathspec_by_hand: an unmatched one is fatal and the step runs under -e", () => {
		// The `run:` scripts rather than the file, because a comment naming the broken pathspec is
		// worth keeping: it says why the array exists. Only executable text can reintroduce the list,
		// so that is what the absence is claimed against.
		const scripts = workflowScripts(install)
			.split("\n")
			.filter((line) => !line.trimStart().startsWith("#"))
			.join("\n");
		expect(scripts, "the list that broke every install since 2026-09-25").not.toContain("git add .github repo.df");
		expect(scripts, "the manifest is repo.dfconfig; repo.df is a file that has never existed").not.toMatch(
			/git add\b[^\n]*\brepo\.df\b/u,
		);
		// Every `git add` reads the array, so there is no second list for one to creep back into. An
		// empty array would stage the whole worktree and a partial one is a silent omission rather than
		// a failure, which is why the guard is on the shape of every add rather than on one of them.
		const adds = scripts.match(/git add[^\n]*/gu) ?? [];
		expect(adds.length, "the install must stage something").toBeGreaterThan(0);
		for (const add of adds) expect(add).toContain(arrayExpansion);
	});
});

describe("a workflow that runs repo-settings.ts supplies the token it demands", () => {
	// `repo-settings.ts` throws "no token: set GH_TOKEN or GITHUB_TOKEN" when neither is set, and
	// reads only those two names. `branch-policy.yml` exported `GH_PROJECT_TOKEN` and not `GH_TOKEN`,
	// so its reconcile job failed on every run that reached it — five merges in a row — and nothing
	// in the suite noticed, because no test compared a workflow's environment to a command's
	// requirement. Scoped to this command: a general contract check needs each command to declare
	// what it needs, which is a larger change than this defect warrants.
	const invocations = workflowNames().flatMap((name) => {
		const workflow = parseWorkflow(name);
		return allSteps(workflow)
			.filter(({ step }) => step.run?.includes("repo-settings.ts"))
			.map(({ job, step }) => ({ workflow: name, job, step }));
	});

	it("finds the invocations, so the guard is not vacuous", () => {
		expect(invocations.length).toBeGreaterThan(0);
	});

	it.each(invocations.map((i) => [i.workflow, i.job]))("%s / %s exports GH_TOKEN", (name, jobId) => {
		const workflow = parseWorkflow(name);
		const job = workflow.jobs[jobId];
		if (!job) throw new Error(`no job ${jobId} in ${name}`);
		const jobEnv = (job.env ?? {}) as Record<string, unknown>;
		const fromStep = invocations.find((i) => i.workflow === name && i.job === jobId);
		const stepEnv = (fromStep?.step.env ?? {}) as Record<string, unknown>;
		expect(
			jobEnv.GH_TOKEN ?? stepEnv.GH_TOKEN,
			`${name} / ${jobId} runs repo-settings.ts without GH_TOKEN or GITHUB_TOKEN in scope`,
		).toBeDefined();
	});
});

describe("install.yml is callable so the App sweep has one code path", () => {
	const install = parseWorkflow("install.yml");
	const calls = triggers(install).workflow_call as
		| {
				inputs?: Record<string, { type?: string; default?: unknown; required?: boolean }>;
				secrets?: Record<string, unknown>;
		  }
		| undefined;

	// Not vacuous. Without this the assertions below pass against a workflow that lost `workflow_call`
	// entirely, which is the failure this whole block exists to prevent.
	it("finds the workflow_call trigger, so the guard is not vacuous", () => {
		expect(calls).toBeDefined();
		expect(Object.keys(calls?.inputs ?? {})).toEqual(["repository", "ref", "apply-settings"]);
	});

	// The two triggers must agree on names, types and defaults. A sweep calling with `repository` while
	// the workflow reads `inputs.target` would install into nothing and report success, and the only
	// evidence would be a missing pull request in a consumer.
	it.each(["repository", "ref", "apply-settings"])("declares %s to both triggers with one meaning", (name) => {
		const dispatched = (triggers(install).workflow_dispatch as { inputs?: Record<string, unknown> } | undefined)
			?.inputs?.[name] as { type?: string; default?: unknown } | undefined;
		const called = calls?.inputs?.[name];

		expect(called, `${name} is dispatched but not callable`).toBeDefined();
		expect(called?.type, `${name} changes type between triggers`).toBe(dispatched?.type);
		expect(called?.default, `${name} changes default between triggers`).toEqual(dispatched?.default);
	});

	// Load-bearing, and the reason this is asserted rather than left to the caller. Under
	// `workflow_call` an input with no `default` evaluates to the empty string, so `if:
	// inputs.apply-settings` silently becomes false and every swept repository installs its callers
	// and quietly skips its labels, board and settings. Nothing would fail.
	it("gives apply-settings a default under workflow_call, or the settings step never runs", () => {
		expect(calls?.inputs?.["apply-settings"]?.default).toBe(true);
	});

	it("declares the App key secret, which the callable token-preference rule requires", () => {
		// `test_github_writes_prefer_the_installation_token` also checks that a workflow with a
		// `workflow_call` block declares `repoConfig().app.private_key_secret`. Without this the
		// workflow both fails that rule and cannot read the key when called with `secrets: inherit`
		// from a repository that has not declared it.
		expect(Object.keys(calls?.secrets ?? {})).toContain(repoConfig().app.private_key_secret);
	});

	it("keys concurrency on the target repository, so a matrix fan-out does not cancel itself", () => {
		// Under `workflow_call` every matrix job reports the *caller's* workflow name. A group keyed on
		// `github.workflow` would put all of them in one slot and run them serially at best.
		expect(install.concurrency?.group).toContain("inputs.repository");
		expect(install.concurrency?.group).not.toContain("github.workflow");
	});
});

describe("the App sweep", () => {
	const sweep = parseWorkflow("install-sweep.yml");

	it("polls on a schedule, because Actions cannot receive installation events", () => {
		// The premise of the whole workflow. `installation` and `installation_repositories` go to the
		// App, not to Actions, and there is no webhook receiver here - so without a schedule the sweep
		// would never run and "installing the App is enough" would be true of nothing.
		expect(Object.keys(triggers(sweep))).toContain("schedule");
		expect(Object.keys(triggers(sweep))).toContain("workflow_dispatch");
	});

	it("is not callable: it enumerates the pipeline's own App installations", () => {
		// A consumer calling this would be asking the pipeline to install itself into installations it
		// already sweeps hourly. The exemption is in `NOT_CALLABLE` and the reason is recorded there.
		expect(Object.keys(triggers(sweep))).not.toContain("workflow_call");
		expect(NOT_CALLABLE).toContain("install-sweep.yml");
	});

	// One code path. Two implementations would install differently the moment one changed, and a
	// consumer repository is where that difference becomes visible.
	it("calls install.yml rather than installing anything itself", () => {
		expect(sweep.jobs.install?.uses).toBe("./.github/workflows/install.yml");
		// The job that calls it cannot have steps, and `env`/`runs-on` are not permitted on such a job
		// at all - so anything it needs must arrive through `with` or `secrets`.
		expect(sweep.jobs.install?.steps).toBeUndefined();
		expect(sweep.jobs.install?.runsOn).toBeUndefined();
		expect(sweep.jobs.install?.["run-name"]).toBeUndefined();
	});

	it("passes the App key through to the install it calls", () => {
		const secrets = sweep.jobs.install?.secrets as Record<string, unknown> | undefined;
		expect(Object.keys(secrets ?? {})).toContain(repoConfig().app.private_key_secret);
		expect(Object.keys(secrets ?? {})).toContain("GH_PROJECT_TOKEN");
	});

	// The failure this prevents: `jobs.<id>.if` is evaluated *before* `strategy.matrix` applies, so it
	// cannot filter per entry. With no targets the matrix is empty, and an empty matrix on a job whose
	// `if` is false is the one combination GitHub rejects outright.
	it("gates the fan-out on has-targets, so an empty matrix never fails the run", () => {
		expect(sweep.jobs.install?.if).toContain("has-targets");
		expect(sweep.jobs.sweep?.outputs?.["has-targets"]).toBeDefined();
	});

	// Two sweeps racing would both see the same gap and both open a pull request for one repository.
	it("never overlaps itself", () => {
		expect(sweep.concurrency?.group).toContain("github.repository");
		expect(sweep.concurrency?.["cancel-in-progress"]).toBe(false);
	});

	it("is bounded, so a hung enumeration cannot hold the slot forever", () => {
		// Hyphenated in the workflow and camelCase in the parsed step shape, so it is read by its own name
		// rather than through a cast that would accept undefined.
		expect(sweep.jobs.sweep?.["timeout-minutes"]).toBeGreaterThan(0);
	});

	it("installs one repository at a time", () => {
		// Each entry opens a pull request in a repository a person owns. Twenty at once looks like an
		// attack rather than an installation.
		expect(sweep.jobs.install?.strategy?.["max-parallel"]).toBe(1);
		// One failure must not abandon the repositories behind it.
		expect(sweep.jobs.install?.strategy?.["fail-fast"]).toBe(false);
	});

	it("authenticates as the App without a person's token in the deciding step", () => {
		// `GH_TOKEN: ${{ secrets.GH_PROJECT_TOKEN }}` on the plan step would be a user token with no App
		// path at all, which is what `test_only_board_writes_reach_for_the_user_token_alone` forbids. The
		// App token can read contents, so the sweep needs no person's token to decide anything.
		const plan = allSteps(sweep).find(({ step }) => step.run?.includes("sweep-main.ts"));
		expect(plan?.step.env?.GH_TOKEN).toBeUndefined();
		expect(plan?.step.env?.[repoConfig().app.private_key_secret]).toContain("secrets.");
	});

	it("reports what it decided even when there was nothing to do", () => {
		// A sweep that found the App, installed nothing and said nothing is indistinguishable from a
		// broken one. `always()` because the report is most needed when a later step fails.
		const report = allSteps(sweep).find(({ step }) => step.name === "Report");
		expect(report?.step.if).toBe("always()");
	});
});

describe("the sweep's matrix matches what the install it calls accepts", () => {
	const sweep = parseWorkflow("install-sweep.yml");

	// The fan-out calls `install.yml`, whose `repository` input is declared `type: string`. GitHub
	// validates a called workflow's inputs when the job is *created*, so a matrix entry that is an
	// object rather than a slug fails the whole run at a point where the sweep job is already green and
	// there is no install job to click. The first live run produced exactly that: a successful sweep
	// reporting 25 targets, a failed run, and one job in it.
	it("passes matrix entries straight through as the repository string", () => {
		const with_ = sweep.jobs.install?.with as Record<string, unknown> | undefined;
		expect(with_?.repository).toBe("${{ matrix }}");
		// `matrix.repository` is only valid for object entries, which is the shape that gets rejected.
		expect(String(with_?.repository)).not.toContain("matrix.repository");
	});

	it("declares the matrix as a single named dimension, matching a scalar entry", () => {
		const matrix = sweep.jobs.install?.strategy?.matrix as Record<string, unknown> | undefined;
		expect(Object.keys(matrix ?? {})).toEqual(["repository"]);
		expect(matrix?.repository).toBe("${{ fromJson(needs.sweep.outputs.matrix) }}");
	});

	it("names the target in the job name from the same expression the input receives", () => {
		// Otherwise the log reads `install ${{ matrix.repository }}` - the literal template GitHub shows
		// for a job whose name could not be resolved, which is how this went undiagnosed for a run.
		expect(sweep.jobs.install?.name).toBe("install ${{ matrix }}");
	});
});

describe("the sweep emits slugs, not objects", () => {
	it("runSweep writes a JSON array of strings, which fromJson turns into scalars", () => {
		// Read from the source rather than from a live run: this is the shape `fromJson` will see, and
		// the contract the workflow above depends on.
		const source = readFileSync(join(repoRoot, "packages/harness/src/install/sweep-main.ts"), "utf8");
		const line = source.split("\n").find((l) => l.includes("plan.targets.map"));
		expect(line, "the matrix is not built with a .map over targets").toBeDefined();
		// `{ repository: ... }` here is the defect; a bare `target.slug` is the fix.
		expect(line).toContain("target.slug");
		expect(line).not.toMatch(/\{\s*repository:/u);
	});
});
