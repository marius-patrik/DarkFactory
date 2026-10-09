/**
 * Applies declared branch protection to the repositories in the sweep's scope, once CI is green.
 *
 * The configuration issue used to ask a person to turn protection on by hand. It no longer needs to:
 * `protectLaneWhenGreen` already decides from what CI actually reported, and this reads the decision's
 * inputs for each repository the sweep is responsible for.
 *
 * Two things make it safe to run unattended, and both are properties of the scope rather than of this
 * code:
 *
 * - **A repository is in scope because someone declared it.** The App can reach every repository on the
 *   account, and that says nothing about which should be installed *or* protected. Scope membership is
 *   the opt-in, so applying protection to a scoped repository changes nobody's merge policy who did not
 *   ask for it.
 * - **A lane is applied only once its checks are green.** Protecting a repository whose required checks
 *   have not reported blocks every merge on it, permanently, with no failing check to point at. The
 *   scope gates *which* repository; the green check gates *when*.
 *
 * A repository with no manifest, or with no declared lanes, is reported rather than skipped silently:
 * "nothing was protected" and "nothing needed protecting" are different answers.
 */

import { configBlock, parseConfigDocument } from "../../../protocol/src/config-document.ts";
import { type DeclaredLane, type ProtectionDecision, protectLaneWhenGreen } from "../ci/protect-when-green.ts";
import { getCheckStatus } from "../ci/status.ts";
import type { GitHubClient } from "../github/client.ts";
import { GitHubRepository } from "../github/repository.ts";
import { MANIFEST_PATH } from "./manifest.ts";
import { CONFIG_DOCUMENT_NAMES } from "./sweep-main.ts";

/** What the sweep concluded about one repository's protection. */
export interface SweepProtection {
	slug: string;
	/** One entry per declared lane, or a single entry explaining why there are none. */
	decisions: ProtectionDecision[];
}

/**
 * Reads a consumer's declared lanes from its configuration, over the API.
 *
 * The manifest reader reads a checkout; the sweep has no checkout of the repository it is deciding
 * about, so the document is fetched and then handed to the same parser and block selector the local
 * reader uses. Reusing those is the point: a second implementation of "which lanes does this document
 * declare" would be a second thing to keep in step with the schema.
 *
 * Every candidate name is probed because `plan.ts` honours whichever document a repository selected and
 * will not add a second beside it — so a repository using `config.dfconfig` declares lanes in a file a
 * probe for `repo.dfconfig` alone would never find.
 *
 * @param client Read-only client for the repository.
 * @param slug `owner/name`.
 * @param branch Branch to read from.
 * @returns Declared lanes, or undefined when the repository declares none or has no document.
 */
export async function readDeclaredLanes(
	client: GitHubClient,
	slug: string,
	branch: string,
): Promise<DeclaredLane[] | undefined> {
	for (const name of CONFIG_DOCUMENT_NAMES) {
		let source: string;
		try {
			const response = await client.rest<{ content?: string; encoding?: string }>(
				"GET",
				`/repos/${slug}/contents/${name}?ref=${encodeURIComponent(branch)}`,
			);
			if (response.encoding !== "base64" || typeof response.content !== "string") continue;
			source = Buffer.from(response.content, "base64").toString("utf8");
		} catch {
			// Absent document or no read access: try the next candidate name. A repository with no
			// configuration at all is reported by the caller rather than treated as an error here.
			continue;
		}

		const block = configBlock(parseConfigDocument(source, name), "repo", name) as
			| { protection?: { lanes?: unknown } }
			| undefined;
		const lanes = block?.protection?.lanes;
		if (!Array.isArray(lanes)) return [];
		return lanes.flatMap((lane): DeclaredLane[] => {
			if (typeof lane !== "object" || lane === null || typeof lane.branch !== "string") return [];
			const checks = Array.isArray(lane.required_checks) ? lane.required_checks.map(String) : [];
			return [
				{
					branch: lane.branch,
					requiredChecks: checks,
					...(typeof lane.approvals === "number" ? { approvals: lane.approvals } : {}),
					...(typeof lane.strict === "boolean" ? { strict: lane.strict } : {}),
					...(typeof lane.enforce_admins === "boolean" ? { enforceAdmins: lane.enforce_admins } : {}),
					...(typeof lane.resolve_conversation === "boolean"
						? { resolveConversations: lane.resolve_conversation }
						: {}),
				},
			];
		});
	}
	return undefined;
}

/**
 * Decides and applies protection for one repository.
 *
 * @param client Client authenticated as an installation token with `administration`, which branch
 *   protection requires and which a GitHub App does not hold.
 * @param slug `owner/name`.
 * @returns What was decided for each declared lane.
 */
export async function protectSweepRepository(client: GitHubClient, slug: string): Promise<SweepProtection> {
	const repository = new GitHubRepository(client, ...(slug.split("/") as [string, string]));
	const repositoryInfo = await client.rest<{ default_branch?: string }>("GET", `/repos/${slug}`);
	const branch = repositoryInfo.default_branch ?? "main";

	const lanes = await readDeclaredLanes(client, slug, branch);
	if (lanes === undefined) {
		return {
			slug,
			decisions: [
				{
					outcome: "not-declared",
					reason: `${slug} has no ${MANIFEST_PATH} to read lanes from, so nothing was protected`,
				},
			],
		};
	}
	if (lanes.length === 0) {
		return {
			slug,
			decisions: [
				{
					branch,
					outcome: "not-declared",
					reason: `${slug} declares no repo.protection.lanes, so no branch is protected`,
				},
			],
		};
	}

	// Read CI once per repository rather than once per lane: lanes on the same repository observe the
	// same head, and the check runs are the expensive part of the decision.
	const checkRuns = await getCheckStatus(
		repository,
		branch,
		lanes.flatMap((lane) => lane.requiredChecks.map((name) => ({ name, required: true }))),
	);

	const decisions: ProtectionDecision[] = [];
	for (const lane of lanes) {
		decisions.push(
			await protectLaneWhenGreen(repository, lane, checkRuns.checks, {
				log: (message) => console.log(`  ${slug}: ${message}`),
			}),
		);
	}
	return { slug, decisions };
}
