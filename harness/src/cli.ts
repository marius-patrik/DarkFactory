#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import type { AuthEvent, AuthPrompt, Context, Models, MutableModels, Provider } from "@earendil-works/pi-ai";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import { FileCredentialStore, defaultDfHome } from "./credentials.ts";
import { loadDfConfig, localCredentialFallback, type DfConfig } from "./config.ts";
import { runFailoverTurn, type Candidate, type StepEvent } from "./failover.ts";
import { ChainExhaustedError, createFailoverSupervisor, type CandidateFailureReason, type HarnessEvent } from "./harness/supervisor.ts";
import { QuotaStore } from "./harness/quota-store.ts";
import { validateCandidateCredentials } from "./harness/runtime.ts";
import { defaultSensitiveDataHook, parseCandidate, parseChain, resolveRouting } from "./harness/routing.ts";
import { ModelCatalog, isRunnableCatalogModel, type CatalogResult } from "./models/catalog.ts";
import { importClaudeAccount } from "./import/claude.ts";
import { importCodexAccount } from "./import/codex.ts";
import { importGrokAccount } from "./import/grok.ts";
import { importKimiAccount } from "./import/kimi.ts";
import { ConfiguredBorrowedCredentialCoordinator } from "./import/borrowed-credentials.ts";
import { OsClaudeKeyringAdapter } from "./import/keyring.ts";
import { OsHomeReader } from "./import/reader.ts";
import { importAntigravityAccount, OsKeyringAdapter } from "./import/antigravity.ts";
import { loadProviderConfig } from "./providers/schema.ts";
import { ProviderRegistry } from "./providers/runtime.ts";
import { classifyFailure } from "./quota.ts";
import { loginProviderAccount } from "./login.ts";
import { redactErrorMessage } from "./redaction.ts";
import { runCiCli } from "./ci/cli.ts";
import { plan, validateGraph, type GraphEvent, type RunState } from "./graph/index.ts";
import { secretsCommand } from "./secrets/cli.ts";
import { GitHubClient } from "./github/client.ts";
import { GitHubRepository } from "./github/repository.ts";

const isolatedAuthContext = {
	env: async (_name: string) => undefined,
	fileExists: async (_path: string) => false,
};

function usage(): string {
	return [
		"Usage:",
		"  df | df chat [--chain provider/model@account,... | --model provider/model@account] [--reasoning hard]",
		"  df run [--chain provider/model@account,... | --model provider/model@account] [--reasoning hard] [--json] <prompt>",
		"  df providers",
		"  df models [--provider p] [--account label] [--refresh]",
		"  df accounts",
		"  df account set <account-id> <slot> --type <api_key|header|cookie|other> [--from-vault NAME]  # value from stdin or the vault",
		"  df account import <antigravity|claude|codex|grok|kimi> --account <label>",
		"  df login <provider> [--account <label>]",
		"  df logout <provider> --account <label>",
		"  df ask --chain <provider/model[@account]>,... [--json] <prompt>",
		"  df ci <install|update|status|runs|logs|rerun|protect|doctor> [options]",
		"  df graph validate [path]",
		"  df graph plan --event <file> --state <file> [--graph <path>]",
		"  df secrets init|import-key|export-key|list|rm|sync|doctor [--insecure-file-key]",
		"  df secrets set NAME [--from-stdin] | get NAME [--reveal] | push <owner/repo> [--only NAME] [--dry-run]",
	].join("\n");
}

function dfModels(registry: ProviderRegistry, store?: FileCredentialStore, provider?: string, label?: string): MutableModels {
	return registry.models(store && provider && label ? {
		credentials: store.forAccount(provider, label), authContext: isolatedAuthContext,
	} : undefined);
}

function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

function options(args: string[], name: string): string[] {
	return args.flatMap((value, index) => value === name && args[index + 1] ? [args[index + 1]!] : []);
}

function removeOptions(args: string[], names: readonly string[]): string[] {
	const result: string[] = [];
	for (let index = 0; index < args.length; index++) {
		if (names.includes(args[index]!)) { index++; continue; }
		if (args[index] === "--json" || args[index] === "--faux") continue;
		result.push(args[index]!);
	}
	return result;
}

export { parseCandidate } from "./harness/routing.ts";

