import type { GitHubRepository } from "../github/repository.ts";
import type { ResolvedCheck } from "./schema.ts";

interface ProtectionVerificationReport {
	valid: boolean;
	matched: string[];
	missing: string[];
	extra: string[];
	strict: boolean;
	source: "ruleset" | "branch_protection" | "none";
}
interface ApplyProtectionOptions {
	/** The branch to protect. Required: the policy is declared, not guessed. */
	branch: string;
	/** Whether branches must be up to date before merging. */
	strict?: boolean;
	/** Approvals required before a merge. */
	approvals?: number;
	/** Whether the lane applies to administrators as well. */
	enforceAdmins?: boolean;
	/** Whether conversations must be resolved before merging. */
	resolveConversations?: boolean;
	dryRun?: boolean;
	/**
	 * Where to report which protection mechanism was used and why the other was skipped.
	 *
	 * Added because the fallback decision was previously silent: an empty `catch {}` made a ruleset
	 * rejection and an authentication failure look identical in the log.
	 */
	log?: (message: string) => void;
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
	options: ApplyProtectionOptions,
): Promise<ApplyProtectionResult> {
	const dryRun = options.dryRun === true;
	const { branch } = options;
	const log = options.log ?? (() => {});

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
					// The lane's own branch, not the default-branch alias. Which branch is protected is
					// declared in the configuration, and a ruleset that follows the repository default
					// protects a branch nobody asked for.
					ref_name: {
						// Fully qualified. A bare branch name is rejected with `Validation Failed` /
						// `Invalid target patterns`; GitHub wants the full ref. Verified against a
						// scratch repository: the bare name fails validation, the qualified name
						// creates the ruleset.
						//
						// This is what made `reconcile-branch-policy` fail on every run. The rejection
						// was swallowed by the empty `catch {}` below, which then fell through to the
						// classic-protection path — where the first call is
						// `PUT .../protection/required_status_checks`, and that endpoint 404s until
						// protection has been enabled once with the full `PUT .../protection`. Two
						// unrelated failures reported as one `Not Found`.
						include: [`refs/heads/${branch}`],
						exclude: [],
					},
				},
				rules: [
					{
						type: "required_status_checks",
						parameters: {
							strict_required_status_checks_policy: options.strict === true,
							required_status_checks: contexts.map((c) => ({ context: c })),
						},
					},
					// A `pull_request` rule is included so reviews are required at all, but it is sent
					// with **no parameters**. On this repository's plan any `parameters` object is
					// rejected outright — `Invalid property /rules/1: data matches no possible input` —
					// including `required_approving_review_count`, `dismiss_stale_reviews_on_push` and
					// `require_last_push_approval`, all of which are documented. Verified by creating
					// rulesets on a scratch repository: `{ type: "pull_request" }` is accepted and
					// defaults to `required_approving_review_count: 0`; adding any parameter fails.
					//
					// The approval *count* and conversation resolution therefore cannot live here. They
					// are applied by the classic-protection calls after this block, which is why those
					// are not dead code.
					...(options.approvals !== undefined && options.approvals > 0 ? [{ type: "pull_request" }] : []),
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
	} catch (error) {
		// Rulesets unavailable or rejected; fall back to classic branch protection. The reason is
		// logged rather than swallowed: an empty `catch {}` here made two unrelated failures
		// indistinguishable, which is how a ruleset `Validation Failed` and a 404 from a
		// not-yet-enabled branch both surfaced as one `Not Found` in the reconcile job.
		log(`rulesets unavailable (${error instanceof Error ? error.message : String(error)}); using classic protection`);
	}

	// Fallback to classic branch protection.
	//
	// The full `PUT .../protection` comes first and carries the whole policy. The narrower
	// `.../protection/required_status_checks` endpoint answers `Not Found` until protection has been
	// enabled once, so calling it first fails on any branch that is not already protected — which is
	// every branch the first time this runs. Verified on a scratch repository.
	await repo.client.rest(
		"PUT",
		`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}/protection`,
		{
			required_status_checks: { strict: options.strict === true, contexts },
			enforce_admins: options.enforceAdmins === true,
			required_conversation_resolution: options.resolveConversations === true,
			...(options.approvals !== undefined && options.approvals > 0
				? {
						required_pull_request_reviews: {
							dismiss_stale_reviews: true,
							require_code_owner_reviews: false,
							required_approving_review_count: options.approvals,
						},
					}
				: {}),
			restrictions: null,
			allow_force_pushes: false,
			allow_deletions: false,
		},
	);
	// The classic API splits protection across endpoints, so a lane that requires approvals needs its
	// own call. `required_approving_review_count: 0` is not the same as omitting the call: sending zero
	// would turn approvals off on a branch whose lane declares them, so the endpoint is only touched
	// when the lane actually asks for a reviewer.
	if (options.approvals !== undefined && options.approvals > 0) {
		await repo.client.rest(
			"POST",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}/protection/required_pull_request_reviews`,
			{
				dismiss_stale_reviews: true,
				require_code_owner_reviews: options.enforceAdmins === true,
				required_approving_review_count: options.approvals,
			},
		);
	}
	if (options.resolveConversations === true) {
		await repo.client.rest(
			"PUT",
			`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/branches/${encodeURIComponent(branch)}/protection`,
			{
				required_conversation_resolution: true,
			},
		);
	}

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
	branch: string,
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
