import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_STATUSES } from "@darkfactory/protocol/workflow";
import { computeRequiredChecks } from "../../src/ci/protection.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { json, scripted } from "../github/helpers.ts";
import {
	allSteps,
	declaredAreas,
	declaredSlug,
	issueTemplateDir,
	parseWorkflow,
	repoConfig,
	repoRoot,
	triggers,
} from "./pipeline-source.ts";

// Every invariant in this file used to have a *Python* subject: a declaration or a behaviour that
// lived in `.github/scripts/*.py`. #1148 removed that directory, so each claim below is now made
// against whatever survives to own it. None of the claims was about the language - the language was
// only ever where the declaration happened to sit - so none of them is deleted here.
//
// What is genuinely gone, and is recorded rather than re-pointed, is the pair of assertions that
// existed only to compare two Python modules to each other or to assert four files were present:
//
//   - `repo_settings.STATUS_OPTIONS` against `project_automation.STATUS_NAMES` compared two copies
//     of one list. With both copies in TypeScript the list has a single owner, `CANONICAL_STATUSES`,
//     and the surviving claim is the stronger one: the *other* copies of the taxonomy that do still
//     exist (the graph schema's status enum, and the labels the pipeline's own templates apply)
//     agree with it. That still fails on real drift, in either direction.
//   - the four `test_script_exists` cases asserted that four specific files exist, which is now a
//     statement about a directory that must not exist. The inventory is replaced by its inverse:
//     no Python is tracked at all.
//
// `repo_settings.py`'s *behaviour* - the idempotent protection sync, the per-call token chooser, the
// board-lookup failure distinction - had no TypeScript implementation anywhere on develop, so the
// invariants that read its source text could not be re-pointed. The two that had a real surviving
// owner are re-expressed against it; the rest are dropped and named in the deletion record below.

// **Deleted with the Python, and not re-pointed** (no surviving owner on develop):
//   test_repo_settings_enables_bot_pr_approval          - the three merge settings are applied by
//     `repo_settings.py` alone; nothing in TypeScript sets them, so there is no declaration left to
//     assert about.
//   test_repo_settings_can_configure_a_consumer_checkout /
//   test_the_settings_script_honours_that_variable      - `DARKFACTORY_REPO_ROOT` was read by
//     `repo_settings.py`. The workflows still set it, and `repository-governance.test.ts` still
//     asserts they do, but with the reader gone the variable names nothing.
//   test_a_failed_project_lookup_never_creates_a_board   - `LookupFailed` is a Python exception.
//   test_no_gh_call_in_repo_settings_bypasses_the_token_chooser - there is no subprocess and no
//     chooser in TypeScript; the client takes its token as an argument instead.

/** Pipeline roles every taxonomy the automation can apply has to cover. */
const PIPELINE_ROLE_LABELS = ["Request", "Plan", "epic", "decision"];

/**
 * Secrets a `workflow_call` caller never has to declare, because Actions or an earlier step
 * provides them: the automatic token, and the two this workflow mints or derives itself.
 */
const PROVIDED_BY_ACTIONS = new Set(["GITHUB_TOKEN", "GH_TOKEN"]);

/** The graph schema's status enum, the surviving second copy of the status taxonomy. */
function schemaStatusEnum(): string[] {
	const schema = JSON.parse(readFileSync(join(repoRoot, "packages/harness/src/graph/graph.schema.json"), "utf8")) as {
		$defs: { status: { enum: string[] } };
	};
	return schema.$defs.status.enum;
}

/** The statuses DF-RULE-009 states in prose, in document order. */
function declaredRuleStatuses(): string[] {
	const rule = readFileSync(join(repoRoot, ".agents/rules/009-issue-binding-and-board-status.md"), "utf8");
	const states = (rule.split("seven states:")[1] ?? "").replace(/^\s+/, "").split("\n\n")[0] ?? "";
	return [...states.matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1] as string);
}

/** Every label the pipeline's own issue templates apply. */
function templateLabels(): string[] {
	const applied: string[] = [];
	for (const name of readdirSync(issueTemplateDir)) {
		if (!name.endsWith(".yml")) continue;
		const declared = (Bun.YAML.parse(readFileSync(join(issueTemplateDir, name), "utf8")) as { labels?: string[] })
			.labels;
		applied.push(...(declared ?? []));
	}
	return applied;
}

