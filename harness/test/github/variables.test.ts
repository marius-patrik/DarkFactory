import { expect, test } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "./helpers.ts";

test("repository variable CRUD supports quota checkpoint names", async () => {
	const mock = scripted([
		json({ variables: [{ name: "DF_QUOTA_run-1", value: "{}", created_at: "x", updated_at: "x" }] }),
		json({ name: "DF_QUOTA_run-1", value: "{}", created_at: "x", updated_at: "x" }),
		json(undefined, 201),
		json(undefined, 204),
		json(undefined, 204),
	]);
	const repo = new GitHubRepository(new GitHubClient({ token: "t", fetch: mock.fetch }), "o", "r");
	expect((await repo.listVariables())[0]!.name).toBe("DF_QUOTA_run-1");
	expect((await repo.getVariable("DF_QUOTA_run-1")).value).toBe("{}");
	await repo.createVariable("DARKFACTORY_QUOTA_PROVIDERS", "{}");
	await repo.updateVariable("DF_QUOTA_run-1", "next");
	await repo.deleteVariable("DF_QUOTA_run-1");
	expect(mock.calls[4]!.url).toEndWith("/actions/variables/DF_QUOTA_run-1");
});
