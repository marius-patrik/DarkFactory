import { describe, expect, it } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { planSweep, type SweepEnvironment } from "../../src/install/sweep.ts";
import { json, scripted } from "../github/helpers.ts";

/**
 * `planSweep` decides which repositories an installation should reach. Every test here is about a
 * case where the cheaper-looking reading is the dangerous one, because a sweep that installs into the
 * wrong repository is worse than one that installs into none.
 */
describe("the installation sweep", () => {
	/** Builds an environment over one installation serving `repositories`, with `installed` pre-answering. */
	function environment(options: {
		repositories?: Array<{ full_name: string; archived?: boolean; default_branch?: string }>;
		installed?: string[];
		suspendedAt?: string;
		pipelineSlug?: string;
		account?: string | null;
		installationId?: number;
	}): SweepEnvironment & { calls: string[] } {
		const installationId = options.installationId ?? 159771550;
		const calls: string[] = [];
		const installationMock = scripted([
			json({
				repositories: (options.repositories ?? [{ full_name: "acme/one" }]).map((r) => ({
					full_name: r.full_name,
					...(r.archived === undefined ? {} : { archived: r.archived }),
					...(r.default_branch === undefined ? {} : { default_branch: r.default_branch }),
				})),
			}),
		]);
		const jwtMock = scripted([
			json([
				{
					id: installationId,
					account: options.account === null ? null : { login: options.account ?? "acme" },
					repository_selection: "selected",
					...(options.suspendedAt ? { suspended_at: options.suspendedAt } : {}),
				},
			]),
		]);
		const installed = new Set(options.installed ?? []);

		return {
			calls,
			jwtClient: new GitHubClient({ token: "jwt", fetch: jwtMock.fetch }),
			clientForInstallation: async () => {
				calls.push(`mint:${installationId}`);
				return new GitHubClient({ token: "ghs", fetch: installationMock.fetch });
			},
			isInstalled: async (slug) => {
				calls.push(`probe:${slug}`);
				return installed.has(slug);
			},
			...(options.pipelineSlug ? { pipelineSlug: options.pipelineSlug } : {}),
		};
	}

	it("targets a repository the App covers that has no installation yet", async () => {
		const plan = await planSweep(environment({ repositories: [{ full_name: "acme/one" }] }));

		expect(plan.targets).toEqual([{ slug: "acme/one", installationId: 159771550, account: "acme" }]);
		expect(plan.installations).toBe(1);
	});

	it("is idempotent: an already-installed repository is a skip, not a target", async () => {
		// The property the cron depends on. Without it, every tick would re-install every repository
		// and the sweep would be indistinguishable from a loop.
		const plan = await planSweep(environment({ repositories: [{ full_name: "acme/one" }], installed: ["acme/one"] }));

		expect(plan.targets).toEqual([]);
		expect(plan.skips).toEqual([{ slug: "acme/one", reason: "already-installed" }]);
	});

	it("skips a suspended installation without minting a token for it", async () => {
		// A suspended installation cannot mint a usable token, so enumerating its repositories would
		// spend a round trip on a 403 whose cause is already known. The skip is still reported, because
		// "the App is suspended here" is a diagnosis a person can act on and silence is not.
		const env = environment({
			repositories: [{ full_name: "acme/one" }],
			suspendedAt: "2026-01-01T00:00:00Z",
		});
		const plan = await planSweep(env);

		expect(plan.targets).toEqual([]);
		expect(plan.skips[0]?.reason).toBe("suspended-installation");
		expect(plan.skips[0]?.detail).toBe("2026-01-01T00:00:00Z");
		expect(env.calls).toEqual([]);
	});

	it("never targets the pipeline repository", async () => {
		// `plan.ts` refuses a self-install by throwing, so including it would spend a runner producing a
		// known failure on every tick. Case-insensitive, because repository names are on GitHub.
		const plan = await planSweep(
			environment({
				repositories: [{ full_name: "marius-patrik/DarkFactory" }, { full_name: "acme/one" }],
				pipelineSlug: "marius-patrik/darkfactory",
			}),
		);

		expect(plan.targets.map((t) => t.slug)).toEqual(["acme/one"]);
		expect(plan.skips).toContainEqual({ slug: "marius-patrik/DarkFactory", reason: "pipeline-itself" });
	});

	it("skips an archived repository without probing it", async () => {
		// Local and free. An archived repository is never installed into, so the `isInstalled` round
		// trip would be spent to learn nothing.
		const env = environment({
			repositories: [{ full_name: "acme/old", archived: true }, { full_name: "acme/one" }],
		});
		const plan = await planSweep(env);

		expect(plan.targets.map((t) => t.slug)).toEqual(["acme/one"]);
		expect(env.calls).not.toContain("probe:acme/old");
	});

	it("sorts targets so two sweeps over the same state produce the same matrix", async () => {
		// A reordered matrix makes a diff in the report unreadable, and the report is the only evidence
		// of what a sweep decided.
		const plan = await planSweep(
			environment({
				repositories: [{ full_name: "acme/zebra" }, { full_name: "acme/alpha" }, { full_name: "acme/mango" }],
			}),
		);

		expect(plan.targets.map((t) => t.slug)).toEqual(["acme/alpha", "acme/mango", "acme/zebra"]);
	});

	it("deduplicates a repository reachable through two installations", async () => {
		// An App installed on a repository and on the organization containing it reports that repository
		// twice. Installing twice means two pull requests fighting over one branch.
		const jwtMock = scripted([
			json([
				{ id: 1, account: { login: "acme" }, repository_selection: "selected" },
				{ id: 2, account: { login: "acme-org" }, repository_selection: "selected" },
			]),
		]);
		const first = scripted([json({ repositories: [{ full_name: "acme/one" }] })]);
		const second = scripted([json({ repositories: [{ full_name: "acme/one" }] })]);
		const byInstallation: Record<number, typeof first> = { 1: first, 2: second };

		const plan = await planSweep({
			jwtClient: new GitHubClient({ token: "jwt", fetch: jwtMock.fetch }),
			clientForInstallation: async (id) =>
				new GitHubClient({ token: "ghs", fetch: (byInstallation[id] ?? first).fetch }),
			isInstalled: async () => false,
		});

		expect(plan.targets).toHaveLength(1);
		expect(plan.installations).toBe(2);
	});

	it("reports every installation even when none produced a target", async () => {
		// The count is what tells a person the sweep is working at all. A sweep that found the App but
		// installed nothing and said nothing is indistinguishable from a broken one.
		const plan = await planSweep(environment({ repositories: [], account: "acme" }));

		expect(plan.targets).toEqual([]);
		expect(plan.installations).toBe(1);
	});

	it("tolerates an installation with no account", async () => {
		// GitHub allows it, and a sweep that threw here would fail every tick rather than this one.
		const plan = await planSweep(environment({ repositories: [{ full_name: "acme/one" }], account: null }));

		expect(plan.targets[0]?.account).toBeUndefined();
		expect(plan.targets[0]?.slug).toBe("acme/one");
	});
});
