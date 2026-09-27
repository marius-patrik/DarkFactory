import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_STATUSES } from "@darkfactory/protocol/workflow";
import {
	allSteps,
	declaredAreas,
	declaredSlug,
	issueTemplateDir,
	parseWorkflow,
	repoRoot,
	scriptNames,
	scriptSource,
	triggers,
} from "./pipeline-source.ts";

// Every invariant in this file has a *Python* subject: a declaration or a behaviour that lives in
// `.github/scripts/*.py`. They are here, in TypeScript, rather than in a suite that is about to be
// deleted, so that removing the file that used to own them does not remove them.
//
// Two of them (the status taxonomy and the df credential list) are *sync* invariants: the claim is
// that a second declaration agrees with the one that produces it. Reading a declared list out of a
// Python module is the only way to keep that claim while the producer is still Python. Both are
// deliberately narrow - a declared constant, not the module's behaviour - so the claim disappears
// the moment the producer does, rather than dragging a whole file along with it.
//
// When `.github/scripts/` is removed, every test here moves to the TypeScript owner of the same
// declaration. None of them may simply be deleted: the seven invariants in
// `tests/test_pipeline_config.py` that exercised `repo_settings.py` *behaviour* - its idempotent
// protection sync and its per-call token chooser - have no TypeScript implementation anywhere in
// this repository, so nothing here can port them.

/** The automation scripts the workflows invoke. */
const EXPECTED_SCRIPTS = ["agent_runner.py", "handle_pr_approval.py", "project_automation.py", "repo_settings.py"];

/** Pipeline roles every taxonomy the automation can apply has to cover. */
const PIPELINE_ROLE_LABELS = ["Request", "Plan", "epic", "decision"];

/** The strings a module-level `NAME: List[str] = [...]` declaration is made of. */
function declaredStrings(source: string, name: string): string[] {
	const declaration = source.match(new RegExp(`^${name}(?::[^=]+)?[ \\t]*=[ \\t]*\\[([^\\]]*)\\]`, "m"));
	if (!declaration) throw new Error(`no ${name} list declared`);
	return [...(declaration[1] as string).matchAll(/"([^"]*)"/g)].map((match) => match[1] as string);
}