async function providersCommand(registry: ProviderRegistry): Promise<void> {
	console.log("provider\toauth-login\tsubscription");
	const providers = providerList(registry).sort((a, b) => a.id.localeCompare(b.id));
	for (const provider of providers) {
		console.log(`${provider.id}\t${provider.auth.oauth ? "yes" : "no"}\t${provider.auth.oauth?.isSubscription === true ? "yes" : "no"}`);
	}
}

function providerList(registry: ProviderRegistry, additional: readonly Provider[] = []): Provider[] {
	const byId = new Map([...registry.providers, ...additional].map((provider) => [provider.id, provider]));
	return [...byId.values()];
}

async function modelsCommand(registry: ProviderRegistry, store: FileCredentialStore, args: string[]): Promise<void> {
	const selected = option(args, "--provider");
	const requestedAccount = option(args, "--account");
	const refresh = args.includes("--refresh");
	const providers = providerList(registry).filter((provider) => !selected || provider.id === selected);
	if (selected && providers.length === 0) throw new Error(`Unknown provider ${selected}`);
	const accounts = await store.listAccounts();
	const catalog = new ModelCatalog({
		home: defaultDfHome(), providers, providerConfigs: registry.entries, store,
		offline: process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
	});
	let failures = 0;
	console.log("provider\tmodel\tname\tmethods\tsource");
	for (const provider of providers.sort((a, b) => a.id.localeCompare(b.id))) {
		// Stored accounts first; otherwise "default", which resolves env vars and config.json credentialFiles.
		const account = requestedAccount ?? accounts.find((entry) => entry.provider === provider.id)?.label ?? "default";
		const config = registry.config(provider.id);
		const anonymous = config?.auth.some((auth) => auth.kind === "api_key" && auth.optional) ?? false;
		let credential: unknown;
		try { credential = await store.forAccount(provider.id, account).read(provider.id); }
		catch (error) { console.error(`[models] ${provider.id}@${account}: ${error instanceof Error ? error.message : String(error)}`); failures++; continue; }
		if (!credential && !anonymous && config?.models.list) {
			if (selected) { console.error(`[models] ${provider.id}@${account}: no credentials (df account import|set, or df login)`); failures++; }
			else console.error(`[models] ${provider.id}: skipped, no credentials for account ${account}`);
			continue;
		}
		try {
			const result = await catalog.get(provider.id, { account, refresh });
			if (result.error) {
				console.error(`[models] ${provider.id}@${account}: live refresh failed (${result.error}); serving cached catalog`);
				if (refresh) failures++;
			}
			for (const model of result.models) console.log(`${provider.id}\t${model.id}\t${model.name}\t${model.supportedMethods?.join(",") ?? "-"}\t${result.source}`);
		} catch (error) {
			console.error(`[models] ${provider.id}@${account}: ${error instanceof Error ? error.message : String(error)}`);
			failures++;
		}
	}
	if (failures > 0) process.exitCode = 1;
}

async function accountImportCommand(registry: ProviderRegistry, store: FileCredentialStore, args: string[]): Promise<void> {
	const source = args[0];
	const label = option(args, "--account");
	if (!label) throw new Error("account import requires --account <label>");
	const declaration = registry.entries.flatMap((entry) => entry.importers ?? []).find((entry) => entry.id === source);
	if (!declaration) throw new Error(`Unknown account import source: ${source ?? ""}`);
	if (declaration.parser === "antigravity-keyring") {
		await importAntigravityAccount(store, label, new OsKeyringAdapter(), declaration.targetProvider, declaration.keyring?.service, declaration.keyring?.account);
		await markImportedAccount(store, declaration.targetProvider, label, declaration.id, declaration.path);
		console.log(`Imported ${declaration.targetProvider}/${label}.`);
		return;
	}
	const reader = new OsHomeReader(homedir());
	if (declaration.parser === "claude-code") await importClaudeAccount(store, label, { home: reader.home, homeReader: reader, keyring: new OsClaudeKeyringAdapter() }, declaration.targetProvider);
	else if (declaration.parser === "codex") await importCodexAccount(store, label, reader, declaration.targetProvider, declaration.apiKeyTargetProvider);
	else if (declaration.parser === "grok-cli") await importGrokAccount(store, label, reader, declaration.targetProvider);
	else if (declaration.parser === "kimi-code") {
		if (!declaration.path) throw new Error(`Importer ${declaration.id} has no configured path`);
		await importKimiAccount(store, label, reader, declaration.targetProvider, declaration.path);
	}
	else throw new Error(`Importer parser is not implemented: ${declaration.parser}`);
	await markImportedAccount(store, declaration.targetProvider, label, declaration.id, declaration.path);
	console.log(`Imported ${source}/${label}.`);
}

