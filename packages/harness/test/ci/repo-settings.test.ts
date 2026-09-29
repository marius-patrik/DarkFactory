import { describe, expect, it } from "bun:test";
import { parseRepoSettingsArgs, REPO_SETTINGS_FLAGS, runRepoSettings } from "../../src/ci/repo-settings.ts";
import type { GitHubClient } from "../../src/github/client.ts";

/**
 * The flags this command accepts, and how it treats the ones it does not.
 *
 * There used to be a second assertion here, that the declared flags matched `repo_settings.py`'s
 * `argparse` exactly. It was a real invariant while both existed — the Python was the declaration the
 * two calling workflows depended on. With the Python gone this module *is* the declaration, so there
 * is nothing to check it against, and a sync test whose other half has been deleted asserts nothing.
 * What survives is the part that was never about Python: the command rejects what it does not accept,
 * because a wrapper that silently skipped an unknown flag would diverge in the direction that hides a
 * mistake.
 */
describe("the flag contract", () => {
	it("declares exactly the four flags the workflows pass", () => {
		// `--branches-only` from `branch-policy.yml`; `--apply` and `--skip-protection` from
		// `install.yml`. All three call sites are the whole set, so a flag nobody passes is a flag
		// with no caller.
		expect([...REPO_SETTINGS_FLAGS].sort()).toEqual(["--apply", "--branches-only", "--plan", "--skip-protection"]);
	});

	it("rejects a flag it does not declare", () => {
		expect(() => parseRepoSettingsArgs(["--nope"])).toThrow(/unknown flag/u);
	});

	it("rejects a positional argument", () => {
		expect(() => parseRepoSettingsArgs(["main"])).toThrow(/unexpected argument/u);
	});

	it("reads all three boolean flags, and defaults them to false", () => {
		expect(parseRepoSettingsArgs([])).toEqual({ apply: false, branchesOnly: false, skipProtection: false });
		expect(parseRepoSettingsArgs(["--apply", "--branches-only"])).toEqual({
			apply: true,
			branchesOnly: true,
			skipProtection: false,
		});
		// `install.yml`'s invocation, which is the full run minus branch protection.
		expect(parseRepoSettingsArgs(["--apply", "--skip-protection"])).toEqual({
			apply: true,
			branchesOnly: false,
			skipProtection: true,
		});
	});
});

/** A client that records calls and resolves, so no test reaches the network. */
function recordingClient(): { client: GitHubClient; calls: Array<{ method: string; path: string; body: unknown }> } {
	const calls: Array<{ method: string; path: string; body: unknown }> = [];
	const client = {
		async rest(method: string, path: string, body?: unknown) {
			calls.push({ method, path, body });
			return {} as never;
		},
	} as unknown as GitHubClient;
	return { client, calls };
}

function harness(apply: boolean) {
	const { client, calls } = recordingClient();
	const log: string[] = [];
	return {
		calls,
		log,
		deps: {
			client,
			defaultBranch: "darkfactory",
			log: (message: string) => log.push(message),
			env: { GITHUB_REPOSITORY: "marius-patrik/DarkFactory", GH_TOKEN: "test-token" },
		},
		args: { apply, branchesOnly: true, skipProtection: false },
	};
}

describe("the --branches-only reconciliation", () => {
	it("issues the default-branch PATCH the Python issued, then applies protection", async () => {
		const h = harness(true);
		const outcome = await runRepoSettings(h.args, h.deps);
		expect(outcome.exitCode).toBe(0);
		expect(h.calls[0]).toEqual({
			method: "PATCH",
			path: "repos/marius-patrik/DarkFactory",
			body: { default_branch: "darkfactory" },
		});
	});

	it("announces the mode, and PLAN without --apply changes nothing", async () => {
		const planned = harness(false);
		const outcome = await runRepoSettings(planned.args, planned.deps);
		expect(outcome.exitCode).toBe(0);
		expect(planned.log[0]).toContain("mode: PLAN");
		// The Python's Runner with apply=False printed the command instead of running it, which is the
		// whole of its plan mode. A plan that issued the PATCH would be the opposite of a dry run.
		expect(planned.calls).toEqual([]);
	});

	it("exits 1 and names the failure, as the Python did on run.failures", async () => {
		const h = harness(true);
		const failing = {
			...h.deps,
			client: {
				async rest() {
					throw new Error("403 Resource not accessible by integration");
				},
			} as unknown as GitHubClient,
		};
		const outcome = await runRepoSettings(h.args, failing);
		expect(outcome.exitCode).toBe(1);
		expect(h.log.join("\n")).toContain("operation(s) failed");
	});

	it("reports the manifest's declared default branch, not a hard-coded one", async () => {
		const h = harness(true);
		const outcome = await runRepoSettings(h.args, h.deps);
		expect(outcome.defaultBranch).toBe("darkfactory");
	});
});
