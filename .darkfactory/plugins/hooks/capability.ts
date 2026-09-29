import {
	CAPABILITY_ABI_VERSION,
	type CapabilityHookContext,
	type CapabilityHookDefinition,
	type CapabilityHookResult,
	defineCapability,
} from "@darkfactory/capability";

function pass(): CapabilityHookResult {
	return { status: "pass" };
}

function fail(message: string): CapabilityHookResult {
	return { status: "fail", message };
}

/**
 * F47 tests-touched semantics expressed only over canonical classifications supplied by core.
 * This hook deliberately does not infer languages, package roots, source directories, or test conventions.
 */
export function testsTouched(input: CapabilityHookContext): CapabilityHookResult {
	if (input.changedFiles.length === 0) return pass();
	if (input.sourceFiles === undefined || input.testFiles === undefined) {
		return fail("tests-touched requires detected source/test file classification from the invocation layer");
	}
	if (input.sourceFiles.length > 0 && input.testFiles.length === 0) {
		return fail(`source changed without a test change: ${input.sourceFiles.slice(0, 10).join(", ")}`);
	}
	return pass();
}

/**
 * Conventional-commit base types this hook accepts, in the order DF-RULE-015 declares them.
 *
 * This is the hook's only type list. `commitTypes` must stay equal to the "Allowed base types"
 * sentence in `.agents/rules/015-repository-taxonomy.md`; `capability.test.ts` fails closed when the
 * two diverge in either direction. Do not add a type here without changing that declaration.
 */
export const commitTypes: readonly string[] = ["feat", "fix", "chore", "docs", "refactor", "test", "ci"];

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

const commitTypeAlternation = commitTypes.map(escapeRegExp).join("|");

/**
 * Conventional-commit pattern derived from {@link commitTypes}.
 *
 * The scope stays a syntactic lowercase segment. It is deliberately not matched against
 * `repo.dfconfig` `repo.areas`: those declare area labels and agent-routing keywords, and the
 * repository's real commit scopes are not drawn from them, so validating scopes against the
 * declared areas would reject conforming commits.
 */
const commitPattern = new RegExp(`^(${commitTypeAlternation})(\\([a-z0-9][a-z0-9-]*\\))?!?: \\s*\\S.*$`, "u");

/** Validates the first line of a commit against the DF-RULE-015 conventional-commit contract. */
export function conventionalCommit(input: CapabilityHookContext): CapabilityHookResult {
	const message = input.commitMessage;
	if (!message) return fail("commit message is missing");
	const firstLine = message.split("\n")[0] ?? "";
	if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) return pass();
	return commitPattern.test(firstLine) ? pass() : fail(`commit message is not a conventional commit: ${firstLine}`);
}

/** Validates the recovered F47 lowercase segmented branch-name contract. */
export function branchName(input: CapabilityHookContext): CapabilityHookResult {
	const branch = input.branch;
	if (!branch) return pass();
	if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/u.test(branch)) {
		return fail(`branch "${branch}" is invalid: must be lowercase alphanumeric segments separated by - or /`);
	}
	const numeric = branch.split(/[-/]/u).find((segment) => /^[0-9]+$/u.test(segment));
	return numeric ? fail(`branch "${branch}" is invalid: segment "${numeric}" cannot be only digits`) : pass();
}

const hooks: readonly CapabilityHookDefinition[] = [
	{
		id: "tests-touched",
		description: "Require a detected test change when detected source files change.",
		events: ["pre-commit", "pr-open", "ci"],
		execute: testsTouched,
	},
	{
		id: "conventional-commit",
		description: "Validate deterministic commit messages against the DarkFactory conventional-commit contract.",
		events: ["pre-commit", "ci"],
		execute: conventionalCommit,
	},
	{
		id: "branch-name",
		description: "Validate branch names before push, pull-request creation, and CI.",
		events: ["pre-push", "pr-open", "ci"],
		execute: branchName,
	},
];

/** Official capability containing DarkFactory product/rule hook behavior. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "hooks",
	version: "0.0.0",
	description: "Capability-owned repository governance rules invoked by deterministic df hook trigger points.",
	hooks,
	surfaces: {
		audit: ["hooks", "rules"],
	},
});

export default capability;