async function markImportedAccount(store: FileCredentialStore, provider: string, label: string, importer: string, path?: string): Promise<void> {
	const id = `${provider}:${label}`;
	await store.modifyAccount(id, async (current) => current ? ({
		...current,
		metadata: {
			...(current.metadata ?? {}), importer,
			ownership: "borrowed", sync: "machine-only",
			...(path ? { source_path: path } : {}),
			...(current.metadata?.source?.startsWith("Claude Code-credentials") ? { source_kind: "keyring", source_service: current.metadata.source } : {}),
		},
	}) : undefined);
}

async function accountsCommand(store: FileCredentialStore): Promise<void> {
	const accounts = await store.listAccounts();
	if (accounts.length === 0) { console.log("No accounts."); return; }
	console.log("id\ttype\texpiry\trefresh\townership\tslots");
	for (const account of accounts) {
		const slots = account.slots.map((slot) => `${slot.name}:${slot.type}`).join(",");
		const record = await store.readAccount(account.id);
		const oauth = record && Object.values(record.slots).find((slot) => slot.type === "oauth");
		const types = [...new Set(account.slots.map((slot) => slot.type))].join(",") || "-";
		const expiry = oauth?.type === "oauth" ? `${new Date(oauth.expires).toISOString()} (${oauth.expires > Date.now() ? "valid" : "expired"})` : "-";
		const refresh = oauth?.type === "oauth" && oauth.refresh ? (account.metadata?.ownership === "borrowed" ? "reimport-first" : "df-managed") : "-";
		const ownership = account.metadata?.ownership ?? (account.metadata?.importer ? "borrowed" : "df-owned");
		console.log(`${account.id}\t${types}\t${expiry}\t${refresh}\t${ownership}\t${slots || "-"}`);
	}
}

async function accountSetCommand(store: FileCredentialStore, args: string[]): Promise<void> {
	const [id, slotName] = args;
	const fromVault = option(args, "--from-vault");
	const type = option(args, "--type") ?? (fromVault ? "api_key" : undefined);
	if (!id || !slotName || !type) throw new Error("account set requires <account-id> <slot> --type <type> (or --from-vault NAME)");
	if (!( ["api_key", "header", "cookie", "other"] as const).includes(type as "api_key" | "header" | "cookie" | "other")) {
		throw new Error("account set type must be api_key, header, cookie, or other; OAuth is filled by login");
	}
	let value: string;
	if (fromVault !== undefined) {
		if (!fromVault.trim()) throw new Error("--from-vault requires a vault secret name");
		value = `vault:${fromVault.trim()}`;
	} else {
		value = (await Bun.stdin.text()).replace(/\r?\n$/, "");
		if (!value) throw new Error("account set requires a non-empty value on stdin (or --from-vault NAME)");
	}
	await store.setSlot(id, slotName, { type: type as "api_key" | "header" | "cookie" | "other", value });
	await store.modifyAccount(id, async (current) => current ? ({ ...current, metadata: { ...(current.metadata ?? {}), ownership: "df-owned" } }) : undefined);
	console.log(`Saved ${id} slot ${slotName} (${type}).`);
}

async function answerPrompt(rl: ReturnType<typeof createInterface>, prompt: AuthPrompt): Promise<string> {
	if (prompt.type === "select") {
		console.log(prompt.message);
		prompt.options.forEach((entry, index) => console.log(`  ${index + 1}. ${entry.label}`));
		const selected = prompt.options[Number.parseInt(await rl.question("Selection: "), 10) - 1];
		if (!selected) throw new Error("Invalid selection");
		return selected.id;
	}
	return rl.question(`${prompt.message}${prompt.placeholder ? ` (${prompt.placeholder})` : ""}: `, { signal: prompt.signal });
}

function notifyLogin(event: AuthEvent): void {
	if (event.type === "auth_url") {
		console.log(`Open this URL in a browser:\n${event.url}`);
		if (event.instructions) console.log(event.instructions);
	} else if (event.type === "device_code") console.log(`Open ${event.verificationUri} and enter code ${event.userCode}`);
	else console.log(event.message);
}

