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

async function run(
	prompt: string,
	options: { args?: string[]; config?: Record<string, unknown>; setup?: (home: string) => Promise<void> } = {},
) {
	const home = await mkdtemp(join(process.cwd(), ".cli-test-"));
	temporary.push(home);
	if (options.config) await writeFile(join(home, "config.df"), JSON.stringify(options.config), "utf8");
	await options.setup?.(home);
	const args = options.args ?? ["--chain", "faux/echo@test"];
	const cliPath = join(process.cwd(), "harness", "src", "cli.ts");
	const child = Bun.spawn([process.execPath, "run", cliPath, "run", "--faux", "--json", ...args, prompt], {
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
	const [stdout, stderr, exitCode] = await Promise.all([
		new Response(child.stdout).text(),
		new Response(child.stderr).text(),
		child.exited,
	]);
	return { stdout, stderr, exitCode, home };
}

describe("df run", () => {
	test("df route explains a route and df run emits the route before the session", async () => {
		const home = await mkdtemp(join(process.cwd(), ".cli-test-"));
		temporary.push(home);
		await writeFile(
			join(home, "config.df"),
			JSON.stringify({
				defaultChain: "faux/echo@test",
				router: {
					policies: [{ id: "chat", match: { kind: ["chat"] }, prefer: { candidates: ["faux/echo@test"] } }],
					capabilityTiers: [{ id: "light", match: ["faux/*"] }],
					defaultTier: "light",
					difficultyTiers: { easy: "light", medium: "light", hard: "light" },
				},
			}),
			"utf8",
		);
		const invoke = async (...command: string[]) => {
			const cliPath = join(process.cwd(), "harness", "src", "cli.ts");
			const child = Bun.spawn([process.execPath, "run", cliPath, ...command], {
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
			const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
			return { stdout, exitCode };
		};
		const explained = await invoke("route", "hello", "--json", "--faux", "--difficulty", "easy", "--min-tier", "light");
		expect(explained.exitCode).toBe(0);
		expect(JSON.parse(explained.stdout)).toMatchObject({
			profile: { kind: "chat", size: "small", difficulty: "easy", minTier: "light" },
			difficulty: "easy",
			minCapabilityTier: "light",
			selectedCapabilityTier: "light",
			ranked: [{ status: "chosen", capabilityTier: "light" }],
		});
		const runResult = await invoke("run", "hello", "--json", "--faux", "--difficulty", "easy", "--min-tier", "light");
		expect(runResult.exitCode).toBe(0);
		const events = runResult.stdout
			.trim()
			.split(/\r?\n/u)
			.map((line) => JSON.parse(line) as { type: string });
		expect(events.slice(0, 2).map((event) => event.type)).toEqual(["route", "session"]);
		expect(events[0]).toMatchObject({
			type: "route",
			difficulty: "easy",
			minCapabilityTier: "light",
			selectedCapabilityTier: "light",
		});
	});
	test("df route rejects an unknown --min-tier against configured tiers", async () => {
		const result = await run("hello", {
			args: ["--difficulty", "easy", "--min-tier", "missing"],
			config: {
				router: {
					policies: [],
					capabilityTiers: [{ id: "light", match: ["faux/*"] }],
					defaultTier: "light",
					difficultyTiers: { easy: "light", medium: "light", hard: "light" },
				},
			},
		});
		expect(result.exitCode).not.toBe(0);
		expect(result.stderr).toContain("--min-tier must be one of: light");
	});

	test("df run records per-kind outcomes for the learning hook", async () => {
		const result = await run("hello");
		expect(result.exitCode).toBe(0);
		const lines = (await readFile(join(result.home, "router-outcomes.df"), "utf8")).trim().split(/\r?\n/u);
		expect(lines.length).toBeGreaterThanOrEqual(1);
		for (const line of lines) {
			expect(JSON.parse(line) as unknown).toMatchObject({
				candidate: { provider: "faux", model: "echo", account: "test" },
				kind: "chat",
				success: true,
			});
		}
	});
	test("accounts reports OAuth ownership/expiry/refresh and logout removes only the named account", async () => {
		const home = await mkdtemp(join(process.cwd(), ".cli-test-"));
		temporary.push(home);
		const store = new FileCredentialStore(home);
		for (const label of ["acct-a", "acct-b"]) {
			await store.setSlot(`fixture:${label}`, "oauth", {
				type: "oauth",
				access: `access-${label}`,
				refresh: `refresh-${label}`,
				expires: Date.now() + 60_000,
			});
			await store.modifyAccount(`fixture:${label}`, async (current) =>
				current
					? {
							...current,
							metadata: {
								...(label === "acct-a" ? { importer: "fixture", ownership: "borrowed" } : { ownership: "df-owned" }),
								sync: "machine-only",
							},
						}
					: undefined,
			);
		}
		const invoke = async (...args: string[]) => {
			const cliPath = join(process.cwd(), "harness", "src", "cli.ts");
			const child = Bun.spawn([process.execPath, "run", cliPath, ...args], {
				cwd: process.cwd(),
				env: { DF_HOME: home, PATH: process.env.PATH ?? "", SYSTEMROOT: process.env.SYSTEMROOT ?? "C:\\Windows" },
				stdout: "pipe",
				stderr: "pipe",
			});
			const [stdout, stderr, exitCode] = await Promise.all([
				new Response(child.stdout).text(),
				new Response(child.stderr).text(),
				child.exited,
			]);
			return { stdout, stderr, exitCode };
		};
		const listed = await invoke("accounts");
		expect(listed.exitCode).toBe(0);
		expect(listed.stdout).toContain("type\texpiry\trefresh\townership");
		expect(listed.stdout).toContain("fixture:acct-a\toauth");
		expect(listed.stdout).toContain("df-managed\tdf-owned (imported from fixture)");
		expect(listed.stdout).toContain("df-managed\tdf-owned");
		expect((await invoke("logout", "fixture", "--account", "acct-b")).exitCode).toBe(0);
		expect(await store.readAccount("fixture:acct-a")).toBeDefined();
		expect(await store.readAccount("fixture:acct-b")).toBeUndefined();
	});
	test("redacts secret-looking tool input keys and bearer-like values for JSON events", () => {
		expect(
			redactToolInput({
				path: "safe.txt",
				apiKey: "key-value",
				nested: { password: "pass-value", note: "Bearer abc.def-123_456" },
				items: [{ authorization: "Basic hidden" }, "bearer token-value"],
			}),
		).toEqual({
			path: "safe.txt",
			apiKey: "[REDACTED]",
			nested: { password: "[REDACTED]", note: "[REDACTED]" },
			items: [{ authorization: "[REDACTED]" }, "[REDACTED]"],
		});
	});
	test("emits JSONL session, text, step, and result events", async () => {
		const result = await run("hello");
		expect(result.exitCode).toBe(0);
		const events = result.stdout
			.trim()
			.split(/\r?\n/u)
			.map((line) => JSON.parse(line) as Record<string, unknown>);
		expect(events.map((event) => event.type)).toContain("session");
		expect(events.map((event) => event.type)).toContain("text_delta");
		expect(events.map((event) => event.type)).toContain("step");
		expect(events.at(-1)?.type).toBe("result");
		const step = events.find((event) => event.type === "step")!;
		expect(step).toMatchObject({
			provider: "faux",
			account: "test",
			model: "echo",
			stopReason: "stop",
			errorClass: null,
			failoverReason: null,
		});
	});

	test("uses configured default, hard, and sensitive routes when no model is explicit", async () => {
		const config = {
			defaultChain: "faux/echo@default-policy",
			hardReasoningChain: "faux/echo@hard-policy",
			sensitiveChain: "faux/echo@sensitive-policy",
			// Faux accounts declare no data-collection policy (unknown), which sensitive routing refuses by default.
			router: { policies: [], dataCollection: { sensitive: ["none", "unknown"] } },
		};
		const normal = await run("hello", { args: [], config });
		const hard = await run("prove it", { args: ["--reasoning", "hard"], config });
		const sensitive = await run("contact jane.doe@proton.me", { args: [], config });
		const sessionAccount = (result: Awaited<ReturnType<typeof run>>) => {
			const events = result.stdout
				.trim()
				.split(/\r?\n/u)
				.map((line) => JSON.parse(line) as { type: string; candidate?: { account?: string } });
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
		expect(JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!) as unknown).toMatchObject({
			type: "error",
			exitCode: 2,
		});
		expect(await Bun.file(join(result.home, "quota.df")).exists()).toBe(false);
	});

	test("returns 3 when every candidate has an auth failure", async () => {
		const result = await run("__df_auth__");
		expect(result.exitCode).toBe(3);
		expect(result.stderr).toContain("authentication");
		expect(JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1)!) as unknown).toMatchObject({
			type: "error",
			exitCode: 3,
		});
	});

	test("preflight auth exhaustion exits 3 without starting a session and reports every reason", async () => {
		const result = await run("hello", {
			args: ["--chain", "google/gemini-3.8-flash@work,openai-codex/gpt-5.6-luna@work"],
		});
		expect(result.exitCode).toBe(3);
		const events = result.stdout
			.trim()
			.split(/\r?\n/u)
			.map((line) => JSON.parse(line) as { type: string; reasons?: Array<{ kind: string }> });
		expect(events.some((event) => event.type === "session")).toBe(false);
		expect(events.filter((event) => event.type === "candidate_unavailable")).toHaveLength(2);
		expect(events.at(-1)?.reasons?.map((reason) => reason.kind)).toEqual(["auth", "auth"]);
	});

	test("preflight cooldown exhaustion exits 2 and includes the persisted reason", async () => {
		const result = await run("hello", {
			config: { maxWaitMs: 1 },
			setup: async (home) => {
				const observedAt = Date.now();
				await writeFile(
					join(home, "limits.df"),
					JSON.stringify({
						version: 1,
						entries: {
							"faux/test/echo/daily/usage": {
								provider: "faux",
								model: "echo",
								account: "test",
								type: "daily",
								observedAt,
								resetAt: observedAt + 60_000,
								source: "rule",
								remaining: 0,
							},
						},
					}),
					"utf8",
				);
			},
		});
		expect(result.exitCode).toBe(2);
		const events = result.stdout
			.trim()
			.split(/\r?\n/u)
			.map((line) => JSON.parse(line) as { type: string; reasons?: Array<{ kind: string }>; limits?: unknown[] });
		expect(events.some((event) => event.type === "session")).toBe(false);
		expect(events.at(-1)?.reasons?.[0]?.kind).toBe("quota_exhausted");
		expect(events.at(-1)?.limits).toHaveLength(1);
	});

	test("faux quota failures never create or modify the persistent quota store", async () => {
		const marker = JSON.stringify({
			version: 1,
			entries: { preserved: { provider: "real", model: "model", account: "default", kind: "auth", markedAt: 1 } },
		});
		const result = await run("__df_quota__", { setup: (home) => writeFile(join(home, "quota.df"), marker, "utf8") });
		expect(result.exitCode).toBe(2);
		expect(await readFile(join(result.home, "quota.df"), "utf8")).toBe(marker);
	});

	test("df providers shows data-collection column", async () => {
		const home = await mkdtemp(join(process.cwd(), ".cli-test-"));
		temporary.push(home);
		const providersConfig = {
			version: 1,
			providers: [
				{
					id: "prov1",
					name: "Provider One",
					dialect: "openai-completions" as const,
					baseUrl: "https://example.com",
					auth: [{ kind: "api_key" as const, slot: "api_key", placement: "header", name: "x-api-key" }],
					requiredCredentialSlots: ["api_key"],
					models: { static: [{ id: "model1", name: "Model 1" }] },
					capabilities: { tools: false, reasoning: false, images: false },
					free: {
						kind: "permanent",
						keyUrl: "https://example.com/key",
						checkedAt: new Date().toISOString(),
						data: {
							collection: "logging",
							source: "test",
							sourceUrl: "https://example.com",
							checkedAt: new Date().toISOString(),
						},
					},
				},
				{
					id: "prov2",
					name: "Provider Two",
					dialect: "openai-completions" as const,
					baseUrl: "https://example.org",
					auth: [{ kind: "api_key" as const, slot: "api_key", placement: "header", name: "x-api-key" }],
					requiredCredentialSlots: ["api_key"],
					models: { static: [{ id: "model2", name: "Model 2" }] },
					capabilities: { tools: false, reasoning: false, images: false },
					data: {
						collection: "training",
						source: "test2",
						sourceUrl: "https://example.org",
						checkedAt: new Date().toISOString(),
					},
				},
				{
					id: "prov3",
					name: "Provider Three",
					dialect: "openai-completions" as const,
					baseUrl: "https://example.net",
					auth: [{ kind: "api_key" as const, slot: "api_key", placement: "header", name: "x-api-key" }],
					requiredCredentialSlots: ["api_key"],
					models: { static: [{ id: "model3", name: "Model 3" }] },
					capabilities: { tools: false, reasoning: false, images: false },
				},
			],
		};
		await writeFile(join(home, "providers.df"), JSON.stringify(providersConfig), "utf8");
		const cliPath = join(process.cwd(), "harness", "src", "cli.ts");
		const child = Bun.spawn([process.execPath, "run", cliPath, "providers"], {
			cwd: process.cwd(),
			env: { DF_HOME: home, PATH: process.env.PATH ?? "" },
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
		expect(exitCode).toBe(0);
		const lines = stdout.trim().split(/\r?\n/);
		expect(lines[0]).toContain("data-collection");
		const rows = lines.slice(1).map((l) => l.split("\t"));
		const prov1 = rows.find((r) => r[0] === "prov1");
		const prov2 = rows.find((r) => r[0] === "prov2");
		const prov3 = rows.find((r) => r[0] === "prov3");
		expect(prov1?.[3]).toBe("logging");
		expect(prov2?.[3]).toBe("training");
		expect(prov3?.[3]).toBe("unknown");
	});
});
