import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateVaultKey } from "../../src/secrets/crypto.ts";
import { secretsCommand } from "../../src/secrets/cli.ts";
import { saveVault, savePushMap } from "../../src/secrets/vault-store.ts";
import { emptyVault } from "../../src/secrets/vault.ts";
import { GitHubClient } from "../../src/github/client.ts";
import { GitHubRepository } from "../../src/github/repository.ts";
import { json, scripted } from "../github/helpers.ts";
const sodium: typeof import("libsodium-wrappers") = require("libsodium-wrappers");

let dfHome = "";
let dataRepo = "";
let root = "";

async function git(cwd: string, ...args: string[]) {
	const proc = Bun.spawn(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
	await proc.exited;
}

beforeEach(async () => {
	root = await mkdtemp(join(tmpdir(), "df-cli-vault-"));
	dfHome = join(root, "home");
	dataRepo = join(root, "data-df");
	await Bun.spawn(["git", "init", dataRepo], { stdout: "pipe", stderr: "pipe" }).exited;
	await git(dataRepo, "config", "user.email", "t@t.com");
	await git(dataRepo, "config", "user.name", "t");
	await Bun.spawn(["mkdir", "-p", dfHome], { stdout: "pipe" }).exited;
	await writeFile(join(dfHome, "config.json"), JSON.stringify({ dataRepo }), "utf8");
});

afterEach(async () => {
	await rm(root, { recursive: true, force: true });
});

describe("secrets CLI values never printed without --reveal, push/doctor mocked", () => {
	test("get without --reveal prints *** and with --reveal prints value", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, { version: 1, entries: [{ name: "MY_KEY", value: "super-secret", scope: "actions", created: { by: "h", at: new Date().toISOString() }, updated: { by: "h", at: new Date().toISOString() } }] }, key);

		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a: unknown[]) => logs.push(a.join(" "));
		try {
			await secretsCommand(["get", "MY_KEY"], { dfHome, allowFileKey: true });
			expect(logs.join("\n")).toBe("***");
			expect(logs.join("\n")).not.toContain("super-secret");

			logs.length = 0;
			await secretsCommand(["get", "MY_KEY", "--reveal"], { dfHome, allowFileKey: true });
			expect(logs.join("\n")).toBe("super-secret");
		} finally {
			console.log = origLog;
		}
	});

	test("list does not print values", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, { version: 1, entries: [{ name: "A", value: "hidden", scope: "actions", created: { by: "h", at: new Date().toISOString() }, updated: { by: "h", at: new Date().toISOString() } }] }, key);
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a: unknown[]) => logs.push(a.join(" "));
		try {
			await secretsCommand(["list"], { dfHome, allowFileKey: true });
			expect(logs.join("\n")).not.toContain("hidden");
			expect(logs.join("\n")).toContain("A");
		} finally {
			console.log = origLog;
		}
	});

	test("push with --only and --dry-run via mocked GitHub fetch", async () => {
		await sodium.ready;
		const keypair = sodium.crypto_box_keypair();
		const publicKey = sodium.to_base64(keypair.publicKey, sodium.base64_variants.ORIGINAL);
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, { version: 1, entries: [
			{ name: "GEMINI_API_KEY", value: "real-secret-value", scope: "actions", created: { by: "h", at: new Date().toISOString() }, updated: { by: "h", at: new Date().toISOString() } },
			{ name: "OTHER", value: "other-val", scope: "actions", created: { by: "h", at: new Date().toISOString() }, updated: { by: "h", at: new Date().toISOString() } },
		] }, key);
		await savePushMap(dataRepo, {
			GEMINI_API_KEY: { repos: ["owner/repo"], ghName: "GEMINI_API_KEY" },
			OTHER: { repos: ["owner/repo"], ghName: "OTHER" },
		});

		// Mocked fetch: public-key then PUT, shared by every client the factory creates
		const sharedMock = scripted([json({ key_id: "k1", key: publicKey }), json(undefined, 204)]);
		const sharedFactory = (slug: string) => {
			const c = new GitHubClient({ token: "t", fetch: sharedMock.fetch });
			return { client: c, repository: new GitHubRepository(c, ...slug.split("/") as [string, string]) };
		};
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a: unknown[]) => logs.push(a.join(" "));
		try {
			await secretsCommand(["push", "owner/repo", "--only", "GEMINI_API_KEY"], { dfHome, allowFileKey: true, githubClient: sharedFactory });
			expect(logs.join("\n")).toContain("GEMINI_API_KEY");
			expect(logs.join("\n")).not.toContain("OTHER");
			expect(sharedMock.calls.map((c) => String(c.init?.body ?? "")).join(" ")).not.toContain("real-secret-value");
		} finally {
			console.log = origLog;
		}

		// Dry-run: no fetch should be called
		let fetchCalled = false;
		const dryFactory = () => {
			const c = new GitHubClient({ token: "t", fetch: async () => { fetchCalled = true; return json({}, 200); } });
			return { client: c, repository: new GitHubRepository(c, "owner", "repo") };
		};
		const dryLogs: string[] = [];
		console.log = (...a: unknown[]) => dryLogs.push(a.join(" "));
		try {
			await secretsCommand(["push", "owner/repo", "--dry-run"], { dfHome, allowFileKey: true, githubClient: dryFactory as never });
			expect(fetchCalled).toBe(false);
			expect(dryLogs.join("\n")).toContain("dry-run");
		} finally {
			console.log = origLog;
		}
	});

	test("doctor reports drift vs GitHub and sealed-box not leaking values", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, { version: 1, entries: [
			{ name: "A", value: "secret-a", scope: "actions", created: { by: "h", at: "2026-01-02T00:00:00Z" }, updated: { by: "h", at: "2026-01-02T00:00:00Z" } },
			{ name: "B", value: "secret-b", scope: "actions", created: { by: "h", at: "2026-01-02T00:00:00Z" }, updated: { by: "h", at: "2026-01-02T00:00:00Z" } },
		] }, key);
		await savePushMap(dataRepo, {
			A: { repos: ["owner/repo"], ghName: "A" },
			B: { repos: ["owner/repo"], ghName: "B" },
		});
		// GitHub has only A, so B is vault-only drift
		const mock = scripted([json({ secrets: [{ name: "A", created_at: "2026-01-02T00:00:00Z", updated_at: "2026-01-02T00:00:00Z" }] })]);
		const factory = (slug: string) => {
			const c = new GitHubClient({ token: "t", fetch: mock.fetch });
			return { client: c, repository: new GitHubRepository(c, ...slug.split("/") as [string, string]) };
		};
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a: unknown[]) => logs.push(a.join(" "));
		try {
			await secretsCommand(["doctor"], { dfHome, allowFileKey: true, githubClient: factory as never });
			const out = logs.join("\n");
			expect(out).toContain("vault-key");
			expect(out).toContain("vault-file");
			expect(out).not.toContain("secret-a");
			expect(out).not.toContain("secret-b");
			// Should contain drift warning for B
			expect(out).toContain("B");
		} finally {
			console.log = origLog;
		}
	});

	test("set with --from-stdin stores without printing value", async () => {
		const key = generateVaultKey();
		await writeFile(join(dfHome, "vault.key"), key, { mode: 0o600 } as never);
		await saveVault(dataRepo, emptyVault(), key);
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a: unknown[]) => logs.push(a.join(" "));
		try {
			await secretsCommand(["set", "NEW_SECRET", "--from-stdin"], { dfHome, allowFileKey: true, stdin: async () => "injected-value" });
			expect(logs.join("\n")).not.toContain("injected-value");
			// Verify stored and not leaked via get without reveal
			logs.length = 0;
			await secretsCommand(["get", "NEW_SECRET"], { dfHome, allowFileKey: true });
			expect(logs.join("\n")).toBe("***");
			expect(logs.join("\n")).not.toContain("injected-value");
		} finally {
			console.log = origLog;
		}
	});
});
