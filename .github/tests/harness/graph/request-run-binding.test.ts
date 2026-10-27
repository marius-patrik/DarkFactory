import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRequestRunForPullRequest } from "../../../../packages/harness/src/graph/dispatch.ts";

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
