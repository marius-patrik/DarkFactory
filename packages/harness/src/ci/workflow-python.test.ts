import { describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { resolveConfigDocumentPath } from "@darkfactory/protocol/config-document";
import { allSteps, parseWorkflow, repoRoot, workflowNames, workflowSource } from "../../test/ci/pipeline-source.ts";

/**
 * The pipeline's own workflows, and the Python they must no longer run.
 *
 * Removing Python from the repository is blocked by the thing that runs it, not by the scripts
 * themselves: a step that shells out to `python` needs an interpreter the pipeline must keep
 * installing. These claims are about the *invocation*, not about the script behind it. A step that
 * reaches its owner through `bun` or `jq` has no interpreter; a step that does not is work this
 * pass did not finish, and the list below is what is left.
 *
 * The list is the point. It is a countable remainder rather than a description, so a step that
 * silently comes back — or one that quietly appears — is a failing claim rather than something a
 * reviewer has to notice.
 */

/** A step's `run` body reaches a Python interpreter. */
const RUNS_PYTHON = /(^|[\s|;&(])(python3?|pip3?)(\s|$)/m;

/** Every step of every job of one workflow that reaches Python, as `job / step name`. */
function pythonSteps(workflow: string): string[] {
	return allSteps(parseWorkflow(workflow))
		.filter((entry) => entry.step.run && RUNS_PYTHON.test(entry.step.run))
		.map((entry) => `${entry.job} / ${entry.step.name ?? "(unnamed)"}`);
}

/** The `push.paths` filter of one workflow, as declared. */
function pushPathFilter(workflow: string): string[] {
	const declared = parseWorkflow(workflow).on ?? (parseWorkflow(workflow) as Record<string, unknown>).true;
	const push = (declared as { push?: { paths?: string[] } }).push;
	return push?.paths ?? [];
}

/**
 * The steps that still shell out to Python, and why each one is still here.
 *
 * `ci.yml` is the surprising entry and is deliberate: its `python` matrix axis exists to test a
 * *consumer's* Python package, not this repository's tooling, so removing it would delete coverage
 * rather than an interpreter the pipeline depends on. It leaves when `repo.dfconfig` stops
 * declaring `environment.{testing,formatting,setup}.python`.
 */
const REMAINING_PYTHON_STEPS: Record<string, string[]> = {
	"agent.yml": ["run-agent / Resolve target environment"],
	"ci.yml": ["quality-run / Install Python package manager"],
	"install.yml": [
		"install / Generate the installation",
		"install / Open the configuration issue",
		"install / Reconcile labels, board and settings",
	],
	"release.yml": [
		"resolve / Install dependencies",
		"resolve / Confirm the TypeScript resolver agrees with the Python pipeline",
		"resolve / Verify package metadata agrees with the release",
		"resolve / Detect the paper domain",
		"resolve / Install the build backend",
		"resolve / Collect release assets",
		"publish / Record the released version",
	],
};

/** The steps moved off Python, and the command each one runs instead. */
const CONVERTED: Array<[workflow: string, step: string, expected: string]> = [
	["verify-pr-issue.yml", "Verify PR description binds a tracking issue", "bun packages/harness/src/ci/bound-issue.ts"],
	["release.yml", "Decide which build tooling is needed", "jq -r"],
	["release.yml", "Build release assets", "jq -r"],
	["project-automation.yml", "Run Project Board Automation", 'bun "$ROOT/packages/harness/src/board/main.ts"'],
	["branch-policy.yml", "Reconcile default branch and protection", "bun packages/harness/src/ci/repo-settings.ts"],
	["pr-approval-automerge.yml", "Handle Approval and Auto-Merge", "pr-approval-main.ts"],
];

describe("steps that no longer need an interpreter", () => {
	/**
	 * A converted step that names a file which does not exist passes every other assertion here: the
	 * command is the one the tracker expects, the step reaches no interpreter, and the remainder list
	 * matches. It fails at run time instead, and a step that exits zero without doing its work is the
	 * worst outcome available -- the board simply stops being updated and nothing reports it.
	 *
	 * So the path is resolved on disk. `$ROOT` is stripped because it is a runtime checkout location,
	 * not a repository path; what remains must exist in this repository.
	 */
	it("every converted step names a file that exists in this repository", () => {
		for (const [workflow, step] of CONVERTED) {
			const converted = allSteps(parseWorkflow(workflow)).find((entry) => entry.step.name === step);
			const run = converted?.step.run ?? "";
			for (const match of run.matchAll(/(?:^|\s)"?\$?\{?ROOT\}?\/?([^\s"']+\.ts)/gu)) {
				const target = match[1];
				if (target === undefined) continue;
				const relative = target.replace(/^\.\//u, "").replace(/^ROOT\//u, "");
				expect(
					existsSync(join(repoRoot, relative)),
					`${workflow} / ${step} names ${relative}, which does not exist`,
				).toBe(true);
			}
		}
	});

	for (const [workflow, step, expected] of CONVERTED) {
		it(`${workflow}: ${step} runs \`${expected}\``, () => {
			const converted = allSteps(parseWorkflow(workflow)).find((entry) => entry.step.name === step);
			expect(converted, `${workflow} has no step named ${step}`).toBeDefined();
			expect(converted?.step.run).toContain(expected);
			expect(converted?.step.run, `${workflow} / ${step} still reaches Python`).not.toMatch(RUNS_PYTHON);
		});
	}

	it("report-failure.yml reaches no interpreter and exports no Python script path", () => {
		expect(pythonSteps("report-failure.yml")).toEqual([]);
		// The step that exported `PIPELINE_SCRIPTS` was left over from the pipeline-script era. The
		// workflow runs `bun "$ROOT/packages/cli/src/bin.ts" report-failure`, so nothing read it, and
		// an exported path into a directory that is being deleted is a trap for the next step.
		expect(workflowSource("report-failure.yml")).not.toContain("PIPELINE_SCRIPTS");
		expect(workflowSource("report-failure.yml")).toContain("packages/cli/src/bin.ts");
	});
});

describe("the Python the pipeline still runs", () => {
	it("is exactly the steps the handoff names", () => {
		const actual = workflowNames().filter((name) => pythonSteps(name).length > 0);
		expect(actual.sort()).toEqual(Object.keys(REMAINING_PYTHON_STEPS).sort());
	});

	for (const [workflow, steps] of Object.entries(REMAINING_PYTHON_STEPS)) {
		it(`${workflow} runs Python in ${steps.length} named step(s) and nowhere else`, () => {
			expect(pythonSteps(workflow).sort()).toEqual([...steps].sort());
		});
	}

	it("branch-policy.yml is triggered by the configuration document the reconcile reads", () => {
		// `repo.df` and `config.df` were named in this filter, are not repository files, and are not
		// filenames the configuration resolver accepts any more. So the document the policy is
		// derived from was not in the filter: changing the required checks reconciled nothing, while
		// the filter read as though it covered the manifest.
		const document = resolveConfigDocumentPath(repoRoot);
		expect(document, "this repository declares a configuration document").toBeDefined();
		const declared = pushPathFilter("branch-policy.yml");
		expect(declared, `${relative(repoRoot, document ?? "")} is the document the reconcile reads`).toContain(
			relative(repoRoot, document ?? ""),
		);
		expect(declared).toContain(".github/scripts/repo_settings.py");
	});

	it("no branch-policy.yml path filter entry can never match", () => {
		// A `paths:` entry naming a path no checkout can contain is a filter quietly narrower than
		// it reads. An entry is legitimate when it is a real file, or when it is an alternative name
		// the configuration resolver would select — which is asked of the resolver rather than
		// re-declared here, so the two cannot drift.
		for (const entry of pushPathFilter("branch-policy.yml")) {
			expect(
				existsSync(join(repoRoot, entry)) || resolverAccepts(entry),
				`${entry} is neither a file in this repository nor a name the configuration resolver selects`,
			).toBe(true);
		}
	});
});

/** Whether the configuration resolver would select `name` as a repository's configuration document. */
function resolverAccepts(name: string): boolean {
	const root = mkdtempSync(join(tmpdir(), "df-config-name-"));
	try {
		writeFileSync(join(root, name), "{}");
		return resolveConfigDocumentPath(root) === join(root, basename(name));
	} catch {
		return false;
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

/**
 * A step that runs a file out of the repository needs the repository.
 *
 * `verify-pr-issue.yml` ran a `python3 -c` heredoc, so its job needed no checkout. Converting the
 * heredoc to `packages/harness/src/ci/bound-issue.ts` made the job depend on a file in the tree
 * without adding the checkout, and the job failed with "module not found" naming a file that was
 * committed. The message points at the wrong cause, so nothing about the log invites the right fix.
 * This is the assertion that would have caught it.
 */
describe("a step that runs a file from the tree has a checkout before it", () => {
	const RUNS_REPO_FILE = /(^|[\s|;&(])(bun|node|bunx)\s+(?:run\s+--cwd\s+\S+\s+)?[\w./-]*\b[\w-]+\.ts\b/m;

	for (const name of workflowNames()) {
		it(`${name} checks out before running a repository file`, () => {
			const steps = allSteps(parseWorkflow(name));
			const offenders: string[] = [];
			let checkedOut = false;
			for (const { job, step } of steps) {
				if (step.uses?.startsWith("actions/checkout")) {
					checkedOut = true;
					continue;
				}
				if (step.run && RUNS_REPO_FILE.test(step.run) && !checkedOut) {
					offenders.push(`${job} / ${step.name ?? "(unnamed)"}`);
				}
			}
			expect(offenders).toEqual([]);
		});
	}
});
