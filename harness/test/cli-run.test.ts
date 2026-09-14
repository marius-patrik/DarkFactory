import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { redactToolInput } from "../src/cli.ts";
import { FileCredentialStore } from "../src/credentials.ts";

const temporary: string[] = [];

afterEach(async () => {
	for (const path of temporary.splice(0)) {
		if (!path.startsWith(process.cwd())) throw new Error(`Refusing cleanup outside workspace: ${path}`);
		await rm(path, { recursive: true, force: true });
	}
});

async function run(prompt: string, options: { args?: string[]; config?: Record<string, unknown>; setup?: (home: string) => Promise<void> } = {}) {
	const home = await mkdtemp(join(process.cwd(), ".cli-test-"));
	temporary.push(home);
	if (options.config) await writeFile(join(home, "config.json"), JSON.stringify(options.config), "utf8");
	await options.setup?.(home);
	const args = options.args ?? ["--chain", "faux/echo@test"];
	const child = Bun.spawn([process.execPath, "run", "src/cli.ts", "run", "--faux", "--json", ...args, prompt], {
		cwd: process.cwd(),
		env: {
			DF_HOME: home,
			DF_FAUX: "1",
			PATH: process.env.PATH ?? "",
			SYSTEMROOT: process.env.SYSTEMROOT ?? "C:\\Windows",
		},
		stdout: "pipe",
		stderr: "pipe",
	});
	const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
	return { stdout, stderr, exitCode, home };
}

