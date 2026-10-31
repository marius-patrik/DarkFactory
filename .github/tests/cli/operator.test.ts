import { describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	OperatorCliError,
	inspectRequest,
	listRequests,
	parseOperatorArgs,
	parseRequestId,
	renderTui,
	runOperatorCli,
	runOperatorTui,
	stepCursor,
	summarizeRun,
	TUI_VIEWS,
} from "../../../packages/cli/src/operator.ts";
import type { RunState } from "../../../packages/protocol/src/workflow.ts";
import { exitCodeFor, main, redactToolInput } from "../../../packages/cli/src/cli.ts";
import type { OperatorQuotaSnapshot } from "../../../packages/protocol/src/quota.ts";
import { RUNNER_COMMANDS } from "../../../packages/harness/src/pipeline/main.ts";

function state(overrides: Partial<RunState> = {}): RunState {
	return {
		run_id: "run-123",
		current_node: "planning-review",
		outputs: { pr_number: 17, commit_sha: "a".repeat(40), external_checks_head_sha: "b".repeat(40) },
		hints: ["SECRET: never print raw hints"],
		iterations: { planning: 2 },
		...overrides,
	};
}

async function fixture(run: RunState = state()) {
	const root = await mkdtemp(join(tmpdir(), "df-operator-"));
	await mkdir(join(root, "42"));
	await writeFile(join(root, "42", "state.df"), JSON.stringify(run));
	return root;
}

