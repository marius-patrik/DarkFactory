import { describe, expect, it } from "bun:test";
import { GitHubClient } from "../../src/github/client.ts";
import { readDeclaredLanes } from "../../src/install/sweep-protect.ts";
import { json, scripted } from "../github/helpers.ts";

/**
 * The sweep reads consumer repositories over the API rather than from a checkout, so the lanes it
 * decides protection from have to be read remotely. These tests are about the read, because that is
 * where a repository's *actual* policy could be misread and the pipeline would then enforce the wrong
 * thing on somebody's default branch.
 */
describe("reading declared lanes from a consumer's configuration", () => {
	const client = (responses: Response[]) => new GitHubClient({ token: "ghs", fetch: scripted(responses).fetch });
	const encoded = (value: unknown) =>
		json({ content: Buffer.from(JSON.stringify(value)).toString("base64"), encoding: "base64" });

	it("reads lanes from repo.dfconfig", async () => {
		const lanes = await readDeclaredLanes(
			client([
				encoded({
					repo: {
						protection: {
							lanes: [
								{
									branch: "main",
									required_checks: ["quality", "verify-bound-issue"],
									approvals: 1,
									strict: true,
									enforce_admins: false,
									resolve_conversation: true,
								},
							],
						},
					},
				}),
			]),
			"acme/one",
			"main",
		);

		expect(lanes).toEqual([
			{
				branch: "main",
				requiredChecks: ["quality", "verify-bound-issue"],
				approvals: 1,
				strict: true,
				enforceAdmins: false,
				resolveConversations: true,
			},
		]);
	});

	it("falls through to an alias document when repo.dfconfig is absent", async () => {
		// The case that matters: `plan.ts` honours whichever document a repository selected, so a
		// repository using `config.dfconfig` has its policy in a file a single-name probe never finds.
		// Reading only `repo.dfconfig` would find no lanes and silently protect nothing.
		const lanes = await readDeclaredLanes(
			client([
				json({ message: "Not Found" }, 404),
				encoded({ repo: { protection: { lanes: [{ branch: "trunk", required_checks: ["ci"] }] } } }),
			]),
			"acme/one",
			"trunk",
		);

		expect(lanes).toEqual([{ branch: "trunk", requiredChecks: ["ci"] }]);
	});

	it("returns an empty list for a repository that declares no lanes", async () => {
		// Distinct from "no document": this one is a repository that chose not to protect anything.
		const lanes = await readDeclaredLanes(
			client([encoded({ repo: { identity: { owner: "acme", repo: "one" } } })]),
			"acme/one",
			"main",
		);

		expect(lanes).toEqual([]);
	});

	it("returns undefined when the repository has no configuration document at all", async () => {
		// Also distinct. "No document" means nothing was declared *because nothing could be*; the caller
		// reports that differently from a repository that declined to protect.
		const lanes = await readDeclaredLanes(
			client([
				json({ message: "Not Found" }, 404),
				json({ message: "Not Found" }, 404),
				json({ message: "Not Found" }, 404),
			]),
			"acme/one",
			"main",
		);

		expect(lanes).toBeUndefined();
	});

	it("reads from the requested branch", async () => {
		// Protection applies to a named branch, and a lane declaring `trunk` cannot be read from `main`.
		const calls: string[] = [];
		const document = encoded({ repo: { protection: { lanes: [{ branch: "trunk", required_checks: [] }] } } });
		const clientWithCalls = new GitHubClient({
			token: "ghs",
			fetch: async (input) => {
				calls.push(String(input));
				return document;
			},
		});

		await readDeclaredLanes(clientWithCalls, "acme/one", "trunk");

		expect(calls[0]).toContain("ref=trunk");
	});

	it("drops a lane with no branch rather than protecting an unnamed one", async () => {
		// A ruleset with no branch is not something GitHub will accept, and guessing a branch name would
		// apply protection to something the repository never asked for.
		const lanes = await readDeclaredLanes(
			client([
				encoded({
					repo: { protection: { lanes: [{ required_checks: ["ci"] }, { branch: "main", required_checks: ["ci"] }] } },
				}),
			]),
			"acme/one",
			"main",
		);

		expect(lanes).toEqual([{ branch: "main", requiredChecks: ["ci"] }]);
	});

	it("defaults a lane's required checks to none rather than to something invented", async () => {
		// A lane with no checks is reported by `protectLaneWhenGreen` as protecting nothing. Inventing a
		// default here would make the decision report something the repository never wrote.
		const lanes = await readDeclaredLanes(
			client([encoded({ repo: { protection: { lanes: [{ branch: "main" }] } } })]),
			"acme/one",
			"main",
		);

		expect(lanes).toEqual([{ branch: "main", requiredChecks: [] }]);
	});
});
