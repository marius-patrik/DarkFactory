import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseRepoSettingsArgs, REPO_SETTINGS_FLAGS, runRepoSettings } from "../../src/ci/repo-settings.ts";
import type { GitHubClient } from "../../src/github/client.ts";
import { repoRoot } from "./pipeline-source.ts";

/**
 * The flags this command accepts, checked against the Python it replaces.
 *
 * `repo_settings.py` is the declaration. Its `argparse` is the contract the two workflows that call it
 * depend on, and this command is a partial reimplementation of that script, so the two must not drift.
 * The list is extracted from the Python's source rather than copied here, because a copy is a second
 * place to update and a second place to forget.
 */
function pythonFlags(): string[] {
	const source = readFileSync(join(repoRoot, ".github", "scripts", "repo_settings.py"), "utf8");
	return [...source.matchAll(/add_argument\(\s*"(--[a-z-]+)"/gu)].map((match) => match[1] as string).sort();
}

describe("the flag contract with repo_settings.py", () => {
	it("declares exactly the flags the Python declares", () => {
		const declared: string[] = [...REPO_SETTINGS_FLAGS];
		expect(declared.sort()).toEqual(pythonFlags());
	});

	it("rejects a flag the Python does not declare", () => {
		// argparse exits 2 on an unrecognised argument. A wrapper that skipped unknown flags would
		// diverge in the direction that hides a mistake.
		expect(() => parseRepoSettingsArgs(["--nope"])).toThrow(/unknown flag/u);
	});

	it("rejects a positional argument, as argparse would", () => {
		expect(() => parseRepoSettingsArgs(["main"])).toThrow(/unexpected argument/u);
	});

	it("reads --apply and --branches-only, and defaults both to false", () => {
		expect(parseRepoSettingsArgs([])).toEqual({ apply: false, branchesOnly: false });
		expect(parseRepoSettingsArgs(["--apply", "--branches-only"])).toEqual({ apply: true, branchesOnly: true });
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
		args: { apply, branchesOnly: true },
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
