import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileCredentialStore } from "../src/credentials.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { observeLimits } from "../src/limits/observe.ts";

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});
function home(): string {
	const root = mkdtempSync(join(tmpdir(), "df-access-recovery-"));
	roots.push(root);
	return root;
}

const candidate = { provider: "p", account: "work", model: "m" };
const DAY = 24 * 60 * 60_000;

test("a rejected credential makes the account unavailable for a day by default", () => {
	const now = 1_800_000_000_000;
	for (const status of [401, 403]) {
		const [entry] = observeLimits(candidate, { status, headers: {}, body: "invalid api key" }, { observe: true }, now);
		expect(entry).toMatchObject({ type: "access", observedAt: now, resetAt: now + DAY });
	}
});

test("limits.accessRecheckAfterMs sets how long a rejected credential stays unavailable", () => {
	const now = 1_800_000_000_000;
	const [entry] = observeLimits(
		candidate,
		{ status: 401, headers: {}, body: "" },
		{ observe: true, accessRecheckAfterMs: 3_600_000 },
		now,
	);
	expect(entry?.resetAt).toBe(now + 3_600_000);
});

test("changing the account's credentials clears its access entry, as the CLI wires the store to the ledger", async () => {
	const dir = home();
	const ledger = new LimitLedger(dir);
	const store = new FileCredentialStore(dir, undefined, (provider, label) => ledger.clearAccount(provider, label));
	const now = Date.now();
	await ledger.record([
		{ ...candidate, type: "access", observedAt: now, resetAt: now + DAY, source: "default", remaining: 0 },
		{
			...candidate,
			account: "other",
			type: "access",
			observedAt: now,
			resetAt: now + DAY,
			source: "default",
			remaining: 0,
		},
	]);
	await store.setSlot("p:work", "api_key", { type: "api_key", value: "fixture-key" });
	expect((await ledger.list()).map((entry) => entry.account)).toEqual(["other"]);
});