describe("no Python survives the port", () => {
	it("test_no_python_file_remains: the repository tracks no Python", () => {
		// The inverse of the four `test_script_exists` cases this replaces, and the claim #1148 is
		// actually about. Asserted over what git tracks, not over the working directory: a local
		// `.venv` holds hundreds of `.py` files legitimately, and asserting the filesystem were
		// empty of Python would fail for a reason that has nothing to do with the repository.
		const tracked = Bun.spawnSync(["git", "-C", repoRoot, "ls-files", "*.py"], { cwd: repoRoot })
			.stdout.toString()
			.split("\n")
			.filter((line) => line.length > 0);
		expect(tracked, "no Python is tracked").toEqual([]);
	});

	it("test_no_automation_script_directory_remains: the Python scripts were its whole contents", () => {
		// The workflows that used to resolve `${PIPELINE_SCRIPTS:-.github/scripts}` now have no
		// scripts to resolve, so a directory reappearing here would be a partial revert.
		const tracked = Bun.spawnSync(["git", "-C", repoRoot, "ls-files", ".github/scripts"], { cwd: repoRoot })
			.stdout.toString()
			.split("\n")
			.filter((line) => line.length > 0);
		expect(tracked, "no automation script is tracked").toEqual([]);
	});
});

describe("df container credentials", () => {
	const agent = parseWorkflow("agent.yml");
	const declared = (triggers(agent).workflow_call as { secrets: Record<string, unknown> }).secrets;
	const container = allSteps(agent).find((entry) => entry.step.name === "Dispatch agent in container")?.step;
	const steps = allSteps(agent).map((entry) => entry.step);

	it("test_agent_workflow_forwards_the_new_secrets_without_interpolation: the df secret list is the one agent.yml must declare", () => {
		// The claim is unchanged and still points at a real drift: every secret `agent.yml` offers
		// callers must be consumed by some step. Secrets do not cross a `workflow_call` boundary on
		// their own, so a declared-but-unused credential is a declaration nobody can rely on, and a
		// step reading a secret that was never declared is a name that resolves to nothing.
		//
		// It used to be driven by `agent_runner.df_setup_secret_names()`. That function is gone, so
		// the workflow is read from both ends instead: every declared secret must be consumed, and
		// every secret any step consumes must be declared. Either direction failing is the drift.
		const names = Object.keys(declared);
		expect(names.length, "agent.yml declares secrets for callers").toBeGreaterThan(0);
		for (const secret of names) {
			const consumedByContainer =
				container?.env?.[secret] !== undefined && (container?.run ?? "").includes(`-e ${secret}`);
			const consumedElsewhere = steps
				.filter((step) => step !== container)
				.some(
					(step) => JSON.stringify(step.with ?? {}).includes(secret) || JSON.stringify(step.env ?? {}).includes(secret),
				);
			expect(
				consumedByContainer || consumedElsewhere,
				`${secret} is declared for callers but no step consumes it`,
			).toBe(true);
		}
		// The reverse direction, for the secrets a repository has to declare rather than inherit:
		// `GITHUB_TOKEN` and the tokens minted from the App key are provided by Actions or by an
		// earlier step, so only a *declared* name is checked for a stray reader.
		for (const step of steps) {
			for (const secret of Object.keys(step.env ?? {})) {
				if (PROVIDED_BY_ACTIONS.has(secret)) continue;
				if ((step.env?.[secret] as string | undefined)?.includes("secrets.")) {
					expect(names, `${step.name} reads undeclared ${secret}`).toContain(secret);
				}
			}
		}
	});

	it("test_agent_credentials_reach_the_container_through_the_environment_not_the_script: an expression is pasted before the shell runs", () => {
		// The `no interpolation` half of the invariant's name, and the reason it was ever written.
		// The agent's own API keys must appear as `${{ secrets.X }}` in the step environment and as
		// a bare `-e X` in the run text - never as a value spliced into the script, where a login
		// file's JSON loses its quotes and a `$(...)` would execute.
		const forwarded = Object.keys(container?.env ?? {}).filter((name) =>
			((container?.env?.[name] as string | undefined) ?? "").includes("secrets."),
		);
		expect(forwarded.length, "the container is given credentials").toBeGreaterThan(0);
		// The `docker run` flags, one per line: a bare `-e NAME` continues the line with a `\`, and
		// any `-e NAME=value` splices a value into the script before the shell ever sees it.
		const flags = (container?.run ?? "").split("\n").map((line) => line.trim());
		for (const secret of forwarded) {
			const value = container?.env?.[secret] as string;
			expect(value, `${secret} must be an expression, never a literal`).toMatch(/^\$\{\{.+\}\}$/);
			// A credential reaches the container by name; the value stays in the environment where
			// Actions interpolates it, and never appears in the script text.
			expect(flags, `${secret} must be passed by name, not by value`).toContain(`-e ${secret} \\`);
			expect(container?.run, `${secret} must not be pasted as a value`).not.toContain(`-e ${secret}=`);
		}
	});
});

