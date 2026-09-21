import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import { accountId, CredentialRedactor, FileCredentialStore } from "../src/index.ts";

const roots: string[] = [];

async function temporaryHome(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-keychain-redaction-"));
	roots.push(path);
	return path;
}

afterEach(async () => {
	for (const path of roots.splice(0)) await rm(path, { recursive: true, force: true });
});

async function sourceFiles(root: string): Promise<string[]> {
	const files: string[] = [];
	for (const entry of await readdir(root, { withFileTypes: true })) {
		const path = join(root, entry.name);
		if (entry.isDirectory()) files.push(...(await sourceFiles(path)));
		else if ([".ts", ".tsx", ".js", ".jsx"].includes(extname(entry.name))) files.push(path);
	}
	return files;
}

describe("@darkfactory/keychain redaction", () => {
	test("reports leak metadata without returning secret values and redacts all matches", async () => {
		const store = new FileCredentialStore(await temporaryHome());
		const id = accountId("fixture", "work");
		await store.modifyAccount(id, async () => ({
			id,
			provider: "fixture",
			label: "work",
			slots: {
				oauth: {
					type: "oauth",
					access: "access-super-secret",
					refresh: "refresh-super-secret",
					expires: Date.now() + 60_000,
				},
				"X-Org": { type: "header", value: "org-super-secret" },
			},
		}));
		const redactor = new CredentialRedactor(store);
		const input = "access-super-secret refresh-super-secret org-super-secret and access-super-secret again";

		const findings = await redactor.scan(input);
		expect(findings).toEqual([
			{ accountId: id, slot: "X-Org", field: "value", occurrences: 1 },
			{ accountId: id, slot: "oauth", field: "access", occurrences: 2 },
			{ accountId: id, slot: "oauth", field: "refresh", occurrences: 1 },
		]);
		const serialized = JSON.stringify(findings);
		expect(serialized).not.toContain("access-super-secret");
		expect(serialized).not.toContain("refresh-super-secret");
		expect(serialized).not.toContain("org-super-secret");

		const output = await redactor.redact(input);
		expect(output).not.toContain("access-super-secret");
		expect(output).not.toContain("refresh-super-secret");
		expect(output).not.toContain("org-super-secret");
		expect(output.split("[REDACTED]").length - 1).toBe(4);
	});
});

describe("@darkfactory/keychain browser isolation", () => {
	test("@darkfactory/web does not import the machine keychain boundary", async () => {
		const webRoot = resolve(import.meta.dir, "../../web/src");
		for (const path of await sourceFiles(webRoot)) {
			const content = await readFile(path, "utf8");
			expect(content).not.toContain("@darkfactory/keychain");
			expect(content).not.toMatch(/packages\\/keychain|\\.\\.\\/keychain/);
		}
	});
});
