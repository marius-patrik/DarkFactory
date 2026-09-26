import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileCredentialStore } from "@darkfactory/keychain";
import defaultsJson from "../../assets/providers.defaults.json";
import { routerModels } from "../../src/cli.ts";
import type { DfConfig } from "../../src/config.ts";
import { LimitLedger } from "../../src/limits/ledger.ts";
import { ProviderRegistry } from "../../src/providers/runtime.ts";
import { type ProviderConfigFile, parseProviderConfigFile } from "../../src/providers/schema.ts";

// routerModels reads DF_HOME for its model catalog; point it at a temp directory and stay offline so the test never
// touches the real ~/.df or the network.
const saved = { home: process.env.DF_HOME, offline: process.env.DF_OFFLINE };
let root = "";
beforeAll(() => {
	root = mkdtempSync(join(tmpdir(), "df-router-credentials-"));
	process.env.DF_HOME = join(root, "home");
	process.env.DF_OFFLINE = "1";
});
afterAll(() => {
	if (saved.home === undefined) delete process.env.DF_HOME;
	else process.env.DF_HOME = saved.home;
	if (saved.offline === undefined) delete process.env.DF_OFFLINE;
	else process.env.DF_OFFLINE = saved.offline;
	rmSync(root, { recursive: true, force: true });
});

const registry = () => new ProviderRegistry(parseProviderConfigFile(defaultsJson as ProviderConfigFile, "defaults"));
const config = {} as DfConfig;
let storeIndex = 0;
const store = () => new FileCredentialStore(join(root, `store-${storeIndex++}`));
const providers = async (credentials: FileCredentialStore) =>
	new Set((await routerModels(registry(), credentials, config, [])).map((model) => model.candidate.provider));
const accountsOf = async (credentials: FileCredentialStore, provider: string) =>
	new Set(
		(await routerModels(registry(), credentials, config, []))
			.filter((model) => model.candidate.provider === provider)
			.map((model) => model.candidate.account),
	);

test("a provider whose required api_key slot is missing leaves the candidate universe", async () => {
	expect((await providers(store())).has("google")).toBe(false);
});

test("the same provider is a candidate once an account holds the required slot", async () => {
	const credentials = store();
	await credentials.setSlot("google:work", "api_key", { type: "api_key", value: "fixture-key" });
	expect(await accountsOf(credentials, "google")).toEqual(new Set(["work"]));
});

test("only accounts holding every required slot are kept", async () => {
	const credentials = store();
	await credentials.setSlot("google:work", "api_key", { type: "api_key", value: "fixture-key" });
	await credentials.setSlot("google:empty", "header", { type: "header", value: "not-an-api-key" });
	expect(await accountsOf(credentials, "google")).toEqual(new Set(["work"]));
});

test("an anonymous transport stays a candidate without any stored credential", async () => {
	expect((await providers(store())).has("opencode-zen")).toBe(true);
});

test("a disabled provider stays excluded even with its credentials stored", async () => {
	const credentials = store();
	await credentials.setSlot("google-antigravity:work", "oauth", {
		type: "oauth",
		access: "fixture",
		refresh: "fixture",
		expires: Date.now() + 60_000,
	});
	expect((await providers(credentials)).has("google-antigravity")).toBe(false);
});

test("a model with a learned model limit leaves the candidates while the account's other models stay", async () => {
	const credentials = store();
	await credentials.setSlot("google:work", "api_key", { type: "api_key", value: "fixture-key" });
	const before = [...(await routerModels(registry(), credentials, config, []))].filter(
		(model) => model.candidate.provider === "google",
	);
	expect(before.length).toBeGreaterThan(1);
	const blocked = before[0]?.candidate.model;
	const now = Date.now();
	await new LimitLedger(process.env.DF_HOME!).record([
		{
			provider: "google",
			account: "work",
			model: blocked,
			type: "model",
			observedAt: now,
			resetAt: now + 3_600_000,
			source: "body",
		},
	]);
	const after = (await routerModels(registry(), credentials, config, []))
		.filter((model) => model.candidate.provider === "google")
		.map((model) => model.candidate.model);
	expect(after).not.toContain(blocked);
	expect(after.length).toBe(before.length - 1);
});