describe("status taxonomy sync", () => {
	it("test_repo_settings_status_options_match_automation: one status taxonomy, every place", () => {
		// The two Python copies of this list are gone, so the claim is the one that actually needs
		// making now: every surviving place the status list is written down agrees with the single
		// owner. Two places still restate it and can still drift from it - the graph schema's
		// hand-maintained enum, and the rule that states the canonical model in prose - and the
		// statuses the issue templates apply are drawn from the same list.
		const statuses: string[] = [...CANONICAL_STATUSES];
		expect(schemaStatusEnum()).toEqual(statuses);
		expect(
			declaredRuleStatuses(),
			"DF-RULE-009 states the canonical statuses in prose and must list the same seven",
		).toEqual(statuses);
		for (const label of templateLabels()) {
			if (label.startsWith("area:") || PIPELINE_ROLE_LABELS.includes(label)) continue;
			expect(statuses, `${label} is applied but is not a canonical status`).toContain(label);
		}
	});
});

describe("label taxonomy", () => {
	it("test_repo_settings_labels_cover_every_area_and_status: every label the pipeline applies exists", () => {
		// The surviving owners are the protocol's statuses, `repo.dfconfig`'s areas, and the
		// pipeline-role labels. The claim is that the taxonomy covers exactly the areas this
		// repository declares, and that the statuses and roles the pipeline itself applies are
		// drawn from the same lists rather than spelled out beside them.
		const areas = Object.keys(declaredAreas()).map((area) => `area:${area}`);
		const statuses: string[] = [...CANONICAL_STATUSES];
		const taxonomy = new Set([...areas, ...statuses, ...PIPELINE_ROLE_LABELS]);
		expect(areas.length, "the repository declares areas").toBeGreaterThan(0);
		expect(statuses.length, "the protocol declares statuses").toBeGreaterThan(0);

		// Areas are not baked in anywhere: they are derived from `repo.dfconfig`, so the taxonomy
		// covers exactly the areas this repository declares. The claim is that derivation, plus the
		// other direction - every label the pipeline actually applies is one the taxonomy declares,
		// so a template cannot file an issue under a label no reconcile would ever create.
		const applied = templateLabels();
		expect(applied.length, "the pipeline applies labels through its issue templates").toBeGreaterThan(0);
		for (const label of applied) {
			expect(taxonomy, `${label} is applied but belongs to no taxonomy`).toContain(label);
		}
		// And that the areas the repository declares are reachable, rather than a taxonomy padded
		// with areas the pipeline never files under: every area a template names is a real area.
		for (const label of applied) {
			if (!label.startsWith("area:")) continue;
			expect(areas, `${label} is applied but no area declares it`).toContain(label);
		}
	});
});

describe("shared repository settings", () => {
	it("test_branch_protection_models_both_branch_roles: the release lane and integration lane differ", () => {
		// `repo_settings.py` read both lanes out of `repo.dfconfig` and named them per role.
		// `applyBranchProtection` still takes a single branch and a context list, so it cannot
		// express a lane on its own; the claim that survives on develop is that it hardcodes
		// neither branch, because a branch name baked into the code is a branch the repository
		// cannot change without editing the pipeline.
		const source = readFileSync(join(repoRoot, "packages/harness/src/ci/protection.ts"), "utf8");
		expect(source, "protection.ts must not name a release lane").not.toContain('"main-source"');
		expect(source, "protection.ts must take its branch as an argument").toContain("branch?: string;");
		// The branch is still defaulted in the payload, so the claim is about the argument existing
		// and about `computeRequiredChecks` deriving contexts rather than naming them.
		expect(computeRequiredChecks([])).toEqual([]);
	});

	it("test_a_failed_project_lookup_never_creates_a_board: absence must be distinguished from an unread listing", async () => {
		// The Python raised `LookupFailed` and handled it in three places, so a transient API
		// failure could not read as "the board does not exist" and create a second one. The
		// equivalent claim against the TypeScript client is that a response it could not parse
		// degrades to its raw text rather than throwing - an unread listing stays unreadable, and
		// is never silently turned into an empty success.
		const { fetch } = scripted([
			new Response('{"a":', { status: 200, headers: { "content-type": "application/json" } }),
		]);
		const client = new GitHubClient({ token: "test-token", fetch, maxRetries: 0 });
		const value = await client.rest<unknown>("GET", "/repos/o/r/projects");
		expect(value, "an unparseable body is returned raw, not thrown and not faked empty").toBe('{"a":');
	});

	it("test_repository_settings_fall_back_from_opaque_gh_api_failures: a lost response body retries through REST", async () => {
		// There is no `gh` subprocess and no `curl` here: the client fetches directly. The claim
		// that stops one lost response from failing a whole run is that a 5xx is classified
		// retryable, and it is asserted against the classifier rather than against source text.
		const { fetch, calls } = scripted([json({ message: "boom" }, 500), json({ ok: true }, 200)]);
		const client = new GitHubClient({ token: "test-token", fetch, maxRetries: 1, random: () => 0 });
		expect(await client.rest<{ ok: boolean }>("GET", "/repos/o/r")).toEqual({ ok: true });
		expect(calls.length, "a 5xx is retried rather than thrown").toBe(2);
	});
});

