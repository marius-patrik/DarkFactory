import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { ToolPolicy } from "../src/harness/tools.ts";

const temporary: string[] = [];

afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

describe("ToolPolicy regression triplet", () => {
	test("success: permits a workspace path", () => {
		const cwd = resolve("workspace");
		expect(new ToolPolicy({ cwd }).evaluate({ toolName: "write", input: { path: "src/file.ts" } }).allowed).toBe(true);
	});

	test("edge-input: blocks parent traversal", () => {
		const cwd = resolve("workspace");
		const decision = new ToolPolicy({ cwd }).evaluate({ toolName: "read", input: { path: "../secret.txt" } });
		expect(decision.allowed).toBe(false);
		expect(decision.reason).toContain("escapes workspace");
	});

	test("denied-failure: explicit command deny wins", () => {
		const cwd = resolve("workspace");
		const decision = new ToolPolicy({ cwd, deny: ["command:echo forbidden"] }).evaluate({
			toolName: "bash",
			input: { command: "echo forbidden" },
		});
		expect(decision.allowed).toBe(false);
		expect(decision.reason).toContain("denied by policy");
	});

	test("blocks an existing symlink that resolves outside the workspace", async () => {
		const root = await mkdtemp(join(process.cwd(), ".tool-policy-"));
		temporary.push(root);
		const cwd = join(root, "workspace");
		const outside = join(root, "outside");
		await mkdir(cwd);
		await mkdir(outside);
		await symlink(outside, join(cwd, "escape"));
		const decision = new ToolPolicy({ cwd }).evaluate({ toolName: "read", input: { path: "escape/secret.txt" } });
		expect(decision.allowed).toBe(false);
		expect(decision.reason).toContain("escapes workspace");
	});

	test.each(['cd "/tmp"', "cd '..'", "cd \\.."])("blocks quoted or escaped directory escape: %s", (command) => {
		const cwd = resolve("workspace");
		expect(new ToolPolicy({ cwd }).evaluate({ toolName: "bash", input: { command } }).allowed).toBe(false);
	});
});
