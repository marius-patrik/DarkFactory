/**
 * Which repositories the App is installed on, and which of them still need installing.
 *
 * The half of "installing the App is enough" that decides *what* to install. Actions cannot receive
 * `installation` events — those are delivered to the App, and this pipeline has no webhook receiver —
 * so the sweep polls GitHub for its own installations and compares them against what is already
 * installed. This module computes that difference; `install-sweep.yml` turns it into a matrix and
 * calls `install.yml` once per repository.
 *
 * Three decisions are worth stating, because each one is a case where the cheaper-looking reading is
 * the dangerous one:
 *
 * - **A suspended installation is reported, not installed.** It is skipped for work and kept in the
 *   report, because "the App is suspended on this account" is something a person can act on and
 *   silence is not.
 * - **`repository_selection: "all"` expands to nothing here.** The installation's repository list is
 *   the only source of names, and an `all` installation's list is every repository in the account
 *   including forks and archived repositories the App would never be installed on deliberately.
 * - **The pipeline repository is never a target.** Installing the pipeline into itself is refused by
 *   `plan.ts`, so including it would spend a runner producing a known failure.
 */

import { GitHubAppInstallations, type InstallationRepository } from "../github/app-installations.ts";
import type { GitHubClient } from "../github/client.ts";

/** One repository the sweep intends to install into. */
export interface SweepTarget {
	/** `owner/name`, the form `install.yml` takes as its `repository` input. */
	slug: string;
	/** Installation this repository was discovered through, for the report. */
	installationId: number;
	/** Account the installation belongs to. */
	account?: string;
}

/** One repository deliberately not installed into, and why. */
export interface SweepSkip {
	slug: string;
	reason: "suspended-installation" | "archived" | "already-installed" | "pipeline-itself" | "out-of-scope";
	detail?: string;
}

/** What a sweep decided to do, in full. */
export interface SweepPlan {
	/** Repositories to install into, deduplicated and sorted. */
	targets: SweepTarget[];
	/** Repositories passed over, with the reason. */
	skips: SweepSkip[];
	/** Installations seen, including ones that produced nothing. */
	installations: number;
}

/**
 * One repository's decision.
 *
 * A tagged union rather than a shape with optional fields, because the two cases must be
 * indistinguishable to a reader: there is no third state, and nothing carries `target` and `skip` at
 * once.
 */
type SweepDecision = { kind: "skip"; skip: SweepSkip } | { kind: "target"; target: SweepTarget };

/** What the sweep needs to know about the outside world, injected so a test supplies all of it. */
export interface SweepEnvironment {
	/** Client authenticated as an App **JWT**, for enumerating installations. */
	jwtClient: GitHubClient;
	/** Mints a client authenticated as an installation token, for that installation's repositories. */
	clientForInstallation: (installationId: number) => Promise<GitHubClient>;
	/** Reports whether a repository already holds an installation. */
	isInstalled: (slug: string) => Promise<boolean>;
	/** The pipeline's own `owner/name`, which is never a target. */
	pipelineSlug?: string;
	/**
	 * Repositories the sweep may install into, from `repo.app.sweep.repositories`.
	 *
	 * Narrowing to a declared list rather than acting on everything the App can reach is the whole
	 * point of this parameter. An App installed on an account can see every repository that account
	 * holds - 66 here - so a sweep that installed into all of them would open a pull request in
	 * repositories nobody asked for, including archived ones and personal scratch space. Being
	 * *able* to reach a repository is not a request to install into it.
	 *
	 * Compared case-insensitively, because repository names are on GitHub.
	 *
	 * An empty or absent list installs into nothing. That is deliberate: a sweep with no declared
	 * scope has no way to distinguish "nothing selected" from "everything", and treating it as
	 * everything is the dangerous reading.
	 */
	scope?: readonly string[];
}

/**
 * The configuration-document names an installation may have selected.
 *
 * `plan.ts` honours whichever alias is present and will not add a second document beside it, so a
 * repository using `config.dfconfig` looks uninstalled to a probe for `repo.dfconfig` alone. Both are
 * checked by `isInstalled`, which is a caller-supplied function precisely so this list lives with the
 * resolver that owns it rather than being copied here.
 */

/**
 * Works out which repositories still need installing.
 *
 * Idempotent by construction: `isInstalled` gates every candidate, so a second sweep over the same
 * installations produces an empty target list and the caller skips the fan-out entirely.
 *
 * @param environment Injected clients and predicate, so this is testable without a network.
 * @returns The targets, the skips and how many installations were seen.
 */
export async function planSweep(environment: SweepEnvironment): Promise<SweepPlan> {
	const api = new GitHubAppInstallations(environment.jwtClient);
	const installations = await api.list();
	const targets = new Map<string, SweepTarget>();
	const skips: SweepSkip[] = [];
	const pipeline = environment.pipelineSlug?.toLowerCase();
	const scope = new Set((environment.scope ?? []).map((slug) => slug.toLowerCase()));

	for (const installation of installations) {
		// Checked before the repository call: a suspended installation cannot mint a usable token, so
		// asking would spend a round trip on a 403 whose cause is already known.
		if (installation.suspendedAt) {
			skips.push({
				slug: `installation ${installation.id}${installation.account ? ` on ${installation.account}` : ""}`,
				reason: "suspended-installation",
				detail: installation.suspendedAt,
			});
			continue;
		}

		const repositories = await api.repositoriesFor(await environment.clientForInstallation(installation.id));
		for (const repository of repositories) {
			// Checked before anything else, including the free local checks. A repository outside the
			// declared scope is reported so the sweep's output accounts for everything the App could
			// reach, and never probed: probing costs a round trip to learn something already declared.
			if (!scope.has(repository.fullName.toLowerCase())) {
				skips.push({ slug: repository.fullName, reason: "out-of-scope" });
				continue;
			}
			const decided = await decide(repository, environment, pipeline);
			// Two shapes come back and the difference is the whole point of the function, so it is
			// discriminated on `reason` rather than inferred: `reason` is absent on a target, and a
			// union checked with `"reason" in x` would be right today and fragile if a target ever
			// grew a field of that name.
			if (decided.kind === "skip") skips.push(decided.skip);
			else
				targets.set(decided.target.slug, {
					...decided.target,
					installationId: installation.id,
					...(installation.account ? { account: installation.account } : {}),
				});
		}
	}

	return {
		// Sorted so two sweeps over the same state produce the same matrix, which makes a diff in the
		// report meaningful rather than reordered noise.
		targets: [...targets.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
		skips,
		installations: installations.length,
	};
}

/**
 * Decides one repository, returning either a target or a skip.
 *
 * Split out so the ordering is visible: cheap and local checks first, then the one call that costs a
 * round trip. An archived repository is never installed into and never needs probing.
 */
async function decide(
	repository: InstallationRepository,
	environment: SweepEnvironment,
	pipeline: string | undefined,
): Promise<SweepDecision> {
	const slug = repository.fullName;

	if (repository.archived) return { kind: "skip", skip: { slug, reason: "archived" } };
	// Compared case-insensitively because repository names are case-insensitive on GitHub, and a
	// sweep that installed the pipeline into itself would spend a runner on the `SelfInstall` refusal
	// `plan.ts` raises.
	if (pipeline && slug.toLowerCase() === pipeline) return { kind: "skip", skip: { slug, reason: "pipeline-itself" } };
	if (await environment.isInstalled(slug)) return { kind: "skip", skip: { slug, reason: "already-installed" } };

	return { kind: "target", target: { slug, installationId: 0 } };
}
