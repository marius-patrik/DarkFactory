import { afterEach, describe, expect, test } from "bun:test";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteAuthTokenStore, SqliteMutationReceiptJournal } from "../../../packages/auth/src/sqlite.ts";

const dirs: string[] = [];
async function home(): Promise<string> {
	const path = await mkdtemp(join(tmpdir(), "df-auth-sqlite-"));
	dirs.push(path);
	return path;
}
afterEach(async () => {
	for (const path of dirs.splice(0)) await rm(path, { recursive: true, force: true });
});
const key = Buffer.alloc(32, 7).toString("base64");
describe("confidential durable broker storage", () => {
	test("persists encrypted tokens across processes without plaintext on disk", async () => {
		const root = await home();
		const path = join(root, "broker.sqlite.df");
		const first = new SqliteAuthTokenStore({ path, keyBase64: key });
		await first.set("session", {
			token: { access_token: "SENSITIVE-ACCESS", refresh_token: "SENSITIVE-REFRESH", token_type: "bearer" },
			userId: "octocat",
		});
		first.close();
		const data = await readFile(path);
		expect(data.includes("SENSITIVE-ACCESS")).toBe(false);
		const second = new SqliteAuthTokenStore({ path, keyBase64: key });
		expect((await second.get("session"))?.token.access_token).toBe("SENSITIVE-ACCESS");
		second.close();
	});
	test("cross-session ciphertext cannot be replayed without authenticated session identity", async () => {
		const root = await home();
		const first = new SqliteAuthTokenStore({ path: join(root, "token.sqlite.df"), keyBase64: key });
		await first.set("session-a", { token: { access_token: "a", token_type: "bearer" } });
		const record = await first.get("session-a");
		await first.set("session-b", record!);
		expect((await first.get("session-b"))?.token.access_token).toBe("a");
		first.close();
	});
	test("concurrent journal writes execute once and uncertain outcomes block replay", async () => {
		const root = await home();
		const path = join(root, "journal.sqlite.df");
		const a = new SqliteMutationReceiptJournal(path);
		const b = new SqliteMutationReceiptJournal(path);
		let writes = 0;
		const work = async () => {
			writes++;
			return { id: 9, repository: "org/repo", issue: 3, body: "comment" };
		};
		const first = await a.once("idempotency", "intent", work);
		const second = await b.once("idempotency", "intent", work);
		expect(first).toEqual(second);
		expect(writes).toBe(1);
		await expect(b.once("idempotency", "different", work)).rejects.toThrow("different intent");
		await expect(
			a.once("failed", "intent", async () => {
				throw new Error("upstream uncertain");
			}),
		).rejects.toThrow("upstream uncertain");
		await expect(b.once("failed", "intent", work)).rejects.toThrow("reconciliation required");
		a.close();
		b.close();
	});
	test("rejects non-private database locations and invalid keys", async () => {
		expect(() => new SqliteAuthTokenStore({ path: "relative.sqlite", keyBase64: key })).toThrow("absolute path");
		const root = await home();
		expect(() => new SqliteAuthTokenStore({ path: join(root, "bad.sqlite"), keyBase64: "abc" })).toThrow("256-bit");
	});
});
