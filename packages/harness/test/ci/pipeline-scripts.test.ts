import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { CANONICAL_STATUSES } from "@darkfactory/protocol/workflow";
import { CHECKPOINT_FILENAME } from "../../src/board/checkpoint.ts";
import { CONFIG_MARKER } from "../../src/install/configuration-issue.ts";
import { TYPE_LABELS } from "../../src/pipeline/labels.ts";
import { labelTaxonomy, PIPELINE_ROLE_LABELS, STATUS_OPTIONS } from "../../src/settings/taxonomy.ts";
import {
	allSteps,
	declaredAreas,
	declaredSlug,
	issueTemplateDir,
	parseWorkflow,
	repoRoot,
	triggers,
} from "./pipeline-source.ts";

// Every invariant in this file used to have a *Python* subject: a declaration or a behaviour that
// lived in `.github/scripts/*.py`. With the Python gone each one has exactly one TypeScript owner, and
// this file now reads the declaration from there. None of the invariants was deleted, because none of
// them was ever about Python — the language was only ever where the declaration happened to sit.
//
// What is gone, and was not re-pointed, is the pair of assertions that compared two Python modules to
// each other (repo_settings' status options against project_automation's status names) and the four
// `test_script_exists` inventory checks. The first compared two copies of one list; with both copies
// in TypeScript the list has a single owner and `STATUS_OPTIONS` is asserted against
// `CANONICAL_STATUSES` directly, which is the stronger form of the same claim. The second asserted
// that four files exist, which is now a statement about a directory that must not exist.

/** Pipeline roles every taxonomy the automation can apply has to cover. */
const PIPELINE_ROLE_LABELS_REQUIRED = ["Request", "Plan", "epic", "decision"];

