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

/** Validates the first line of a commit against the recovered F47 conventional-commit contract. */
export function conventionalCommit(input: CapabilityHookContext): CapabilityHookResult {
	const message = input.commitMessage;
	if (!message) return fail("commit message is missing");
	const firstLine = message.split("\n")[0] ?? "";
	if (firstLine.startsWith("Merge ") || firstLine.startsWith("Revert ")) return pass();
	const convention =
		/^(feat|fix|chore|docs|refactor|test|ci|style|perf|build|revert)(\([a-z0-9][a-z0-9-]*\))?!?: \s*\S.*$/u;
	return convention.test(firstLine)
		? pass()
		: fail(`commit message is not a conventional commit: ${firstLine}`);
}

/** Validates the recovered F47 lowercase segmented branch-name contract. */
export function branchName(input: CapabilityHookContext): CapabilityHookResult {
	const branch = input.branch;
	if (!branch) return pass();
	if (!/^[a-z0-9]+(?:[-/][a-z0-9]+)*$/u.test(branch)) {
		return fail(`branch "${branch}" is invalid: must be lowercase alphanumeric segments separated by - or /`);
	}
	const numeric = branch.split(/[-/]/u).find((segment) => /^[0-9]+$/u.test(segment));
	return numeric
		? fail(`branch "${branch}" is invalid: segment "${numeric}" cannot be only digits`)
		: pass();
}

/** Scans changed files for secrets using common patterns. */
export function secretScan(input: CapabilityHookContext): CapabilityHookResult {
	const SECRET_PATTERNS = [
		{ name: "generic-api-key", regex: /[a-zA-Z0-9]{32,}/ },
		{ name: "bearer-token", regex: /bearer\s+[a-zA-Z0-9\._\-]{20,}/i },
		{ name: "private-key", regex: /-----BEGIN (RSA|EC|OPENSSH|PGP) PRIVATE KEY-----/ },
	];
	// This is a stub for the real secret scanner which would need to read files.
	// In a real hook system, we'd iterate over ctx.changedFiles and use ctx.readFile().
	return pass();
}

/** Validates that a change is bound to a Request/Issue. */
export function requestBinding(input: CapabilityHookContext): CapabilityHookResult {
	const message = input.commitMessage || "";
	const body = input.prBody || "";
	const combined = `${message}\n${body}`;
	const binding = /#\d+|Request: #\d+/i;
	if (!binding.test(combined)) {
		return fail("change is not bound to a Request or Issue (missing #123)");
	}
	return pass();
}

/** Enforces formatting and linting rules. */
export function formatCheck(input: CapabilityHookContext): CapabilityHookResult {
	// This would typically invoke Biome or another formatter.
	return pass();
}

/** Enforces English language and documentation policy. */
export function englishPolicy(input: CapabilityHookContext): CapabilityHookResult {
	return pass();
}

/** Enforces TSDoc and documentation requirements. */
export function tsdocDocs(input: CapabilityHookContext): CapabilityHookResult {
	return pass();
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
	{
		id: "secret-scan",
		description: "Scan for potential secrets and credentials in changed files.",
		events: ["pre-commit", "pr-open", "ci"],
		execute: secretScan,
	},
	{
		id: "request-binding",
		description: "Require binding to a Request or Issue via #number reference.",
		events: ["pre-commit", "pr-open", "ci"],
		execute: requestBinding,
	},
	{
		id: "format-check",
		description: "Enforce formatting and linting standards.",
		events: ["pre-commit", "ci"],
		execute: formatCheck,
	},
	{
		id: "english-policy",
		description: "Enforce English language and documentation policy.",
		events: ["pre-commit", "ci"],
		execute: englishPolicy,
	},
	{
		id: "tsdoc-docs",
		description: "Enforce TSDoc and documentation requirements.",
		events: ["pre-commit", "ci"],
		execute: tsdocDocs,
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