async function loginCommand(registry: ProviderRegistry, store: FileCredentialStore, providerId: string | undefined, label: string | undefined): Promise<void> {
	if (!providerId) throw new Error("login requires <provider>");
	const account = label ?? "default";
	const provider = registry.config(providerId);
	if (!provider) throw new Error(`Unknown provider ${providerId}`);
	const rl = createInterface({ input: stdin, output: stdout });
	try {
		await loginProviderAccount(provider, account, store, { prompt: (prompt) => answerPrompt(rl, prompt), notify: notifyLogin });
		console.log(`Saved OAuth account ${providerId}/${account}`);
	} finally { rl.close(); }
}

async function logoutCommand(store: FileCredentialStore, providerId: string | undefined, label: string | undefined): Promise<void> {
	if (!providerId || !label) throw new Error("logout requires <provider> and --account <label>");
	if (!await store.deleteAccount(`${providerId}:${label}`)) throw new Error(`No account ${providerId}/${label}`);
	console.log(`Logged out ${providerId}/${label}.`);
}

async function askCommand(registry: ProviderRegistry, store: FileCredentialStore, args: string[]): Promise<void> {
	const chainValue = option(args, "--chain");
	if (!chainValue) throw new Error("ask requires --chain");
	const prompt = removeOptions(args, ["--chain"]).join(" ").trim();
	if (!prompt) throw new Error("ask requires a prompt");
	const json = args.includes("--json");
	const candidates = parseChain(chainValue);
	const context: Context = { messages: [{ role: "user", content: prompt, timestamp: Date.now() }] };
	const emitStep = (event: StepEvent) => json ? console.log(JSON.stringify(event)) : console.error(JSON.stringify(event));
	const result = await runFailoverTurn({
		candidates, context,
		modelsFor(candidate): Models { return dfModels(registry, store, candidate.provider, candidate.account); },
		headersFor: (candidate) => store.requestHeaders(candidate.provider, candidate.account, registry.config(candidate.provider)?.slotHeaders),
		providerConfigs: new Map(registry.entries.map((entry) => [entry.id, entry])),
		onText: (delta) => json ? console.log(JSON.stringify({ type: "text_delta", delta })) : process.stdout.write(delta),
		onStep: emitStep,
	});
	if (!json) process.stdout.write("\n");
	else console.log(JSON.stringify({ type: "result", candidate: result.candidate, stopReason: result.message.stopReason, responseModel: result.message.responseModel }));
}

function fauxProviders(enabled: boolean): { providers: Provider[]; optional: string[] } {
	if (!enabled) return { providers: [], optional: [] };
	const handle = fauxProvider({ provider: "faux", models: [{ id: "echo" }] });
	handle.setResponses(Array.from({ length: 128 }, () => (context) => {
		const user = [...context.messages].reverse().find((message) => message.role === "user");
		const text = typeof user?.content === "string" ? user.content : Array.isArray(user?.content)
			? user.content.filter((block) => block.type === "text").map((block) => block.text).join("")
			: "";
		if (text === "__df_quota__") return fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota" });
		if (text === "__df_auth__") return fauxAssistantMessage([], { stopReason: "error", errorMessage: "401 invalid token" });
		return fauxAssistantMessage(`faux: ${text}`);
	}));
	return { providers: [handle.provider], optional: ["faux"] };
}

const SECRET_KEY = /token|secret|password|api[-_]?key|authorization/iu;
const BEARER_VALUE = /\bbearer\s+[A-Za-z0-9._~+/=-]+/iu;

export function redactToolInput(value: unknown, key?: string): unknown {
	if (key && SECRET_KEY.test(key)) return "[REDACTED]";
	if (typeof value === "string") return BEARER_VALUE.test(value) ? "[REDACTED]" : value;
	if (Array.isArray(value)) return value.map((entry) => redactToolInput(entry));
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([name, entry]) => [name, redactToolInput(entry, name)]));
}