describe("production operator CLI", () => {
	test("only accepts canonical positive safe decimal Request identities", () => {
		expect(parseRequestId("12")).toBe(12);
		for (const invalid of ["", "0", "-1", "../2", "2/3", "01", "1.2", "9007199254740992"])
			expect(() => parseRequestId(invalid)).toThrow(OperatorCliError);
	});

	test("parses strict operator options without treating flags as paths or IDs", () => {
		expect(parseOperatorArgs(["inspect", "42", "--json", "--runs", "/tmp/runs"])).toEqual({
			command: "inspect",
			id: 42,
			runs: "/tmp/runs",
			json: true,
		});
		for (const args of [["inspect", "42", "--unknown"], ["list", "--runs"], ["inspect", "-1"]])
			expect(() => parseOperatorArgs(args)).toThrow(OperatorCliError);
	});

	test("projects only safe persisted state and never trusts a stale final approval", () => {
		const snap = summarizeRun(42, state({
			outputs: {
				pr_number: 17,
				commit_sha: "a".repeat(40),
				external_checks_head_sha: "b".repeat(40),
				merge_authorization: { headSha: "a".repeat(40), actor: "untrusted", fingerprint: "wrong" },
				password: "not-shown",
				prompt: "not-shown",
			},
		}));
		expect(snap.pr?.number).toBe(17);
		expect(snap.approval).toBe("stale");
		expect(snap.recovery).toBe("ready");
		expect(JSON.stringify(snap)).not.toContain("not-shown");
		expect(JSON.stringify(snap)).not.toContain("SECRET");
	});

	test("reads canonical production state.df, sorted by numeric Request number", async () => {
		const root = await fixture();
		try {
			await mkdir(join(root, "7"));
			await writeFile(join(root, "7", "state.df"), JSON.stringify(state({ current_node: "request-intake" })));
			const runs = await listRequests(root);
			expect(runs.map((run) => run.request)).toEqual([7, 42]);
			expect(runs[1]?.iterations.planning).toBe(2);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("rejects corrupt state and symlinked Request directories without resetting them", async () => {
		const root = await fixture();
		try {
			await writeFile(join(root, "42", "state.df"), "{corrupt");
			await expect(inspectRequest(root, 42)).rejects.toThrow("corrupt durable state");
			await symlink(join(root, "42"), join(root, "43"), "dir");
			await expect(inspectRequest(root, 43)).rejects.toThrow("Cannot trust run state");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("unavailable store is an explicit nonzero blocked result", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-missing-runs-"));
		try {
			await expect(listRequests(join(root, "missing"))).rejects.toMatchObject({ exitCode: 3 });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("rejects lifecycle mutations without a governed authorization adapter", async () => {
		for (const command of ["approve", "cancel", "retry", "restart", "recover"])
			await expect(runOperatorCli([command, "42"])).rejects.toMatchObject({
				exitCode: 3,
				message: expect.stringContaining("BLOCKED"),
			});
		expect(exitCodeFor(new OperatorCliError("blocked", 3))).toBe(3);
		expect(exitCodeFor(new OperatorCliError("invalid", 2))).toBe(2);
	});

	test("JSON inspection uses one machine-readable envelope and no raw state", async () => {
		const root = await fixture();
		const original = console.log;
		const lines: string[] = [];
		console.log = (...parts: unknown[]) => { lines.push(parts.join(" ")); };
		try {
			await runOperatorCli(["inspect", "42", "--runs", root, "--json"]);
			expect(lines).toHaveLength(1);
			const output = JSON.parse(lines[0]!);
			expect(output.type).toBe("inspect");
			expect(output.value.request).toBe(42);
			expect(JSON.stringify(output)).not.toContain("SECRET");
		} finally {
			console.log = original;
			await rm(root, { recursive: true, force: true });
		}
	});
});

describe("interactive operator TUI", () => {
	test("keeps cursor within bounds when rows disappear and navigates all views", () => {
		expect(stepCursor({ selected: 0, view: 0 }, "up", 0).selected).toBe(0);
		expect(stepCursor({ selected: 0, view: 0 }, "down", 0).selected).toBe(0);
		expect(stepCursor({ selected: 0, view: 0 }, "down", 2).selected).toBe(1);
		expect(stepCursor({ selected: 0, view: 0 }, "left", 2).view).toBe(TUI_VIEWS.length - 1);
		expect(stepCursor({ selected: 0, view: 0 }, "tab", 2).view).toBe(1);
	});

	test("clips untrusted terminal output on narrow resized terminals", () => {
		const run = summarizeRun(42, state({ current_node: "a".repeat(100) + "\u001b[31m" }));
		const rendered = renderTui([run], { selected: 0, view: 0 }, 35, 8);
		expect(rendered.split("\n").every((line) => [...line].length <= 35)).toBe(true);
		expect(rendered).not.toContain("\u001b");
		expect(rendered).toContain("DARKFACTORY");
	});

	test("help advertises every delegated stage and real operator command without provider setup", async () => {
		const lines: string[] = [];
		const original = console.log;
		console.log = (...parts: unknown[]) => { lines.push(parts.join(" ")); };
		try {
			await main(["--help"]);
			for (const stage of RUNNER_COMMANDS) expect(lines.join("\n")).toContain(stage);
			expect(lines.join("\n")).toContain("df operator");
			expect(lines.join("\n")).toContain("df tui");
			expect(lines.join("\n")).toContain("lifecycle mutations blocked");
		} finally {
			console.log = original;
		}
	});

	test("redacts nested credentials in streamed event payloads and diagnostic text", () => {
		const output = redactToolInput({
			type: "step",
			token: "exposed-token",
			detail: {
				errorMessage: "Authorization: Bearer myplaintexttoken",
				password: "sensitive",
				headers: ["api_key=topsecret"],
			},
		});
		const serialized = JSON.stringify(output);
		for (const secret of ["exposed-token", "myplaintexttoken", "sensitive", "topsecret"])
			expect(serialized).not.toContain(secret);
		expect(serialized).toContain("[REDACTED]");
	});

	test("provider tab uses canonical redacted quota snapshot, not made-up status", () => {
		const snapshot: OperatorQuotaSnapshot = {
			version: 1,
			generatedAt: "2026-10-31T11:00:00Z",
			providers: [{
				id: "example",
				name: "Example",
				enabled: true,
				credentials: "configured",
				state: "available",
				accounts: [{
					label: "work",
					models: [{ provider: "example", account: "work", model: "model-1", state: "available", items: [] }],
				}],
			}],
		};
		const output = renderTui([], { selected: 0, view: TUI_VIEWS.indexOf("providers") }, 80, 30, "", snapshot);
		expect(output).toContain("example");
		expect(output).toContain("model-1");
		expect(output).toContain("configured");
		expect(output).not.toContain("api_key");
	});

	test("exact-head checks fail closed when there is no authenticated GitHub backend", async () => {
		const root = await fixture();
		const previous = {
			GH_TOKEN: process.env.GH_TOKEN,
			GITHUB_TOKEN: process.env.GITHUB_TOKEN,
		};
		try {
			delete process.env.GH_TOKEN;
			delete process.env.GITHUB_TOKEN;
			await expect(runOperatorCli(["checks", "42", "--runs", root])).rejects.toMatchObject({
				exitCode: 3,
				message: expect.stringContaining("BLOCKED"),
			});
		} finally {
			if (previous.GH_TOKEN === undefined) delete process.env.GH_TOKEN;
			else process.env.GH_TOKEN = previous.GH_TOKEN;
			if (previous.GITHUB_TOKEN === undefined) delete process.env.GITHUB_TOKEN;
			else process.env.GITHUB_TOKEN = previous.GITHUB_TOKEN;
			await rm(root, { recursive: true, force: true });
		}
	});

	test("refuses to enter raw mode when stdin/stdout are not interactive", async () => {
		if (!process.stdin.isTTY || !process.stdout.isTTY)
			await expect(runOperatorTui([])).rejects.toMatchObject({ exitCode: 3 });
	});
});
