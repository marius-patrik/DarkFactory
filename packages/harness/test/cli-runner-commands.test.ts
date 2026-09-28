import { describe, expect, it } from "bun:test";
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