function renderEvent(event: HarnessEvent, json: boolean): void {
	if (json) {
		console.log(JSON.stringify(event.type === "tool_start" ? { ...event, input: redactToolInput(event.input) } : event));
		return;
	}
	if (event.type === "text_delta") process.stdout.write(event.delta);
	else if (event.type === "tool_start") console.error(`[tool] ${event.toolName}`);
	else if (event.type === "tool_end") console.error(`[tool] ${event.toolName}: ${event.isError ? "error" : "ok"}`);
	else if (event.type === "failover") console.error(`\n[failover] ${event.from.provider}/${event.from.account}/${event.from.model} -> ${event.to.provider}/${event.to.account}/${event.to.model} (${event.reason}: ${event.errorMessage})`);
	else if (event.type === "candidate_unavailable") console.error(`[unavailable] ${event.candidate.provider}/${event.candidate.account}/${event.candidate.model} (${event.message})`);
	else if (event.type === "candidate_skipped") console.error(`[skip] ${event.candidate.provider}/${event.candidate.account}/${event.candidate.model} (${event.reason})`);
	else if (event.type === "waiting") console.error(`\n[waiting] ${event.reason} until ${new Date(event.until).toISOString()}`);
	else if (event.type === "step" && event.errorKind) console.error(`\n[step] ${event.provider}/${event.account}/${event.model}: ${event.errorKind}: ${event.errorMessage}`);
}

async function packagingSmoke(): Promise<void> {
	const arch = process.arch;
	const platform = process.platform;
	const directory = join(dirname(process.execPath), "native", platform, "prebuilds", `${platform}-${arch}`);
	const names = platform === "linux"
		? ["linux-platform-x11.node"]
		: [`${platform}-platform.node`, ...(platform === "darwin" ? ["darwin-modifiers.node"] : platform === "win32" ? ["win32-console-mode.node"] : [])];
	const nativePath = names.map((name) => join(directory, name)).find(existsSync);
	if (!nativePath) throw new Error(`Packaged pi-tui native module is missing for ${platform}-${arch}`);
	const loaded = createRequire(import.meta.url)(nativePath) as unknown;
	if ((typeof loaded !== "object" || loaded === null) && typeof loaded !== "function") throw new Error("Packaged pi-tui native module did not load");

	const worker = new Worker("./src/utils/image-resize-worker.ts");
	try {
		const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
		const result = await new Promise<{ result?: unknown; error?: string }>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Packaged image worker timed out")), 5_000);
			worker.onmessage = (event) => { clearTimeout(timeout); resolve(event.data as { result?: unknown; error?: string }); };
			worker.onerror = (event) => { clearTimeout(timeout); reject(new Error(event.message)); };
			worker.postMessage({ inputBytes: png, mimeType: "image/png", options: { maxWidth: 1, maxHeight: 1 } });
		});
		if (result.error || result.result === undefined) throw new Error(result.error ?? "Packaged image worker returned no result");
	} finally {
		worker.terminate();
	}
	console.log("packaging smoke ok");
}

async function createCliSupervisor(registry: ProviderRegistry, store: FileCredentialStore, config: DfConfig, args: string[], chain: Candidate[], json: boolean) {
	const faux = fauxProviders(args.includes("--faux") || process.env.DF_FAUX === "1");
	const providers = providerList(registry, faux.providers);
	const catalog = new ModelCatalog({
		home: defaultDfHome(), providers, providerConfigs: registry.entries, store,
		offline: faux.providers.length > 0 || process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
	});
	const catalogs = new Map<string, CatalogResult>();
	const available: Candidate[] = [];
	const unavailable: CandidateFailureReason[] = [];
	const optional = new Set([...faux.optional, ...registry.entries.filter((entry) => entry.auth.some((auth) => auth.kind === "api_key" && auth.optional)).map((entry) => entry.id)]);
	for (const candidate of chain) {
		let result: CatalogResult;
		try {
			await validateCandidateCredentials(store, candidate, registry.config(candidate.provider), optional.has(candidate.provider));
			result = await catalog.get(candidate.provider, { account: candidate.account });
			if (!result.models.some((model) => model.id === candidate.model && isRunnableCatalogModel(model))) {
				throw new Error(`Model ${candidate.provider}/${candidate.model} is not present in the ${result.source} catalog for account ${candidate.account}`);
			}
		} catch (error) {
			// A multi-candidate chain drops unusable candidates (no credentials, unknown model); a single explicit model fails loudly.
			const message = redactErrorMessage(error);
			const failure = classifyFailure({ error });
			unavailable.push({ candidate, kind: failure.kind, message });
			renderEvent({ type: "candidate_unavailable", candidate, message }, json);
			continue;
		}
		available.push(candidate);
		const existing = catalogs.get(candidate.provider);
		if (!existing) catalogs.set(candidate.provider, result);
		else {
			const models = new Map([...existing.models, ...result.models].map((model) => [model.id, model]));
			catalogs.set(candidate.provider, { ...result, models: [...models.values()] });
		}
	}
	if (available.length === 0) throw new ChainExhaustedError(unavailable.map((reason) => reason.kind), unavailable);
	return createFailoverSupervisor({
		chain: available, cwd: process.cwd(), home: defaultDfHome(), resume: option(args, "--resume"),
		policy: { allow: options(args, "--allow"), deny: options(args, "--deny"), headless: args[0] === "run" },
		providers, authOptionalProviders: [...optional], catalogs,
		providerConfigs: new Map(registry.entries.map((entry) => [entry.id, entry])),
		cooldownTtlMs: config.cooldownTtlMs, maxWaitMs: config.maxWaitMs, ephemeralProviders: faux.optional,
		store,
		onEvent: (event) => renderEvent(event, json),
	});
}

