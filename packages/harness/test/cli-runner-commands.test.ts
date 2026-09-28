import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../src/cli.ts";
import { RUNNER_COMMANDS } from "../src/pipeline/main.ts";

/**
 * The agent image runs `df`, so every command the image needs must be a `df` command.
 *
 * `nix/entrypoint.sh` refused to translate `docker run darkfactory-agent dispatch` into
 * `graph dispatch`, on the grounds that a shim printing a plan and exiting 0 turns a loud failure into
 * a silent one: the agent run would be skipped rather than reported. Its comment records that the image
 * was "sequenced after #1148" and that `docker/Dockerfile.agent` was "left in place until then".
 *
 * That is the claim this file checks. A command in `main.ts` and absent from `df` is an image that
 * cannot start, and nothing else would notice: the runner's own tests call `runnerMain` directly, so
 * they pass whether or not the CLI can reach it.
 */

/** The commands the image's entrypoint and workflows name. */
const REQUIRED = [
	"dispatch",
	"interpret",
	"plan",
	"implement",
	"self-review",
	"self-review-fix",
	"plan-alignment",
	"respond",
	"token-refresh",
] as const;

/**
 * This suite calls the real `df` entry point, so it must pin the environment that entry point reads.
 *
 * `resolveConfigDocumentPath` treats `repo.dfconfig`, `config.dfconfig` and `.dfconfig` in one
 * directory as mutually ambiguous, and it also looks in `$DF_CONFIG_DIR/.darkfactory`. Left to inherit
 * the ambient environment, this suite made `config.test.ts` fail in CI with
 * "Ambiguous DarkFactory configuration" — a failure in a test that has nothing to do with it, caused
 * only by which files happened to be on disk. A test that perturbs another test is worse than no test,
 * so the directory is pinned to an empty one and restored afterwards.
 */
const saved: Record<string, string | undefined> = {};
let configDir = "";

beforeAll(() => {
	for (const name of ["DF_CONFIG_DIR", "GH_TOKEN", "GITHUB_REPOSITORY"]) saved[name] = process.env[name];
	configDir = mkdtempSync(join(tmpdir(), "df-runner-commands-"));
	process.env.DF_CONFIG_DIR = configDir;
	process.env.GH_TOKEN = "t".repeat(40);
	process.env.GITHUB_REPOSITORY = "marius-patrik/DarkFactory";
});

afterAll(() => {
	for (const [name, value] of Object.entries(saved)) {
		if (value === undefined) delete process.env[name];
		else process.env[name] = value;
	}
	if (configDir) rmSync(configDir, { recursive: true, force: true });
});

describe("the agent image's commands are reachable through df", () => {
	it("the runner declares exactly the commands the image needs", () => {
		expect([...RUNNER_COMMANDS].sort()).toEqual([...REQUIRED].sort());
	});

	it("df routes each of them rather than reporting an unknown command", async () => {
		// This asserts the *routing*, not a successful run. Each command is expected to fail somewhere
		// downstream — no token, no event, no argument — and the assertion is that the failure is never
		// the unknown-command one.
		//
		// A token is supplied so the run gets past client construction and reaches the command's own
		// gates. Without it every command fails identically at the constructor, which would make this
		// test pass for the wrong reason: it could not tell a routed command from an unrouted one.
		const before = { token: process.env.GH_TOKEN, repo: process.env.GITHUB_REPOSITORY };
		process.env.GH_TOKEN = "t".repeat(40);
		process.env.GITHUB_REPOSITORY = "marius-patrik/DarkFactory";
		try {
			for (const command of REQUIRED) {
				let message = "";
				try {
					await main([command]);
				} catch (error) {
					message = error instanceof Error ? error.message : String(error);
				}
				expect(message, `${command} reached the unknown-command branch`).not.toContain("Unknown command");
			}
		} finally {
			if (before.token === undefined) delete process.env.GH_TOKEN;
			else process.env.GH_TOKEN = before.token;
			if (before.repo === undefined) delete process.env.GITHUB_REPOSITORY;
			else process.env.GITHUB_REPOSITORY = before.repo;
		}
	});
});
