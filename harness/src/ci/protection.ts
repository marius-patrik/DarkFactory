import type { GitHubRepository } from "../github/repository.ts";
import type { ResolvedCheck } from "./schema.ts";

export interface ProtectionVerificationReport {
	valid: boolean;
	matched: string[];
	missing: string[];
	extra: string[];
	strict: boolean;
	source: "ruleset" | "branch_protection" | "none";
}

export interface ApplyProtectionOptions {
	branch?: string;
	dryRun?: boolean;
}

export interface ApplyProtectionResult {
	success: boolean;
	dryRun: boolean;
	source?: "ruleset" | "branch_protection";
	contexts: string[];
}

export function computeRequiredChecks(checks: readonly ResolvedCheck[]): string[] {
	return checks.filter((check) => check.required).map((check) => check.name);
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
	} catch {
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
				if (checkRule?.parameters) {
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