async function runCommand(registry: ProviderRegistry, store: FileCredentialStore, config: DfConfig, args: string[]): Promise<void> {
	const chainValue = option(args, "--chain");
	const modelValue = option(args, "--model");
	if (chainValue && modelValue) throw new Error("Use only one of --chain or --model");
	const reasoning = option(args, "--reasoning");
	if (reasoning !== undefined && reasoning !== "hard") throw new Error("--reasoning must be hard");
	const json = args.includes("--json");
	const maxTurns = Number.parseInt(option(args, "--max-turns") ?? "100", 10);
	if (!Number.isSafeInteger(maxTurns) || maxTurns <= 0) throw new Error("--max-turns must be a positive integer");
	const promptFile = option(args, "--prompt-file");
	const prompt = promptFile ? await readFile(promptFile, "utf8") :
		removeOptions(args, ["--chain", "--model", "--reasoning", "--max-turns", "--prompt-file", "--allow", "--deny", "--resume"]).join(" ").trim();
	if (!prompt) throw new Error("run requires a prompt or --prompt-file");
	const route = await resolveRouting(config, {
		prompt,
		...(chainValue ? { explicitChain: chainValue } : {}),
		...(modelValue ? { explicitModel: modelValue } : {}),
		...(reasoning === "hard" ? { reasoning: "hard" as const } : {}),
		sensitiveHook: defaultSensitiveDataHook,
	});
	const supervisor = await createCliSupervisor(registry, store, config, ["run", ...args], route.chain, json);
	if (json) console.log(JSON.stringify({ type: "session", sessionId: supervisor.session.sessionId, candidate: supervisor.activeCandidate }));
	else console.error(`[session ${supervisor.session.sessionId}] ${supervisor.activeCandidate.provider}/${supervisor.activeCandidate.account}/${supervisor.activeCandidate.model}`);
	try {
		const message = await supervisor.prompt(prompt, maxTurns);
		if (!json) process.stdout.write("\n");
		else console.log(JSON.stringify({ type: "result", sessionId: supervisor.session.sessionId, candidate: supervisor.activeCandidate, stopReason: message.stopReason, usage: message.usage }));
	} finally { supervisor.session.dispose(); }
}

async function chatCommand(registry: ProviderRegistry, store: FileCredentialStore, config: DfConfig, args: string[]): Promise<void> {
	const rl = createInterface({ input: stdin, output: stdout });
	try {
		const configured = option(args, "--chain") ?? option(args, "--model");
		const chosen = configured ?? (await rl.question("Model/chain (Enter for routing policy): ")).trim();
		const reasoning = option(args, "--reasoning");
		if (reasoning !== undefined && reasoning !== "hard") throw new Error("--reasoning must be hard");
		const route = await resolveRouting(config, {
			prompt: "",
			...(chosen ? { explicitChain: chosen } : {}),
			...(reasoning === "hard" ? { reasoning: "hard" as const } : {}),
		});
		const supervisor = await createCliSupervisor(registry, store, config, ["chat", ...args], route.chain, false);
		console.error(`[session ${supervisor.session.sessionId}] ${supervisor.activeCandidate.provider}/${supervisor.activeCandidate.account}/${supervisor.activeCandidate.model}`);
		while (true) {
			const prompt = (await rl.question("\ndf> ")).trim();
			if (prompt === "/exit" || prompt === "/quit") break;
			if (!prompt) continue;
			await supervisor.prompt(prompt);
			process.stdout.write("\n");
		}
		supervisor.session.dispose();
	} finally { rl.close(); }
}

