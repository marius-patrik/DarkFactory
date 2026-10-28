import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { dispatch, resolveRequestRunForPullRequest } from "../../../../packages/harness/src/graph/dispatch.ts";

const roots: string[] = [];
afterEach(async () => {
	await Promise.all(roots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

async function runs() {
	const root = await mkdtemp(join(tmpdir(), "df-pr-binding-"));
	roots.push(root);
	return root;
}

async function saveRun(root: string, request: number, prNumber: number | null) {
	const dir = join(root, String(request));
	await mkdir(dir, { recursive: true });
	await writeFile(join(dir, "state.df"), JSON.stringify({
		run_id: `request-${request}`, current_node: "merge-gate",
		outputs: prNumber ? { pr_number: prNumber } : {}, hints: [],
	}));
}

describe("PR ingress belongs to its originating Request graph", () => {
	test("maps reviews and check events to the persisted Request, not a PR-number run", async () => {
		const root = await runs();
		await saveRun(root, 17, 204);
		await saveRun(root, 204, 909);
		expect(await resolveRequestRunForPullRequest(root, 204)).toBe("17");
		expect(await resolveRequestRunForPullRequest(root, 909)).toBe("204");
	});

	test("never initializes a new independent workflow run for an unknown PR", async () => {
		const root = await runs();
		await saveRun(root, 17, null);
		expect(await resolveRequestRunForPullRequest(root, 204)).toBeUndefined();
		expect(await resolveRequestRunForPullRequest(join(root, "missing"), 204)).toBeUndefined();
	});

	test("a real PR review event resumes exactly the bound Request run", async () => {
		const root = await runs();
		await saveRun(root, 17, 204);
		await writeFile(join(root, "17", "state.df"), JSON.stringify({
			run_id: "request-17", current_node: "approval", outputs: { pr_number: 204 }, hints: [],
		}));
		const graph = {
			version: 1 as const, checks: [],
			nodes: [
				{ id: "approval", kind: "gate" as const,
					author_associations: ["OWNER"], allow_review_state: ["APPROVED"],
					command: "^\\s*(?:/df\\s+|/)(?:approve|reject|revise)\\s*$" },
				{ id: "apply", kind: "automation" as const, script: "apply" },
			],
			edges: [{ from: "approval", to: "apply", on: { gate_outcome: "approved" as const } }],
		};
		const graphFile = join(root, "graph.json");
		const eventFile = join(root, "review.json");
		await writeFile(graphFile, JSON.stringify(graph));
		await writeFile(eventFile, JSON.stringify({
			action: "submitted",
			review: { state: "approved", author_association: "OWNER",
				user: { login: "human-maintainer", type: "User" } },
			pull_request: { number: 204, head: { sha: "a".repeat(40) } },
			sender: { login: "human-maintainer", type: "User" },
		}));
		let invoked = 0;
		const logs: string[] = [];
		const original = console.log;
		console.log = (line) => { logs.push(String(line)); };
		try {
			await dispatch([
				"--event-name", "pull_request_review",
				"--event", eventFile, "--graph", graphFile, "--runs", root,
			], {
				deliveryId: "review-delivery-204",
				runtime: async () => ({
					handlers: {
						agent: async () => { throw new Error("unexpected agent"); },
						automation: async () => {
							invoked++;
							return { outcome: "success", outputs: { authorized: true } };
						},
					},
				}),
			});
		} finally {
			console.log = original;
		}
		expect(invoked).toBe(1);
		const actual = JSON.parse(await readFile(join(root, "17", "state.df"), "utf8"));
		expect(actual.outputs.authorized).toBe(true);
		expect(actual.current_node).toBe("apply");
		expect(JSON.parse(logs[0]!).subject).toBe("17");
		await expect(readFile(join(root, "204", "state.df"), "utf8")).rejects.toMatchObject({ code: "ENOENT" });
	});

	test("rejects ambiguous PR ownership rather than granting merge authority to either Request", async () => {
		const root = await runs();
		await saveRun(root, 17, 204);
		await saveRun(root, 18, 204);
		await expect(resolveRequestRunForPullRequest(root, 204)).rejects.toThrow("multiple Request runs");
	});

	test("rejects invalid or unsafe PR identifiers", async () => {
		const root = await runs();
		await expect(resolveRequestRunForPullRequest(root, -1)).rejects.toThrow("Invalid PR identity");
		await expect(resolveRequestRunForPullRequest(root, NaN)).rejects.toThrow("Invalid PR identity");
	});

	test("corrupt persisted Request state fails closed", async () => {
		const root = await runs();
		await mkdir(join(root, "17"), { recursive: true });
		await writeFile(join(root, "17", "state.df"), "{invalid");
		await expect(resolveRequestRunForPullRequest(root, 204)).rejects.toThrow();
	});
});