describe("df run", () => {
	test("accounts reports OAuth ownership/expiry/refresh and logout removes only the named account", async () => {
		const home = await mkdtemp(join(process.cwd(), ".cli-test-")); temporary.push(home);
		const store = new FileCredentialStore(home);
		for (const label of ["acct-a", "acct-b"]) {
			await store.setSlot(`fixture:${label}`, "oauth", { type: "oauth", access: `access-${label}`, refresh: `refresh-${label}`, expires: Date.now() + 60_000 });
			await store.modifyAccount(`fixture:${label}`, async (current) => current ? ({ ...current, metadata: { ownership: label === "acct-a" ? "borrowed" : "df-owned", sync: "machine-only" } }) : undefined);
		}
		const invoke = async (...args: string[]) => {
			const child = Bun.spawn([process.execPath, "run", "src/cli.ts", ...args], { cwd: process.cwd(), env: { DF_HOME: home, PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "C:\\Windows" }, stdout: "pipe", stderr: "pipe" });
			const [stdout, stderr, exitCode] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
			return { stdout, stderr, exitCode };
		};
		const listed = await invoke("accounts");
		expect(listed.exitCode).toBe(0);
		expect(listed.stdout).toContain("type\texpiry\trefresh\townership");
		expect(listed.stdout).toContain("fixture:acct-a\toauth");
		expect(listed.stdout).toContain("reimport-first\tborrowed");
		expect(listed.stdout).toContain("df-managed\tdf-owned");
		expect((await invoke("logout", "fixture", "--account", "acct-b")).exitCode).toBe(0);
		expect(await store.readAccount("fixture:acct-a")).toBeDefined();
		expect(await store.readAccount("fixture:acct-b")).toBeUndefined();
	});
	test("redacts secret-looking tool input keys and bearer-like values for JSON events", () => {
		expect(redactToolInput({
			path: "safe.txt",
			apiKey: "key-value",
			nested: { password: "pass-value", note: "Bearer abc.def-123_456" },
			items: [{ authorization: "Basic hidden" }, "bearer token-value"],
		})).toEqual({
			path: "safe.txt",
			apiKey: "[REDACTED]",
			nested: { password: "[REDACTED]", note: "[REDACTED]" },
			items: [{ authorization: "[REDACTED]" }, "[REDACTED]"],
		});
	});
	test("emits JSONL session, text, step, and result events", async () => {
		const result = await run("hello");
		expect(result.exitCode).toBe(0);
		const events = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line) as Record<string, unknown>);
		expect(events.map((event) => event.type)).toContain("session");
		expect(events.map((event) => event.type)).toContain("text_delta");
		expect(events.map((event) => event.type)).toContain("step");
		expect(events.at(-1)?.type).toBe("result");
		const step = events.find((event) => event.type === "step")!;
		expect(step).toMatchObject({ provider: "faux", account: "test", model: "echo", stopReason: "stop", errorClass: null, failoverReason: null });
	});

	test("uses configured default, hard, and sensitive routes when no model is explicit", async () => {
		const config = {
			defaultChain: "faux/echo@default-policy",
			hardReasoningChain: "faux/echo@hard-policy",
			sensitiveChain: "faux/echo@sensitive-policy",
		};
		const normal = await run("hello", { args: [], config });
		const hard = await run("prove it", { args: ["--reasoning", "hard"], config });
		const sensitive = await run("contact dev@example.com", { args: [], config });
		const sessionAccount = (result: Awaited<ReturnType<typeof run>>) => {
			const events = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line) as { type: string; candidate?: { account?: string } });
			return events.find((event) => event.type === "session")?.candidate?.account;
		};
		expect([normal.exitCode, hard.exitCode, sensitive.exitCode]).toEqual([0, 0, 0]);
		expect(sessionAccount(normal)).toBe("default-policy");
		expect(sessionAccount(hard)).toBe("hard-policy");
		expect(sessionAccount(sensitive)).toBe("sensitive-policy");
	});

	test("returns 2 when every candidate is quota exhausted", async () => {
		const result = await run("__df_quota__");
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toContain("exhausted");
		expect(JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!) as unknown).toMatchObject({ type: "error", exitCode: 2 });
		expect(await Bun.file(join(result.home, "quota.json")).exists()).toBe(false);
	});

	test("returns 3 when every candidate has an auth failure", async () => {
		const result = await run("__df_auth__");
		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain("authentication");
		expect(JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!) as unknown).toMatchObject({ type: "error", exitCode: 3 });
	});

	test("preflight auth exhaustion exits 3 without starting a session and reports every reason", async () => {
		const result = await run("hello", { args: ["--chain", "google/gemini-3.8-flash@work,openai-codex/gpt-5.6-luna@work"] });
		expect(result.exitCode).toBe(3);
		const events = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line) as { type: string; reasons?: Array<{ kind: string }> });
		expect(events.some((event) => event.type === "session")).toBe(false);
		expect(events.filter((event) => event.type === "candidate_unavailable")).toHaveLength(2);
		expect(events.at(-1)?.reasons?.map((reason) => reason.kind)).toEqual(["auth", "auth"]);
	});

	test("preflight cooldown exhaustion exits 2 and includes the persisted reason", async () => {
		const result = await run("hello", { setup: async (home) => {
			await writeFile(join(home, "quota.json"), JSON.stringify({ version: 1, entries: {
				"faux/echo@test": { provider: "faux", model: "echo", account: "test", kind: "quota_exhausted", markedAt: Date.now(), resetAt: Date.now() + 60_000 },
			} }), "utf8");
		} });
		expect(result.exitCode).toBe(2);
		const events = result.stdout.trim().split(/\r?\n/u).map((line) => JSON.parse(line) as { type: string; reasons?: Array<{ kind: string }> });
		expect(events.some((event) => event.type === "session")).toBe(false);
		expect(events.at(-1)?.reasons?.[0]?.kind).toBe("quota_exhausted");
	});

	test("faux quota failures never create or modify the persistent quota store", async () => {
		const marker = JSON.stringify({ version: 1, entries: { preserved: { provider: "real", model: "model", account: "default", kind: "auth", markedAt: 1 } } });
		const result = await run("__df_quota__", { setup: (home) => writeFile(join(home, "quota.json"), marker, "utf8") });
		expect(result.exitCode).toBe(2);
		expect(await readFile(join(result.home, "quota.json"), "utf8")).toBe(marker);
	});
});