async function graphCommand(args: string[]): Promise<void> {
	const subcommand = args[0];
	// Repository-specific data lives in .darkfactory/: the graph is the `graph` section of the manifest.
	const graphPath = subcommand === "validate" ? (args[1] ?? ".darkfactory/manifest.json") : (option(args, "--graph") ?? ".darkfactory/manifest.json");
	const document = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const graph = validateGraph(document && typeof document === "object" && "graph" in document ? (document as { graph: unknown }).graph : document);
	if (subcommand === "validate") { console.log(`${graphPath}: valid workflow graph v${graph.version} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`); return; }
	if (subcommand !== "plan") throw new Error(`Unknown graph command: ${subcommand ?? ""}`);
	const eventPath = option(args, "--event");
	const statePath = option(args, "--state");
	if (!eventPath || !statePath) throw new Error("graph plan requires --event <file> --state <file>");
	const [event, state] = await Promise.all([readFile(eventPath, "utf8"), readFile(statePath, "utf8")]);
	console.log(JSON.stringify(plan(graph, JSON.parse(event) as GraphEvent, JSON.parse(state) as RunState), null, 2));
}

async function secretsCli(home: string, args: string[]): Promise<void> {
	const allowFileKey = args.includes("--insecure-file-key");
	const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
	await secretsCommand(args.filter((arg) => arg !== "--insecure-file-key"), {
		dfHome: home,
		allowFileKey,
		stdin: async () => { try { return await Bun.stdin.text(); } catch { return ""; } },
		githubClient: (repoSlug: string) => {
			if (!token) throw new Error("df secrets push/doctor needs GITHUB_TOKEN or GH_TOKEN");
			const [owner, repo] = repoSlug.split("/");
			if (!owner || !repo) throw new Error(`Expected <owner/repo>, got ${repoSlug}`);
			const client = new GitHubClient({ token });
			return { client, repository: new GitHubRepository(client, owner, repo) };
		},
	});
}

export async function main(args = process.argv.slice(2)): Promise<void> {
	if (args[0] === "graph") return graphCommand(args.slice(1));
	const home = defaultDfHome();
	const config = await loadDfConfig(home);
	const providerConfig = await loadProviderConfig(home);
	const registry = new ProviderRegistry(providerConfig);
	const keyring = new OsKeyringAdapter();
	const borrowed = new ConfiguredBorrowedCredentialCoordinator(homedir(), providerConfig.providers, keyring);
	const quota = new QuotaStore(home, { fallbackTtlMs: config.cooldownTtlMs, persist: (candidate) => candidate.provider !== "faux" });
	const store = new FileCredentialStore(home, localCredentialFallback(home, config, providerConfig), borrowed, (provider, label) => quota.clearAccount(provider, label));
	const command = args[0];
	switch (command) {
		case "__packaging-smoke": return packagingSmoke();
		case "providers": return providersCommand(registry);
		case "models": return modelsCommand(registry, store, args.slice(1));
		case "accounts": return accountsCommand(store);
		case "account":
			if (args[1] === "set") return accountSetCommand(store, args.slice(2));
			if (args[1] === "import") return accountImportCommand(registry, store, args.slice(2));
			throw new Error(`Unknown account command: ${args[1] ?? ""}`);
		case "login": return loginCommand(registry, store, args[1], option(args, "--account"));
		case "logout": return logoutCommand(store, args[1], option(args, "--account"));
		case "ask": return askCommand(registry, store, args.slice(1));
		case "run": return runCommand(registry, store, config, args.slice(1));
		case "chat": return chatCommand(registry, store, config, args.slice(1));
		case "ci": {
			const exitCode = await runCiCli(args.slice(1));
			if (exitCode !== 0) process.exitCode = exitCode;
			return;
		}
		case "secrets": return secretsCli(home, args.slice(1));
		case "help": case "--help": case "-h": console.log(usage()); return;
		case undefined: return chatCommand(registry, store, config, []);
		default: throw new Error(`Unknown command: ${command}\n${usage()}`);
	}
}

export function exitCodeFor(error: unknown): number {
	return error instanceof ChainExhaustedError ? error.exitCode : 1;
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		const message = redactErrorMessage(error);
		const exitCode = exitCodeFor(error);
		if (process.argv.includes("--json")) console.log(JSON.stringify({ type: "error", message, exitCode, ...(error instanceof ChainExhaustedError ? { reasons: error.reasons } : {}) }));
		console.error(message);
		process.exitCode = exitCode;
	});
}