/** The first element of every tuple in a module-level `NAME = ( (...), ... )` declaration. */
function declaredTupleHeads(source: string, name: string): string[] {
	const declaration = source.match(new RegExp(`^${name}(?::[^=]+)?[ \\t]*=[ \\t]*\\(([\\s\\S]*?)\\n\\)`, "m"));
	if (!declaration) throw new Error(`no ${name} tuples declared`);
	return [...(declaration[1] as string).matchAll(/\(\s*"([^"]+)"/g)].map((match) => match[1] as string);
}

/** The first element of every `("name", ...)` triple in the label taxonomy. */
function declaredLabelNames(source: string): string[] {
	const declaration = source.match(/^LABELS: List\[Sequence\[str\]\] = \[([\s\S]*?)\n\]/m);
	if (!declaration) throw new Error("no LABELS taxonomy declared");
	return [...(declaration[1] as string).matchAll(/\(\s*"([^"]+)"/g)].map((match) => match[1] as string);
}

describe("automation script inventory", () => {
	for (const name of EXPECTED_SCRIPTS) {
		it(`test_script_exists: ${name}`, () => {
			expect(existsSync(join(repoRoot, ".github", "scripts", name))).toBe(true);
		});
	}
});

describe("df container credentials", () => {
	const agentRunner = scriptSource("agent_runner.py");
	const agent = parseWorkflow("agent.yml");
	const declared = (triggers(agent).workflow_call as { secrets: Record<string, unknown> }).secrets;
	const container = allSteps(agent).find((entry) => entry.step.name === "Dispatch agent in container")?.step;

	it("test_agent_workflow_forwards_the_new_secrets_without_interpolation: the df secret list is the one agent.yml must declare", () => {
		// `agent_runner.df_setup_secret_names()`: the `df account set` keys, then the
		// `df account load` records, without repeats.
		const names = [
			...new Set([
				...declaredTupleHeads(agentRunner, "DF_ACCOUNT_SET_MAP"),
				...declaredTupleHeads(agentRunner, "DF_ACCOUNT_LOAD_MAP"),
			]),
		];
		expect(names.length).toBeGreaterThan(0);
		for (const secret of names) {
			expect(Object.keys(declared), `${secret} must be declared for callers`).toContain(secret);
			expect(container?.env?.[secret], `${secret} must reach the container through step env`).toBe(
				`\${{ secrets.${secret} }}`,
			);
			expect(container?.run).toContain(`-e ${secret}`);
		}
	});
});

describe("status taxonomy sync", () => {
	it("test_repo_settings_status_options_match_automation: one status taxonomy, three places", () => {
		const boardOptions = declaredStrings(scriptSource("repo_settings.py"), "STATUS_OPTIONS");
		const automationNames = declaredStrings(scriptSource("project_automation.py"), "STATUS_NAMES");
		expect(boardOptions).toEqual(automationNames);
		expect(boardOptions).toEqual([...CANONICAL_STATUSES]);
	});
});

describe("label taxonomy", () => {
	it("test_repo_settings_labels_cover_every_area_and_status: every label the pipeline applies exists", () => {
		const agentRunner = scriptSource("agent_runner.py");
		const settings = scriptSource("repo_settings.py");
		// Areas are not baked into the module: they are appended from the one manifest declaration,
		// so the taxonomy covers exactly the areas this repository declares. Asserting the
		// derivation is the claim; the literal below is what the module contributes itself.
		expect(settings).toContain("LABELS.extend(MANIFEST.area_labels)");
		const labelNames = [...declaredLabelNames(settings), ...Object.keys(declaredAreas()).map((area) => `area:${area}`)];
		for (const area of Object.keys(declaredAreas())) {
			expect(labelNames, `missing area label ${area}`).toContain(`area:${area}`);
		}
		for (const status of CANONICAL_STATUSES) {
			expect(labelNames, `missing status label ${status}`).toContain(status);
		}
		for (const type of declaredStrings(agentRunner, "TYPE_LABELS")) {
			expect(labelNames, `missing type label ${type}`).toContain(type);
		}
		for (const role of PIPELINE_ROLE_LABELS) {
			expect(labelNames, `missing pipeline label ${role}`).toContain(role);
		}
	});
});

describe("shared repository settings", () => {
	const source = scriptSource("repo_settings.py");

	it("test_repo_settings_enables_bot_pr_approval: every bot pull request stalls at REVIEW_REQUIRED without it", () => {
		for (const setting of [
			'"can_approve_pull_request_reviews": True',
			'"delete_branch_on_merge": True',
			'"allow_auto_merge": True',
		]) {
			expect(source).toContain(setting);
		}
	});

	it("test_branch_protection_models_both_branch_roles: the release lane and integration lane differ", () => {
		expect(source).toContain("MANIFEST.default_branch");
		expect(source).toContain("MANIFEST.development_branch");
		expect(source).toContain('"main-source"');
	});

	it("test_repository_settings_fall_back_from_opaque_gh_api_failures: a lost response body retries through REST", () => {
		for (const fragment of [
			'"unexpected end of JSON input"',
			'"curl"',
			'"--fail-with-body"',
			'"X-GitHub-Api-Version: 2026-03-10"',
		]) {
			expect(source).toContain(fragment);
		}
	});

	it("test_repo_settings_can_configure_a_consumer_checkout: consumers carry no copy of these scripts", () => {
		expect(source).toContain("DARKFACTORY_REPO_ROOT");
		expect(source).toContain("manifest_module.load(REPO_ROOT)");
	});

	it("test_the_settings_script_honours_that_variable: the workflow and the script agree on the name", () => {
		expect(source).toContain('os.environ.get("DARKFACTORY_REPO_ROOT")');
	});

	it("test_a_failed_project_lookup_never_creates_a_board: absence must be distinguished from an unread listing", () => {
		expect(source).toContain("class LookupFailed");
		expect(source.split("except LookupFailed").length - 1).toBeGreaterThanOrEqual(3);
	});

	it("test_no_gh_call_in_repo_settings_bypasses_the_token_chooser: reaching for subprocess picks the wrong identity", () => {
		const calls = scriptSource("repo_settings.py")
			.split("subprocess.run(")
			.slice(1)
			// The definition of the chooser itself is not a call site.
			.filter((block) => !block.slice(0, 200).includes("def _env_for"));
		expect(calls.length).toBeGreaterThan(0);
		for (const block of calls) {
			const end = block.indexOf("\n    )");
			const head = block.slice(0, end === -1 ? 400 : end);
			expect(head, `a gh call chooses no token: ${head.slice(0, 120)}`).toContain("env=_env_for(");
		}
	});
});

describe("runtime state that is never repository content", () => {
	it("test_gitignore_excludes_agent_checkpoint: the checkpoint file is runtime state", () => {
		const checkpoint = scriptSource("agent_runner.py").match(/^CHECKPOINT_FILENAME = "([^"]+)"/m)?.[1];
		expect(checkpoint).toBeDefined();
		expect(readFileSync(join(repoRoot, ".gitignore"), "utf8")).toContain(checkpoint as string);
	});
});

describe("the install marker", () => {
	it("test_the_configuration_template_carries_the_install_marker: a reinstall files no duplicate", () => {
		const marker = scriptSource("install.py").match(/^CONFIG_MARKER = "([^"]+)"/m)?.[1];
		expect(marker).toBeDefined();
		expect(readFileSync(join(issueTemplateDir, "configure.yml"), "utf8")).toContain(marker as string);
		const filing = allSteps(parseWorkflow("install.yml")).find(
			(entry) => entry.step.name === "Open the configuration issue",
		)?.step.run;
		expect(filing?.match(/--search "([^"]+) in:body"/)?.[1]).toBe(
			(marker as string).replace(/^<!--/, "").replace(/-->$/, "").trim(),
		);
	});
});

describe("scripts name only this repository", () => {
	it("test_no_script_defaults_to_another_repository: a stray run would aim at somebody else's repository", () => {
		const slug = declaredSlug();
		for (const name of scriptNames()) {
			for (const match of scriptSource(name).matchAll(/"(marius-patrik\/[A-Za-z0-9_.-]+)"/g)) {
				expect(match[1], `${name} names ${match[1]}, but this repository is ${slug}`).toBe(slug);
			}
		}
	});
});
