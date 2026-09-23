import { describe, expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "./helpers.ts";

function repository(responses: Response[]): GitHubRepository {
	const mock = scripted(responses);
	return new GitHubRepository(new GitHubClient({ token: () => "fixture", fetch: mock.fetch }), "owner", "repo");
}

describe("GitHub repository fail-closed invariants", () => {
	test("neutral and skipped check runs do not satisfy required checks", async () => {
		const repo = repository([
			json({
				check_runs: [
					{ name: "neutral", status: "completed", conclusion: "neutral" },
					{ name: "skipped", status: "completed", conclusion: "skipped" },
					{ name: "success", status: "completed", conclusion: "success" },
				],
			}),
			json({ statuses: [] }),
		]);

		const status = await repo.requiredCheckStatus("head", ["neutral", "skipped", "success"]);
		expect(status).toEqual({ state: "failure", missing: [], failing: ["neutral", "skipped"] });
	});

	test("missing default-branch metadata fails instead of inventing main", async () => {
		const repo = repository([json({})]);
		await expect(repo.getDefaultBranchHeadSha()).rejects.toThrow("did not declare a default branch");
	});
});