describe("df container credentials", () => {
	const agent = parseWorkflow("agent.yml");
	const declared = (triggers(agent).workflow_call as { secrets: Record<string, unknown> }).secrets;
	const container = allSteps(agent).find((entry) => entry.step.name === "Dispatch agent in container")?.step;

	it("test_agent_workflow_forwards_the_new_secrets_without_interpolation: the df secret list is the one agent.yml must declare", () => {
		// Read from the configuration document, which is where the account tables are declared. The
		// claim is unchanged — every declared account variable is declared for callers and forwarded to
		// the container — but it is now made against the declaration rather than against a constant
		// naming one repository's providers.
		const accounts = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8")).repo.accounts as {
			set: string[][];
			load: string[][];
		};
		const names = [
			...new Set([
				...accounts.set.map(([variable]) => variable as string),
				...accounts.load.map(([variable]) => variable as string),
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
	it("test_repo_settings_status_options_match_automation: one status taxonomy, every place", () => {
		// The claim this made — that the board's options and the automation's names are the same list
		// — is now the claim that there is one list, and that it is the protocol's.
		expect([...STATUS_OPTIONS]).toEqual([...CANONICAL_STATUSES]);
	});
});

describe("label taxonomy", () => {
	it("test_repo_settings_labels_cover_every_area_and_status: every label the pipeline applies exists", () => {
		// Areas are not baked in: `labelTaxonomy` takes them, so the taxonomy covers exactly the
		// areas this repository declares. Asserting the derivation is the claim; the statuses, types
		// and pipeline roles the module contributes itself are listed below.
		const areas = Object.keys(declaredAreas()).map((area) => `area:${area}`);
		const names = labelTaxonomy(areas.map((name) => ({ name, colour: "ededed", description: name }))).map(
			(label) => label.name,
		);

		for (const area of areas) {
			expect(names, `missing area label ${area}`).toContain(area);
		}
		for (const status of CANONICAL_STATUSES) {
			expect(names, `missing status label ${status}`).toContain(status);
		}
		for (const type of TYPE_LABELS) {
			expect(names, `missing type label ${type}`).toContain(type);
		}
		for (const role of PIPELINE_ROLE_LABELS_REQUIRED) {
			expect(names, `missing pipeline label ${role}`).toContain(role);
		}
		// The module declares the pipeline roles, so the required list is checked against it rather
		// than against a second copy of it written here.
		for (const role of PIPELINE_ROLE_LABELS_REQUIRED) {
			expect(
				PIPELINE_ROLE_LABELS.some((label) => label.name === role),
				`${role} must be a declared pipeline role label`,
			).toBe(true);
		}
	});
});

describe("shared repository settings", () => {
	it("test_repo_settings_enables_bot_pr_approval: every bot pull request stalls at REVIEW_REQUIRED without it", () => {
		const source = readFileSync(join(repoRoot, "packages/harness/src/ci/repo-settings.ts"), "utf8");
		for (const setting of [
			"can_approve_pull_request_reviews: true",
			"delete_branch_on_merge: true",
			"allow_auto_merge: true",
		]) {
			expect(source).toContain(setting);
		}
	});

	it("test_branch_protection_is_declared_not_hardcoded: the lanes come from the document", () => {
		// The Python hardcoded the two lanes: the development branch got the required checks, one
		// approval, strict branches and conversation resolution, and the stable branch separately.
		// `applyBranchProtection` then took one branch and one context list, so it could not express
		// either. All of it is now in `repo.protection.lanes`, including the field the ruleset payload
		// used to invent (`strict_required_status_checks_policy: true`) and the approvals the module
		// had no field for at all. The claim is that the code holds none of it.
		const source = readFileSync(join(repoRoot, "packages/harness/src/ci/protection.ts"), "utf8");
		for (const invented of ['"main"', "~DEFAULT_BRANCH", "main-source", "strict: true"]) {
			expect(source, `protection.ts still contains ${invented}`).not.toContain(invented);
		}
		// One branch, and the rest of the lane, arrive as one declared argument rather than defaults.
		expect(source).toContain("branch: string;");
		expect(source).toContain("strict?: boolean;");
		expect(source).toContain("approvals?: number;");
		expect(source).toContain("enforceAdmins?: boolean;");
		expect(source).toContain("resolveConversations?: boolean;");
	});

	it("test_this_repository_declares_both_lanes: a lane is a fact about the repository", () => {
		// Which branch is the integration lane and which is the release lane is not a property of the
		// pipeline, so it is asserted against this repository's document rather than in a test double.
		const document = JSON.parse(readFileSync(join(repoRoot, "repo.dfconfig"), "utf8"));
		const lanes = document.repo.protection.lanes as Array<Record<string, unknown>>;
		expect(lanes.length, "both the integration and the release lane are declared").toBe(2);
		const develop = lanes.find((lane) => lane.branch === "develop");
		const main = lanes.find((lane) => lane.branch === "main");
		expect(develop?.approvals, "the integration lane asks for a review").toBe(1);
		expect(develop?.strict).toBe(true);
		expect(develop?.resolve_conversations).toBe(true);
		expect(main?.approvals, "the release lane does not").toBe(0);
		expect(main?.enforce_admins).toBe(true);
		// The two lanes genuinely differ, which is the property the hardcoded version had to assert
		// against the Python's source text.
		expect(develop?.required_checks).not.toEqual(main?.required_checks);
	});

	it("test_an_unparseable_body_is_reported_rather_than_thrown: a lost response is retried, not fatal", () => {
		// The Python version of this invariant was about the `gh` subprocess losing a body to a curl
		// truncation. There is no subprocess and no curl here: the client fetches directly, so the
		// equivalent claim is that an unparseable body degrades to its raw text and a 5xx is
		// retryable, which is what stops one lost response from failing a whole run.
		const source = readFileSync(join(repoRoot, "packages/harness/src/github/client.ts"), "utf8");
		expect(source).toContain("function safeJson");
		expect(source).toContain("response.status >= 500");
		expect(source).toContain("X-GitHub-Api-Version");
	});

	it("test_repo_settings_can_configure_a_consumer_checkout: consumers carry no copy of these scripts", () => {
		const source = readFileSync(join(repoRoot, "packages/harness/src/ci/repo-settings.ts"), "utf8");
		expect(source).toContain("DARKFACTORY_REPO_ROOT");
		expect(source).toContain("new RepositoryManifest(repositoryRoot");
	});

	it("test_the_settings_script_honours_that_variable: the workflow and the script agree on the name", () => {
		const source = readFileSync(join(repoRoot, "packages/harness/src/ci/repo-settings.ts"), "utf8");
		expect(source).toContain("env.DARKFACTORY_REPO_ROOT");
	});
});

describe("runtime state that is never repository content", () => {
	it("test_gitignore_excludes_agent_checkpoint: the checkpoint file is runtime state", () => {
		expect(CHECKPOINT_FILENAME).toBeDefined();
		expect(readFileSync(join(repoRoot, ".gitignore"), "utf8")).toContain(CHECKPOINT_FILENAME);
	});
});

describe("the install marker", () => {
	it("test_the_configuration_template_carries_the_install_marker: a reinstall files no duplicate", () => {
		expect(CONFIG_MARKER).toBeDefined();
		expect(readFileSync(join(issueTemplateDir, "configure.yml"), "utf8")).toContain(CONFIG_MARKER);
		const filing = allSteps(parseWorkflow("install.yml")).find(
			(entry) => entry.step.name === "Open the configuration issue",
		)?.step.run;
		expect(filing?.match(/--search "([^"]+) in:body"/)?.[1]).toBe(
			CONFIG_MARKER.replace(/^<!--/, "").replace(/-->$/, "").trim(),
		);
	});
});

describe("no Python survives the port", () => {
	it("test_no_python_file_remains: the repository tracks no Python", () => {
		// The strongest form of the claim the old `test_script_exists` checks made in the other
		// direction: there is no per-file inventory to keep in step, because the answer is none.
		//
		// Asserted over what git tracks, not over the working directory. A local `.venv` holds
		// hundreds of `.py` files and holds them legitimately — it is a build artifact, it is
		// gitignored, and asserting the filesystem is empty of Python would fail for a reason that has
		// nothing to do with the repository.
		const tracked = Bun.spawnSync(["git", "-C", repoRoot, "ls-files", "*.py"], {
			cwd: repoRoot,
		})
			.stdout.toString()
			.split("\n")
			.filter((line) => line.length > 0);
		expect(tracked, "no Python is tracked").toEqual([]);
	});
});

/** Every TypeScript source under `packages/`, so the slug claim covers what replaced the scripts. */
function sourceFiles(): string[] {
	const found: string[] = [];
	const walk = (dir: string, prefix: string): void => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const relative = `${prefix}${entry.name}`;
			if (entry.isDirectory()) walk(join(dir, entry.name), `${relative}/`);
			else if (entry.name.endsWith(".ts")) found.push(relative);
		}
	};
	walk(join(repoRoot, "packages/harness/src"), "packages/harness/src/");
	return found;
}

describe("sources name only this repository", () => {
	it("test_no_script_defaults_to_another_repository: a stray run would aim at somebody else's repository", () => {
		const slug = declaredSlug();
		for (const name of sourceFiles()) {
			const source = readFileSync(join(repoRoot, name), "utf8");
			for (const match of source.matchAll(/"(marius-patrik\/[A-Za-z0-9_.-]+)"/g)) {
				expect(match[1], `${name} names ${match[1]}, but this repository is ${slug}`).toBe(slug);
			}
		}
	});
});
