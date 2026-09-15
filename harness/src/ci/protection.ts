import type { GitHubRepository } from "../github/repository.ts";
import { getRequiredCheckNames } from "./config.ts";
import type { CiConfig } from "./schema.ts";

/**
 * Report describing the result of a protection verification.
 * Includes whether the protection is valid, which contexts matched, missing, or extra, and the source of the protection.
 */
export interface ProtectionVerificationReport {
	/**
	 * True if the protection matches the expected configuration.
	 */
	valid: boolean;
	/**
	 * List of contexts that were expected and found.
	 */
	matched: string[];
	/**
	 * List of expected contexts that were not found.
	 */
	missing: string[];
	/**
	 * List of contexts that are present but not expected.
	 */
	extra: string[];
	/**
	 * Whether strict mode is enabled (no extra contexts allowed).
	 */
	strict: boolean;
	/**
	 * Origin of the protection configuration.
	 */
	source: "ruleset" | "branch_protection" | "none";
}

/**
 * Options for applying protection to a branch.
 */
export interface ApplyProtectionOptions {
	/**
	 * Target branch name. Defaults to "main" if omitted.
	 */
	branch?: string;
	/**
	 * If true, the operation is simulated without making changes.
	 */
	dryRun?: boolean;
}

/**
 * Result of applying protection.
 */
export interface ApplyProtectionResult {
	/**
	 * Indicates whether the protection was successfully applied.
	 */
	success: boolean;
	/**
	 * Mirrors the dryRun option; true if this was a simulated run.
	 */
	dryRun: boolean;
	/**
	 * Source of the applied protection configuration, if any.
	 */
	source?: "ruleset" | "branch_protection";
	/**
	 * List of status check contexts that were applied.
	 */
	contexts: string[];
}

/**
 * Compute the list of required status check names based on the CI configuration.
 *
 * @param config - CI configuration object.
 * @param repoSlug - Optional repository slug to customize check names.
 * @returns Array of required status check names.
 */
export function computeRequiredChecks(config: CiConfig, repoSlug?: string): string[] {
	return getRequiredCheckNames(config, repoSlug);
}

interface RulesetRule {
	type: string;
	parameters?: {
		strict_required_status_checks_policy?: boolean;
		required_status_checks?: Array<{ context: string }>;
	};
}

interface RulesetItem {
	id: number;
	name: string;
	target?: string;
	enforcement?: string;
	rules?: RulesetRule[];
}

/**
 * Apply branch protection settings to a repository.
 *
 * @param repo - GitHub repository information.
 * @param contexts - List of required status check contexts.
 * @param options - Additional options such as target branch and dry-run mode.
 * @returns Result object describing the outcome of the operation.
 * @throws May throw errors from GitHub API requests.
 */
export async function applyBranchProtection(
	repo: GitHubRepository,
	contexts: string[],
	options: ApplyProtectionOptions = {},
): Promise<ApplyProtectionResult> {
	const dryRun = options.dryRun === true;
	const branch = options.branch ?? "main";

	if (dryRun) {
		return {
			success: true,
			dryRun: true,
			contexts,
		};
	}

	const owner = repo.owner;
	const repoName = repo.repo;

	// Attempt rulesets first
	try {
		const rulesets = await repo.client.rest<RulesetItem[]>(
			"GET",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/rulesets`,
		);

		if (Array.isArray(rulesets)) {
			const existing = rulesets.find((r) => r.name === "darkfactory-ci");
			const payload = {
				name: "darkfactory-ci",
				target: "branch",
				enforcement: "active",
				conditions: {
					ref_name: {
						include: ["~DEFAULT_BRANCH"],
						exclude: [],
					},
				},
				rules: [
					{
						type: "required_status_checks",
						parameters: {
							strict_required_status_checks_policy: true,
							required_status_checks: contexts.map((c) => ({ context: c })),
						},
					},
				],
			};

			if (existing) {
				await repo.client.rest(
					"PUT",
					`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/rulesets/${existing.id}`,
					payload,
				);
			} else {
				await repo.client.rest(
					"POST",
					`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/rulesets`,
					payload,
				);
			}

			return {
				success: true,
				dryRun: false,
				source: "ruleset",
				contexts,
			};
		}
	} catch (err: unknown) {
		// Rulesets not supported (404) or permission issue; fall back to classic branch protection
	}

	// Fallback to classic branch protection
	await repo.client.rest(
		"PUT",
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}/protection/required_status_checks`,
		{
			strict: true,
			contexts,
		},
	);

	return {
		success: true,
		dryRun: false,
		source: "branch_protection",
		contexts,
	};
}

/**
 * Verify that branch protection matches the expected status check contexts.
 *
 * @param repo - GitHub repository information.
 * @param expectedContexts - List of status check contexts that should be required.
 * @param branch - Branch name to verify; defaults to "main".
 * @returns A report detailing the verification result.
 * @throws May throw errors from GitHub API requests.
 */
export async function verifyBranchProtection(
	repo: GitHubRepository,
	expectedContexts: string[],
	branch = "main",
): Promise<ProtectionVerificationReport> {
	const owner = repo.owner;
	const repoName = repo.repo;

	// 1. Check rulesets
	try {
		const rulesets = await repo.client.rest<RulesetItem[]>(
			"GET",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/rulesets`,
		);

		if (Array.isArray(rulesets)) {
			// Find ruleset that has required_status_checks rule
			for (const r of rulesets) {
				let rules = r.rules;
				if (!rules) {
					// rules might need full detail fetch
					try {
						const detail = await repo.client.rest<RulesetItem>(
							"GET",
							`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/rulesets/${r.id}`,
						);
						rules = detail.rules;
					} catch {
						// skip
					}
				}

				const checkRule = rules?.find((rule) => rule.type === "required_status_checks");
				if (checkRule && checkRule.parameters) {
					const actualChecks = checkRule.parameters.required_status_checks?.map((c) => c.context) ?? [];
					const strict = checkRule.parameters.strict_required_status_checks_policy === true;
					return evaluateProtection(expectedContexts, actualChecks, strict, "ruleset");
				}
			}
		}
	} catch {
		// rulesets not supported, fallback to branch protection
	}

	// 2. Check classic branch protection
	try {
		const protection = await repo.client.rest<{
			strict?: boolean;
			contexts?: string[];
		}>(
			"GET",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}/protection/required_status_checks`,
		);

		const actualChecks = protection.contexts ?? [];
		const strict = protection.strict === true;
		return evaluateProtection(expectedContexts, actualChecks, strict, "branch_protection");
	} catch {
		return {
			valid: false,
			matched: [],
			missing: [...expectedContexts],
			extra: [],
			strict: false,
			source: "none",
		};
	}
}

function evaluateProtection(
	expected: string[],
	actual: string[],
	strict: boolean,
	source: "ruleset" | "branch_protection",
): ProtectionVerificationReport {
	const expectedSet = new Set(expected);
	const actualSet = new Set(actual);

	const matched = expected.filter((c) => actualSet.has(c));
	const missing = expected.filter((c) => !actualSet.has(c));
	const extra = actual.filter((c) => !expectedSet.has(c));
	const valid = missing.length === 0 && extra.length === 0 && strict;

	return {
		valid,
		matched,
		missing,
		extra,
		strict,
		source,
	};
}
