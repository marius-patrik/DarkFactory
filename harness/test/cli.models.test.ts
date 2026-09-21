import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const temporary: string[] = [];

afterEach(async () => {
	for (const path of temporary.splice(0)) await rm(path, { recursive: true, force: true });
});

const provider = {
	id: "test-cli-models",
	name: "Test CLI Models",
	baseUrl: "https://example.invalid",
	dialect: "cloudcode-agent",
	auth: [{ kind: "api_key", slot: "api", placement: "bearer", optional: true }],
	requiredCredentialSlots: ["api"],
	models: {
		static: [
			{ id: "text-model", name: "Text Model" },
			{ id: "missing-model", name: "Missing Model" },
			{ id: "text-embedding-3-small", name: "Embedding" },
		],
	},
	capabilities: { tools: false, reasoning: false, images: false },
};

async function run(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
	const home = await mkdtemp(join(tmpdir(), "df-cli-models-"));
	temporary.push(home);
	await writeFile(join(home, "providers.df"), JSON.stringify({ version: 1, providers: [provider] }), "utf8");
	const child = Bun.spawn([process.execPath, "run", "src/cli.ts", "models", "--provider", provider.id, ...args], {
		cwd: join(import.meta.dir, ".."),
		env: {
			DF_HOME: home,
			DF_OFFLINE: "1",
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
	return { stdout, stderr, exitCode };
}

describe("df models", () => {
	test("--usable lists usable models with provider/model@account, source, and reason for exclusion", async () => {
		const result = await run(["--usable"]);
		if (result.stderr) console.error("STDERR:", result.stderr);
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain("model\tsource\treason");
		expect(result.stdout).toContain(`${provider.id}/text-model@default\tbuiltin\t-`);
		expect(result.stdout).toContain(
			`${provider.id}/text-embedding-3-small@default\tbuiltin\tnot a text-generation model`,
		);
	});

	test("--usable --json outputs JSON array with provider, model, account, source, reason fields", async () => {
		const result = await run(["--usable", "--json"]);
		expect(result.exitCode).toBe(0);
		expect(JSON.parse(result.stdout) as unknown).toEqual([
			{ provider: provider.id, model: "text-model", account: "default", source: "builtin", reason: "" },
			{ provider: provider.id, model: "missing-model", account: "default", source: "builtin", reason: "" },
			{
				provider: provider.id,
				model: "text-embedding-3-small",
				account: "default",
				source: "builtin",
				reason: "not a text-generation model",
			},
		]);
	});

	test("--stale lists declared ids missing from the live list", async () => {
		const home = await mkdtemp(join(tmpdir(), "df-cli-models-"));
		temporary.push(home);
		await writeFile(
			join(home, "providers.df"),
			JSON.stringify({
				version: 1,
				providers: [
					{ ...provider, models: { ...provider.models, list: { path: "/models", itemsPath: "data", idPath: "id" } } },
				],
			}),
			"utf8",
		);
		await mkdir(join(home, "models"));
		await writeFile(
			join(home, "models", `${provider.id}.df`),
			JSON.stringify({
				version: 1,
				provider: provider.id,
				fetchedAt: Date.now(),
				models: [{ id: "text-model", name: "Text Model" }],
			}),
			"utf8",
		);
		const child = Bun.spawn([process.execPath, "run", "src/cli.ts", "models", "--provider", provider.id, "--stale"], {
			cwd: join(import.meta.dir, ".."),
			env: {
				DF_HOME: home,
				DF_OFFLINE: "1",
				PATH: process.env.PATH ?? "",
				SYSTEMROOT: process.env.SYSTEMROOT ?? "C:\\Windows",
			},
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited]);
		expect(exitCode).toBe(0);
		expect(stdout).toContain(`${provider.id}	missing-model	missing from live list`);
		expect(stdout).toContain(`${provider.id}	text-embedding-3-small	missing from live list`);
		expect(stdout).not.toContain("text-model	missing");
	});
});