describe("runtime state that is never repository content", () => {
	it("test_gitignore_excludes_agent_checkpoint: the checkpoint file is runtime state", () => {
		// This invariant was never about Python. The runner wrote the checkpoint at a path it
		// declared, and `.gitignore` had to exclude that same path; with the runner gone the name
		// survives only in `.gitignore`, so the claim is the one that still holds and is still
		// falsifiable: the path the pipeline used to write is excluded, and nothing tracked in the
		// repository is named like it.
		const gitignore = readFileSync(join(repoRoot, ".gitignore"), "utf8");
		expect(gitignore, "the agent checkpoint is runtime state").toContain(".antigravity_checkpoint.json");
		const tracked = Bun.spawnSync(["git", "-C", repoRoot, "ls-files", "*checkpoint*"], { cwd: repoRoot })
			.stdout.toString()
			.split("\n")
			.filter((line) => line.length > 0);
		expect(tracked, "no checkpoint is repository content").toEqual([]);
	});
});

describe("the install marker", () => {
	it("test_the_configuration_template_carries_the_install_marker: a reinstall files no duplicate", () => {
		// The marker used to be a constant in `install.py`. The concept survives in the two
		// artefacts that actually have to agree - the template that carries the marker and the
		// workflow that searches for it - so the claim is re-made between those two: the search
		// the installer runs must find the marker the template writes, or a reinstall files a
		// second configuration issue instead of finding the first.
		const template = readFileSync(join(issueTemplateDir, "configure.yml"), "utf8");
		const marker = template.match(/<!--\s*(darkfactory: configuration)\s*-->/)?.[1];
		expect(marker, "the configuration template carries the install marker").toBeDefined();
		const filing = allSteps(parseWorkflow("install.yml")).find(
			(entry) => entry.step.name === "Open the configuration issue",
		)?.step.run;
		expect(filing?.match(/--search "([^"]+) in:body"/)?.[1]).toBe(marker);
	});
});

describe("sources name only this repository", () => {
	it("test_no_script_defaults_to_another_repository: a stray run would aim at somebody else's repository", () => {
		// The Python scripts are gone; the TypeScript that replaced them is what can still name a
		// repository. Read over every source file under the harness rather than an inventory of
		// file names, so the claim covers what replaced the scripts without a list to keep in step.
		const slug = declaredSlug();
		const root = join(repoRoot, "packages/harness/src");
		const found: string[] = [];
		const walk = (directory: string, prefix: string): void => {
			for (const entry of readdirSync(directory, { withFileTypes: true })) {
				const relative = `${prefix}${entry.name}`;
				if (entry.isDirectory()) walk(join(directory, entry.name), `${relative}/`);
				else if (entry.name.endsWith(".ts")) found.push(relative);
			}
		};
		walk(root, "packages/harness/src/");
		expect(found.length, "the harness sources are walked").toBeGreaterThan(0);
		for (const name of found) {
			const source = readFileSync(join(repoRoot, name), "utf8");
			for (const match of source.matchAll(/"(marius-patrik\/[A-Za-z0-9_.-]+)"/g)) {
				expect(match[1], `${name} names ${match[1]}, but this repository is ${slug}`).toBe(slug);
			}
		}
	});
});

describe("the repository declares itself", () => {
	it("test_repo_config_names_this_repository: the identity block is what every other claim reads", () => {
		// The label and status claims above read `repo.dfconfig` for areas and for the slug. If
		// that block stopped naming this repository they would be reading the wrong repository
		// rather than failing, so it is checked against the git remote it claims to describe.
		const identity = repoConfig().identity;
		const remote = Bun.spawnSync(["git", "-C", repoRoot, "remote", "get-url", "origin"], { cwd: repoRoot })
			.stdout.toString()
			.trim()
			.replace(/\.git$/, "");
		const fromRemote = remote.match(/github\.com[:/]([^/]+\/[^/]+)$/)?.[1];
		if (fromRemote === undefined) return; // No GitHub remote to check against; nothing to claim.
		expect(`${identity.owner}/${identity.repo}`).toBe(fromRemote);
	});
});
