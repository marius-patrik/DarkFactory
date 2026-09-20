#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import type { AuthEvent, AuthPrompt, Provider } from "@earendil-works/pi-ai";
import { fauxAssistantMessage, fauxProvider } from "@earendil-works/pi-ai";
import { runCiCli } from "./ci/cli.ts";
import { DEFAULT_ROUTER_CONFIG, type DfConfig, loadDfConfig, localCredentialFallback } from "./config.ts";
import { defaultDfHome, FileCredentialStore, parseAccountId, validateAccountRecord } from "./credentials.ts";
import type { Candidate } from "./failover.ts";
import { GitHubClient } from "./github/client.ts";
import { GitHubRepository } from "./github/repository.ts";
import { bundledGraphPath } from "./graph/assets.ts";
import { type GraphEvent, plan, type RunState, validateGraph } from "./graph/index.ts";
import { parseCandidate, parseChain, resolveRouting } from "./harness/routing.ts";
import { validateCandidateCredentials } from "./harness/runtime.ts";
import {
	type CandidateFailureReason,
	ChainExhaustedError,
	createFailoverSupervisor,
	type HarnessEvent,
	type RunDeadline,
	RunTimeoutError,
} from "./harness/supervisor.ts";
import { runDoctorIdentities } from "./identities/index.ts";
import { importAntigravityAccount, OsKeyringAdapter } from "./import/antigravity.ts";
import { importClaudeAccount } from "./import/claude.ts";
import { importCodexAccount } from "./import/codex.ts";
import { importGrokAccount } from "./import/grok.ts";
import { OsClaudeKeyringAdapter } from "./import/keyring.ts";
import { importKimiAccount } from "./import/kimi.ts";
import { OsHomeReader } from "./import/reader.ts";
import { LimitLedger } from "./limits/ledger.ts";
import { QuotaEngine } from "./limits/quota-engine.ts";
import { buildQuotaReport } from "./limits/quota-report.ts";
import { estimateTask } from "./limits/routing.ts";
import { loginProviderAccount } from "./login.ts";
import { type CatalogResult, isRunnableCatalogModel, ModelCatalog } from "./models/catalog.ts";
import { ModelPoller } from "./models/poller.ts";
import { ProviderRegistry } from "./providers/runtime.ts";
import { loadProviderConfig } from "./providers/schema.ts";
import { classifyFailure } from "./quota.ts";
import { redactErrorMessage } from "./redaction.ts";
import { buildRouterCatalog } from "./router/catalog.ts";
import { OutcomeStore } from "./router/outcomes.ts";
import { routeTask } from "./router/router.ts";
import {
	candidateTierKey,
	type CapabilityEscalationPolicy,
} from "./router/tiers.ts";
import type {
	Difficulty,
	ModelCapability,
	RouteResult,
	RouterInput,
	TaskSize as RouterTaskSize,
	TaskKind,
	TaskNeed,
} from "./router/types.ts";
import { secretsCommand } from "./secrets/cli.ts";

function usage(): string {
	return [
		"Usage:",
		"  df | df chat [--chain provider/model@account,... | --model provider/model@account] [--reasoning hard]",
		"  df run [--chain provider/model@account,... | --model provider/model@account] [--reasoning hard] [--size small|medium|large] [--difficulty easy|medium|hard] [--min-tier id] [--timeout 15m0s] [--json] <prompt>",
		"  df route [--kind kind] [--size size] [--difficulty easy|medium|hard] [--min-tier id] [--need capability] [--json] <prompt>",
		"  df limits [--json] | df limits clear <provider|provider:account|provider/model@account|*>",
		"  df quota [--json] [--provider p]   # every provider/account/model: state, limits, usage and the source of each number",
		"  df providers",
		"  df models [--provider p] [--account label] [--refresh]",
		"  df accounts",
		"  df account set <account-id> <slot> --type <api_key|header|cookie|other> [--from-vault NAME]  # value from stdin or the vault",
		"  df account import <antigravity|claude|codex|grok|kimi> --account <label>",
		"  df account export <provider:label>",
		"  df account load <provider:label> --from-env <VAR>",
		"  df login <provider> [--account <label>]",
		"  df logout <provider> --account <label>",
		"  df ask --chain <provider/model[@account]>,... [--json] <prompt>",
		"  df doctor [identities] [--config <path>] [--manifest <path>] [--repo <path>]",
		"  df ci <install|update|status|runs|logs|rerun|protect|doctor> [options]",
		"  df graph validate [path]",
		"  df graph plan --event <file> --state <file> [--graph <path>]",
		"  df secrets init|import-key|export-key|list|rm|sync|doctor [--insecure-file-key]",
		"  df secrets set NAME [--from-stdin] | get NAME [--reveal] | push <owner/repo> [--only NAME] [--dry-run]",
	].join("\n");
}

const TASK_KINDS: TaskKind[] = [
	"plan",
	"implement",
	"review",
	"fix",
	"summarize",
	"classify",
	"chat",
	"image",
	"video",
];
const TASK_NEEDS: TaskNeed[] = ["tools", "reasoning", "vision", "long_context", "image_gen", "video_gen"];

function routerInput(args: string[], prompt: string, config: DfConfig): RouterInput {
	const kind = option(args, "--kind") as TaskKind | undefined;
	if (kind && !TASK_KINDS.includes(kind)) throw new Error(`--kind must be one of: ${TASK_KINDS.join(", ")}`);
	const size = option(args, "--size") as RouterTaskSize | undefined;
	if (size && !["small", "medium", "large"].includes(size)) throw new Error("--size must be small, medium, or large");
	const difficulty = option(args, "--difficulty") as Difficulty | undefined;
	if (difficulty && !["easy", "medium", "hard"].includes(difficulty))
		throw new Error("--difficulty must be easy, medium, or hard");
	const minTier = option(args, "--min-tier");
	if (minTier && config.router?.capabilityTiers?.length && !config.router.capabilityTiers.some((tier) => tier.id === minTier))
		throw new Error(`--min-tier must be one of: ${config.router.capabilityTiers.map((tier) => tier.id).join(", ")}`);
	const needs = options(args, "--need") as TaskNeed[];
	if (needs.some((need) => !TASK_NEEDS.includes(need)))
		throw new Error(`--need must be one of: ${TASK_NEEDS.join(", ")}`);
	const contextTokensRaw = option(args, "--context-tokens");
	const contextTokens = contextTokensRaw === undefined ? undefined : Number.parseInt(contextTokensRaw, 10);
	if (contextTokens !== undefined && (!Number.isSafeInteger(contextTokens) || contextTokens < 0))
		throw new Error("--context-tokens must be a non-negative integer");
	const reasoning = option(args, "--reasoning");
	return {
		prompt,
		...(option(args, "--chain") ? { explicitChain: option(args, "--chain") } : {}),
		...(option(args, "--model") ? { explicitModel: option(args, "--model") } : {}),
		...((contextTokens ?? 0) > 0 ? { attachedFiles: [{ tokens: contextTokens, modality: "text" as const }] } : {}),
		flags: {
			...(kind ? { kind } : {}),
			...(size ? { size } : {}),
			...(difficulty ? { difficulty } : {}),
			...(minTier ? { minTier } : {}),
			...(needs.length ? { needs } : {}),
			...(args.includes("--sensitive") ? { sensitivity: "sensitive" as const } : {}),
		},
		...(reasoning === "hard" ? { reasoning: "hard" as const } : {}),
	};
}

function option(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index >= 0 ? args[index + 1] : undefined;
}

function options(args: string[], name: string): string[] {
	return args.flatMap((value, index) => (value === name && args[index + 1] ? [args[index + 1]!] : []));
}

export function parseDurationMs(value: string): number {
	const input = value.trim();
	if (!input) throw new Error("--timeout requires a duration such as 30s or 15m0s");
	const part = /(\d+(?:\.\d+)?)(ms|h|m|s)/gy;
	let index = 0;
	let total = 0;
	while (index < input.length) {
		part.lastIndex = index;
		const match = part.exec(input);
		if (!match || match.index !== index) throw new Error(`Invalid --timeout duration: ${value}`);
		const amount = Number(match[1]);
		const unit = match[2];
		const multiplier = unit === "h" ? 3_600_000 : unit === "m" ? 60_000 : unit === "s" ? 1_000 : 1;
		total += amount * multiplier;
		index = part.lastIndex;
	}
	if (!Number.isFinite(total) || total <= 0 || !Number.isSafeInteger(Math.ceil(total)))
		throw new Error("--timeout must be a positive finite duration");
	return Math.ceil(total);
}

function makeRunDeadline(value: string | undefined, startedAt: number): RunDeadline | undefined {
	if (value === undefined) return undefined;
	const budgetMs = parseDurationMs(value);
	return { startedAt, budgetMs, deadlineAt: startedAt + budgetMs };
}

async function withinRunDeadline<T>(operation: Promise<T>, budget?: RunDeadline): Promise<T> {
	if (!budget) return operation;
	const remaining = budget.deadlineAt - Date.now();
	if (remaining <= 0) throw new RunTimeoutError(budget.budgetMs, Math.max(0, Date.now() - budget.startedAt));
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<never>((_, reject) => {
		timer = setTimeout(
			() => reject(new RunTimeoutError(budget.budgetMs, Math.max(0, Date.now() - budget.startedAt))),
			remaining,
		);
	});
	try {
		return await Promise.race([operation, timeout]);
	} finally {
		if (timer !== undefined) clearTimeout(timer);
	}
}

function removeOptions(args: string[], names: readonly string[]): string[] {
	const result: string[] = [];
	for (let index = 0; index < args.length; index++) {
		if (names.includes(args[index]!)) {
			index++;
			continue;
		}
		if (args[index] === "--json" || args[index] === "--faux" || args[index] === "--sensitive") continue;
		result.push(args[index]!);
	}
	return result;
}

export { parseCandidate } from "./harness/routing.ts";
export { routerModels };

async function providersCommand(registry: ProviderRegistry): Promise<void> {
	console.log("provider\toauth-login\tsubscription\tdata-collection");
	// Use the raw provider configs to access free/data fields.
	const entries = registry.entries.filter((e) => e.enabled !== false);
	const sorted = entries.sort((a, b) => a.id.localeCompare(b.id));
	for (const entry of sorted) {
		const collection = entry.free?.data?.collection ?? entry.data?.collection ?? "unknown";
		const hasOauth = entry.auth.some((a) => a.kind === "oauth");
		const isSubscription = entry.auth.some((a) => a.kind === "oauth" && (a as any).isSubscription === true);
		console.log(`${entry.id}\t${hasOauth ? "yes" : "no"}\t${isSubscription ? "yes" : "no"}\t${collection}`);
	}
}

function providerList(registry: ProviderRegistry, additional: readonly Provider[] = []): Provider[] {
	const byId = new Map([...registry.providers, ...additional].map((provider) => [provider.id, provider]));
	return [...byId.values()];
}

async function modelsCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	args: string[],
	ledger?: LimitLedger,
): Promise<void> {
	const selected = option(args, "--provider");
	const requestedAccount = option(args, "--account");
	const refresh = args.includes("--refresh");
	const json = args.includes("--json");
	const usableFlag = args.includes("--usable");
	const staleFlag = args.includes("--stale");
	const providers = providerList(registry).filter((provider) => !selected || provider.id === selected);
	if (selected && providers.length === 0) throw new Error(`Unknown provider ${selected}`);
	const accounts = await store.listAccounts();
	// Build account map for ModelPoller
	const accountMap = new Map<string, string[]>();
	for (const entry of accounts) {
		const list = accountMap.get(entry.provider) ?? [];
		list.push(entry.label);
		accountMap.set(entry.provider, list);
	}
	// Helper to resolve account for a provider (same logic as original)
	const resolveAccount = (providerId: string): string => {
		return requestedAccount ?? accounts.find((e) => e.provider === providerId)?.label ?? "default";
	};
	let failures = 0;
	if (!usableFlag && !staleFlag) {
		// Existing behavior – list all models from catalog
		const catalog = new ModelCatalog({
			home: defaultDfHome(),
			providers,
			providerConfigs: registry.entries,
			store,
			offline: process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
		});
		console.log("provider\tmodel\tname\tmethods\tsource");
		for (const provider of providers.sort((a, b) => a.id.localeCompare(b.id))) {
			const account = resolveAccount(provider.id);
			const config = registry.config(provider.id);
			const anonymous = config?.auth.some((auth) => auth.kind === "api_key" && auth.optional) ?? false;
			let credential: unknown;
			try {
				credential = await store.forAccount(provider.id, account).read(provider.id);
			} catch (error) {
				console.error(`[models] ${provider.id}@${account}: ${error instanceof Error ? error.message : String(error)}`);
				failures++;
				continue;
			}
			if (!credential && !anonymous && config?.models.list) {
				if (selected) {
					console.error(`[models] ${provider.id}@${account}: no credentials (df account import|set, or df login)`);
					failures++;
				} else console.error(`[models] ${provider.id}: skipped, no credentials for account ${account}`);
				continue;
			}
			try {
				const result = await catalog.get(provider.id, { account, refresh });
				if (result.error) {
					console.error(
						`[models] ${provider.id}@${account}: live refresh failed (${result.error}); serving cached catalog`,
					);
					if (refresh) failures++;
				}
				for (const model of result.models)
					console.log(
						`${provider.id}\t${model.id}\t${model.name}\t${model.supportedMethods?.join(",") ?? "-"}\t${result.source}`,
					);
			} catch (error) {
				console.error(`[models] ${provider.id}@${account}: ${error instanceof Error ? error.message : String(error)}`);
				failures++;
			}
		}
	} else {
		const sources = new Map<string, string>();
		const catalog = new ModelCatalog({
			home: defaultDfHome(),
			providers,
			providerConfigs: registry.entries,
			store,
			offline: process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
		});
		const capturingCatalog = {
			get: async (providerId: string, options?: { account?: string; refresh?: boolean }) => {
				const result = await catalog.get(providerId, { ...(options ?? {}), refresh: options?.refresh ?? refresh });
				sources.set(`${providerId}\u0000${options?.account ?? ""}`, result.source);
				return result;
			},
		} as ModelCatalog;
		const poller = new ModelPoller({
			catalog: capturingCatalog,
			providers: [...registry.entries],
			accounts: accountMap,
			ledger,
		});
		const rows: Array<Record<string, string>> = [];
		for (const provider of providers.sort((a, b) => a.id.localeCompare(b.id))) {
			const account = resolveAccount(provider.id);
			try {
				const { usable, stale, excluded } = await poller.poll(provider.id, account);
				const source = sources.get(`${provider.id}\u0000${account}`) ?? "live";
				if (usableFlag) {
					for (const model of usable)
						rows.push({ provider: provider.id, model: model.id, account, source, reason: "" });
					for (const model of excluded)
						rows.push({ provider: provider.id, model: model.id, account, source, reason: model.reason });
				}
				if (staleFlag) {
					for (const id of stale)
						rows.push({ provider: provider.id, model: id, account, source, reason: "missing from live list" });
				}
			} catch (error) {
				console.error(`[models] ${provider.id}@${account}: ${error instanceof Error ? error.message : String(error)}`);
				failures++;
			}
		}
		if (json) console.log(JSON.stringify(rows));
		else {
			console.log(usableFlag ? "model\tsource\treason" : "provider\tmodel\treason");
			for (const row of rows) {
				if (usableFlag) console.log(`${row.provider}/${row.model}@${row.account}\t${row.source}\t${row.reason || "-"}`);
				else console.log(`${row.provider}\t${row.model}\t${row.reason}`);
			}
		}
	}
	if (failures > 0) process.exitCode = 1;
}

async function accountImportCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	args: string[],
): Promise<void> {
	const source = args[0];
	const label = option(args, "--account");
	if (!label) throw new Error("account import requires --account <label>");
	const declaration = registry.entries.flatMap((entry) => entry.importers ?? []).find((entry) => entry.id === source);
	if (!declaration) throw new Error(`Unknown account import source: ${source ?? ""}`);
	if (declaration.parser === "antigravity-keyring") {
		await importAntigravityAccount(
			store,
			label,
			new OsKeyringAdapter(),
			declaration.targetProvider,
			declaration.keyring?.service,
			declaration.keyring?.account,
		);
		await markImportedAccount(store, declaration.targetProvider, label, declaration.id);
		console.log(`Imported ${declaration.targetProvider}/${label}.`);
		return;
	}
	const reader = new OsHomeReader(homedir());
	if (declaration.parser === "claude-code")
		await importClaudeAccount(
			store,
			label,
			{ home: reader.home, homeReader: reader, keyring: new OsClaudeKeyringAdapter() },
			declaration.targetProvider,
		);
	else if (declaration.parser === "codex")
		await importCodexAccount(store, label, reader, declaration.targetProvider, declaration.apiKeyTargetProvider);
	else if (declaration.parser === "grok-cli") await importGrokAccount(store, label, reader, declaration.targetProvider);
	else if (declaration.parser === "kimi-code") {
		if (!declaration.path) throw new Error(`Importer ${declaration.id} has no configured path`);
		await importKimiAccount(store, label, reader, declaration.targetProvider, declaration.path);
	} else throw new Error(`Importer parser is not implemented: ${declaration.parser}`);
	await markImportedAccount(store, declaration.targetProvider, label, declaration.id);
	console.log(`Imported ${source}/${label}.`);
}

async function markImportedAccount(
	store: FileCredentialStore,
	provider: string,
	label: string,
	importer: string,
): Promise<void> {
	const id = `${provider}:${label}`;
	await store.modifyAccount(id, async (current) =>
		current
			? {
					...current,
					metadata: {
						...(current.metadata ?? {}),
						importedFrom: importer,
						ownership: "df-owned",
						sync: "machine-only",
					},
				}
			: undefined,
	);
}

async function accountsCommand(store: FileCredentialStore): Promise<void> {
	const accounts = await store.listAccounts();
	if (accounts.length === 0) {
		console.log("No accounts.");
		return;
	}
	console.log("id\ttype\texpiry\trefresh\townership\tslots");
	for (const account of accounts) {
		const slots = account.slots.map((slot) => `${slot.name}:${slot.type}`).join(",");
		const record = await store.readAccount(account.id);
		const oauth = record && Object.values(record.slots).find((slot) => slot.type === "oauth");
		const types = [...new Set(account.slots.map((slot) => slot.type))].join(",") || "-";
		const expiry =
			oauth?.type === "oauth"
				? `${new Date(oauth.expires).toISOString()} (${oauth.expires > Date.now() ? "valid" : "expired"})`
				: "-";
		const refresh = oauth?.type === "oauth" && oauth.refresh ? "df-managed" : "-";
		const baseOwnership = account.metadata?.ownership ?? "df-owned";
		const importedFrom = account.metadata?.importedFrom ?? account.metadata?.importer;
		const ownership = importedFrom ? `${baseOwnership} (imported from ${importedFrom})` : baseOwnership;
		console.log(`${account.id}\t${types}\t${expiry}\t${refresh}\t${ownership}\t${slots || "-"}`);
	}
}

async function accountExportCommand(store: FileCredentialStore, args: string[]): Promise<void> {
	const id = args[0];
	if (!id) throw new Error("account export requires <provider:label>");
	const account = await store.readAccount(id);
	if (!account) throw new Error(`Account not found: ${id}`);
	console.log(JSON.stringify(account));
}

async function accountLoadCommand(store: FileCredentialStore, args: string[]): Promise<void> {
	const id = args[0];
	const fromEnv = option(args, "--from-env");
	if (!id || !fromEnv) throw new Error("account load requires <provider:label> --from-env <VAR>");
	const parsedId = parseAccountId(id);
	if (!parsedId) throw new Error("Invalid account id; expected <provider:label>");
	const raw = process.env[fromEnv];
	if (!raw || !raw.trim()) throw new Error(`Environment variable ${fromEnv} is empty or not set`);
	let parsedJson: unknown;
	try {
		parsedJson = JSON.parse(raw);
	} catch {
		throw new Error("Invalid account JSON");
	}
	const validated = validateAccountRecord(parsedJson, id);
	validated.metadata = { ...(validated.metadata ?? {}), ownership: "df-owned" };
	await store.modifyAccount(id, async () => validated);
	console.log(`Loaded account ${id} from ${fromEnv}.`);
}

async function accountSetCommand(store: FileCredentialStore, args: string[]): Promise<void> {
	const [id, slotName] = args;
	const fromVault = option(args, "--from-vault");
	const type = option(args, "--type") ?? (fromVault ? "api_key" : undefined);
	if (!id || !slotName || !type)
		throw new Error("account set requires <account-id> <slot> --type <type> (or --from-vault NAME)");
	if (
		!(["api_key", "header", "cookie", "other"] as const).includes(type as "api_key" | "header" | "cookie" | "other")
	) {
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
	await store.modifyAccount(id, async (current) =>
		current ? { ...current, metadata: { ...(current.metadata ?? {}), ownership: "df-owned" } } : undefined,
	);
	console.log(`Saved ${id} slot ${slotName} (${type}).`);
}

async function answerPrompt(rl: ReturnType<typeof createInterface>, prompt: AuthPrompt): Promise<string> {
	if (prompt.type === "select") {
		console.log(prompt.message);
		for (const [index, entry] of prompt.options.entries()) console.log(`  ${index + 1}. ${entry.label}`);
		const selected = prompt.options[Number.parseInt(await rl.question("Selection: "), 10) - 1];
		if (!selected) throw new Error("Invalid selection");
		return selected.id;
	}
	return rl.question(`${prompt.message}${prompt.placeholder ? ` (${prompt.placeholder})` : ""}: `, {
		signal: prompt.signal,
	});
}

function notifyLogin(event: AuthEvent): void {
	if (event.type === "auth_url") {
		console.log(`Open this URL in a browser:\n${event.url}`);
		if (event.instructions) console.log(event.instructions);
	} else if (event.type === "device_code")
		console.log(`Open ${event.verificationUri} and enter code ${event.userCode}`);
	else console.log(event.message);
}

async function loginCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	providerId: string | undefined,
	label: string | undefined,
): Promise<void> {
	if (!providerId) throw new Error("login requires <provider>");
	const account = label ?? "default";
	const provider = registry.config(providerId);
	if (!provider) throw new Error(`Unknown provider ${providerId}`);
	const rl = createInterface({ input: stdin, output: stdout });
	try {
		await loginProviderAccount(provider, account, store, {
			prompt: (prompt) => answerPrompt(rl, prompt),
			notify: notifyLogin,
		});
		console.log(`Saved OAuth account ${providerId}/${account}`);
	} finally {
		rl.close();
	}
}

async function logoutCommand(
	store: FileCredentialStore,
	providerId: string | undefined,
	label: string | undefined,
): Promise<void> {
	if (!providerId || !label) throw new Error("logout requires <provider> and --account <label>");
	if (!(await store.deleteAccount(`${providerId}:${label}`))) throw new Error(`No account ${providerId}/${label}`);
	console.log(`Logged out ${providerId}/${label}.`);
}

async function askCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
): Promise<void> {
	const chainValue = option(args, "--chain");
	if (!chainValue) throw new Error("ask requires --chain");
	const prompt = removeOptions(args, ["--chain"]).join(" ").trim();
	if (!prompt) throw new Error("ask requires a prompt");
	const json = args.includes("--json");
	const supervisor = await createCliSupervisor(
		registry,
		store,
		config,
		["run", ...args],
		parseChain(chainValue),
		json,
		estimateTask(prompt),
	);
	const result = await supervisor.prompt(prompt);
	if (!json) process.stdout.write("\n");
	else
		console.log(
			JSON.stringify({
				type: "result",
				candidate: supervisor.activeCandidate,
				stopReason: result.stopReason,
				responseModel: result.responseModel,
			}),
		);
	supervisor.session.dispose();
}

function fauxProviders(enabled: boolean): { providers: Provider[]; optional: string[] } {
	if (!enabled) return { providers: [], optional: [] };
	const handle = fauxProvider({ provider: "faux", models: [{ id: "echo" }] });
	handle.setResponses(
		Array.from({ length: 128 }, () => (context) => {
			const user = [...context.messages].reverse().find((message) => message.role === "user");
			const text =
				typeof user?.content === "string"
					? user.content
					: Array.isArray(user?.content)
						? user.content
								.filter((block) => block.type === "text")
								.map((block) => block.text)
								.join("")
						: "";
			if (text === "__df_quota__")
				return fauxAssistantMessage([], { stopReason: "error", errorMessage: "429 insufficient_quota" });
			if (text === "__df_auth__")
				return fauxAssistantMessage([], { stopReason: "error", errorMessage: "401 invalid token" });
			return fauxAssistantMessage(`faux: ${text}`);
		}),
	);
	return { providers: [handle.provider], optional: ["faux"] };
}

/**
 * Reports whether a stored account holds every required credential slot — the same check the runtime enforces before a
 * run — so the router never offers a candidate that would fail authentication.
 *
 * @param store - Credential store to read.
 * @param provider - Provider id.
 * @param account - Account label.
 * @param required - The provider's `requiredCredentialSlots`.
 * @returns True when the credential exists and every slot is present; false on any read error.
 */
async function accountHasSlots(
	store: FileCredentialStore,
	provider: string,
	account: string,
	required: readonly string[],
): Promise<boolean> {
	try {
		const credential = await store.forAccount(provider, account).read(provider);
		if (!credential) return false;
		const record = await store.readAccount(`${provider}:${account}`);
		return required.every(
			(slot) =>
				(slot === "api_key" && credential.type === "api_key") ||
				(slot === "oauth" && credential.type === "oauth") ||
				record?.slots[slot] !== undefined,
		);
	} catch {
		return false;
	}
}

async function routerModels(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
): Promise<ModelCapability[]> {
	const accountSets = new Map<string, Set<string>>();
	const declarations = [
		config.defaultChain,
		config.hardReasoningChain,
		config.sensitiveChain,
		config.router?.classifier,
		...(config.router?.candidates ?? []),
		...(config.router?.policies.flatMap((policy) => policy.prefer.candidates ?? []) ?? []),
	];
	for (const declaration of declarations) {
		if (!declaration) continue;
		for (const candidate of parseChain(declaration)) {
			const accounts = accountSets.get(candidate.provider) ?? new Set<string>();
			accounts.add(candidate.account);
			accountSets.set(candidate.provider, accounts);
		}
	}
	for (const account of await store.listAccounts()) {
		const accounts = accountSets.get(account.provider) ?? new Set<string>();
		accounts.add(account.label);
		accountSets.set(account.provider, accounts);
	}
	const accounts = new Map([...accountSets].map(([provider, values]) => [provider, [...values]]));
	// A provider that requires credentials keeps only the accounts holding every required slot; with none left it leaves the
	// candidate universe. Providers without required slots and anonymous transports (optional API key with an anonymous
	// value) stay as declared.
	const unavailable = new Set<string>();
	for (const provider of registry.entries) {
		const required = provider.requiredCredentialSlots ?? [];
		if (
			required.length === 0 ||
			provider.auth.some((auth) => auth.kind === "api_key" && auth.optional && auth.anonymousValue !== undefined)
		)
			continue;
		const usable: string[] = [];
		for (const account of accounts.get(provider.id) ?? [])
			if (await accountHasSlots(store, provider.id, account, required)) usable.push(account);
		if (usable.length > 0) accounts.set(provider.id, usable);
		else {
			accounts.delete(provider.id);
			unavailable.add(provider.id);
		}
	}
	const fauxEnabled = args.includes("--faux") || process.env.DF_FAUX === "1";
	const faux = fauxProviders(fauxEnabled);
	const catalog = new ModelCatalog({
		home: defaultDfHome(),
		providers: providerList(registry, faux.providers),
		providerConfigs: registry.entries,
		store,
		offline: fauxEnabled || process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
	});
	const catalogs = new Map<string, CatalogResult>();
	const ledger = new LimitLedger(defaultDfHome());
	await Promise.all(
		registry.entries
			.filter((provider) => provider.enabled !== false && !unavailable.has(provider.id))
			.map(async (provider) => {
				const account = accounts.get(provider.id)?.[0] ?? "default";
				if (provider.models.list && !provider.auth.some((auth) => auth.kind === "api_key" && auth.optional)) {
					const knownAccount = (accounts.get(provider.id)?.length ?? 0) > 0;
					let credential: unknown;
					try {
						credential = await store.forAccount(provider.id, account).read(provider.id);
					} catch {
						return;
					}
					if (!credential && !knownAccount) return;
				}
				try {
					const result = await catalog.get(provider.id, { account });
					// The poller decides what is usable from that listing: text-generation models only, free models on
					// free tiers, minus routing.exclude and learned unavailability from the limit ledger (D3).
					const poller = new ModelPoller({
						catalog: { get: async () => result } as unknown as ModelCatalog,
						providers: [provider],
						accounts,
						ledger,
					});
					const { usable } = await poller.poll(provider.id, account);
					catalogs.set(provider.id, { ...result, models: usable });
				} catch {
					/* static declarations remain the offline fallback */
				}
			}),
	);
	const models = buildRouterCatalog({
		providers: registry.entries.filter((provider) => !unavailable.has(provider.id)),
		catalogs,
		accounts,
		overrides: config.router?.models,
	});
	if (fauxEnabled)
		models.push({
			candidate: { provider: "faux", model: "echo", account: "test" },
			contextWindow: 128_000,
			tools: true,
			reasoning: true,
			modalities: ["text", "image"],
			quality: {},
			limitTier: "standard",
			source: "builtin",
			collection: "none" as const,
		});
	return models;
}

async function resolveCliRoute(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
	prompt: string,
): Promise<RouteResult> {
	const home = defaultDfHome();
	const learning = config.router?.learning;
	const ledger = new LimitLedger(home, {
		fallbackTtlMs: config.cooldownTtlMs,
		persist: (candidate) => candidate.provider !== "faux",
	});
	const quota =
		process.env.DF_QUOTA === "off"
			? undefined
			: new QuotaEngine(home, ledger, new Map(registry.entries.map((e) => [e.id, e])));
	return routeTask(routerInput(args, prompt, config), {
		config: config.router ?? DEFAULT_ROUTER_CONFIG,
		models: await routerModels(registry, store, config, args),
		ledger,
		outcomes: new OutcomeStore(home, learning),
		defaultChain: config.defaultChain,
		sensitiveChain: config.sensitiveChain,
		hardReasoningChain: config.hardReasoningChain,
		...(config.router?.classifier
			? {
					classify: async (ambiguousPrompt: string, classifier: string) =>
						classifyWithCandidate(registry, store, config, args, ambiguousPrompt, classifier),
				}
			: {}),
		quota,
	});
}

function parsedTaskKind(value: unknown): TaskKind | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value
		.trim()
		.replace(/^```(?:json)?\s*|\s*```$/giu, "")
		.trim();
	if (TASK_KINDS.includes(normalized as TaskKind)) return normalized as TaskKind;
	try {
		const decoded = JSON.parse(normalized) as { kind?: unknown };
		return typeof decoded.kind === "string" && TASK_KINDS.includes(decoded.kind as TaskKind)
			? (decoded.kind as TaskKind)
			: undefined;
	} catch {
		return undefined;
	}
}

function messageText(message: unknown): string {
	if (!message || typeof message !== "object") return "";
	const content = (message as { content?: unknown }).content;
	if (typeof content === "string") return content;
	return Array.isArray(content)
		? content
				.flatMap((block) =>
					block &&
					typeof block === "object" &&
					(block as { type?: unknown }).type === "text" &&
					typeof (block as { text?: unknown }).text === "string"
						? [(block as { text: string }).text]
						: [],
				)
				.join("")
		: "";
}

async function classifyWithCandidate(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
	prompt: string,
	classifier: string,
): Promise<TaskKind> {
	let supervisor: Awaited<ReturnType<typeof createCliSupervisor>> | undefined;
	try {
		supervisor = await createCliSupervisor(
			registry,
			store,
			config,
			["run", ...(args.includes("--faux") ? ["--faux"] : []), "--deny", "*"],
			[parseCandidate(classifier)],
			false,
			estimateTask(prompt, "small"),
			"classify",
			() => undefined,
		);
		const result = await supervisor.prompt(
			`Classify the task below. Return only one JSON object with a kind from ${TASK_KINDS.join(", ")}.\n\n${prompt}`,
			1,
		);
		return parsedTaskKind(messageText(result)) ?? "chat";
	} catch {
		return "chat";
	} finally {
		supervisor?.session.dispose();
	}
}

function printRoute(route: RouteResult, write: (line: string) => void = console.log): void {
	write(
		`profile: ${route.profile.kind}/${route.profile.size}; needs=${route.profile.needs.join(",") || "none"}; sensitivity=${route.profile.sensitivity}; context=${route.profile.contextTokens}`,
	);
	write(`source: ${route.source}${route.policy ? ` (${route.policy})` : ""}`);
	write(
		`capability: difficulty=${route.difficulty ?? route.profile.difficulty ?? "unspecified"}; minimum=${route.minCapabilityTier ?? "unspecified"}; selected=${route.selectedCapabilityTier ?? "none"}`,
	);
	for (const item of route.ranked)
		write(
			`${item.rank}. ${item.candidate.provider}/${item.candidate.model}@${item.candidate.account}\t${item.status}\t${item.reason}\t${item.details.join("; ")}`,
		);
}

async function routeCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
): Promise<void> {
	const prompt = removeOptions(args, [
		"--chain",
		"--model",
		"--reasoning",
		"--kind",
		"--size",
		"--difficulty",
		"--min-tier",
		"--need",
		"--context-tokens",
	])
		.join(" ")
		.trim();
	if (!prompt) throw new Error("route requires a prompt");
	const route = await resolveCliRoute(registry, store, config, args, prompt);
	if (args.includes("--json")) console.log(JSON.stringify(route));
	else printRoute(route);
}

const SECRET_KEY = /token|secret|password|api[-_]?key|authorization/iu;
const BEARER_VALUE = /\bbearer\s+[A-Za-z0-9._~+/=-]+/iu;

/**
 * The candidates a run tries, in order: the router's chosen chain, then candidates it skipped only because a limit
 * is active. They go last so the supervisor waits for their windows instead of the run ending with exit 1 when every
 * chosen candidate turns out unusable (seen 2026-09-15: chosen models missing from live catalogs while the rate-limited
 * ones would have recovered within a minute).
 */
export function executableChainFor(route: Pick<RouteResult, "chain" | "ranked">): Candidate[] {
	const deferred = route.ranked
		.filter(
			(item) =>
				item.status === "skipped" &&
				(["limited", "capacity"].includes(item.reason) || item.reason.startsWith("quota exhausted until")),
		)
		.map((item) => item.candidate);
	const key = (candidate: Candidate) => `${candidate.provider}/${candidate.model}@${candidate.account}`;
	const seen = new Set(route.chain.map(key));
	const tail = deferred.filter((candidate) => !seen.has(key(candidate)) && !!seen.add(key(candidate)));
	return [...route.chain, ...tail];
}

export function redactToolInput(value: unknown, key?: string): unknown {
	if (key && SECRET_KEY.test(key)) return "[REDACTED]";
	if (typeof value === "string") return BEARER_VALUE.test(value) ? "[REDACTED]" : value;
	if (Array.isArray(value)) return value.map((entry) => redactToolInput(entry));
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.entries(value as Record<string, unknown>).map(([name, entry]) => [name, redactToolInput(entry, name)]),
	);
}

function renderEvent(event: HarnessEvent, json: boolean): void {
	if (json) {
		console.log(
			JSON.stringify(event.type === "tool_start" ? { ...event, input: redactToolInput(event.input) } : event),
		);
		return;
	}
	if (event.type === "text_delta") process.stdout.write(event.delta);
	else if (event.type === "tool_start") console.error(`[tool] ${event.toolName}`);
	else if (event.type === "tool_end") console.error(`[tool] ${event.toolName}: ${event.isError ? "error" : "ok"}`);
	else if (event.type === "tier_escalation")
		console.error(
			`\n[tier] ${event.fromTier} -> ${event.toTier} after ${event.reason}: ${event.from.provider}/${event.from.model} -> ${event.to.provider}/${event.to.model}`,
		);
	else if (event.type === "failover")
		console.error(
			`\n[failover] ${event.from.provider}/${event.from.account}/${event.from.model} -> ${event.to.provider}/${event.to.account}/${event.to.model} (${event.reason}: ${event.errorMessage})`,
		);
	else if (event.type === "candidate_unavailable")
		console.error(
			`[unavailable] ${event.candidate.provider}/${event.candidate.account}/${event.candidate.model} (${event.message})`,
		);
	else if (event.type === "candidate_skipped")
		console.error(
			`[skip] ${event.candidate.provider}/${event.candidate.account}/${event.candidate.model} (${event.reason})`,
		);
	else if (event.type === "waiting")
		console.error(`\n[waiting] ${event.reason} until ${new Date(event.until).toISOString()}`);
	else if (event.type === "timeout")
		console.error(`\n[timeout] run ${event.sessionId} exceeded ${event.budgetMs}ms after ${event.elapsedMs}ms`);
	else if (event.type === "limit")
		console.error(
			`[limit] ${event.entry.provider}/${event.entry.account}/${event.entry.model} ${event.entry.type} until ${new Date(event.entry.resetAt).toISOString()}`,
		);
	else if (event.type === "recovered")
		console.error(
			`[recovered] ${event.entry.provider}/${event.entry.account}/${event.entry.model} ${event.entry.type}`,
		);
	else if (event.type === "step" && event.errorKind)
		console.error(
			`\n[step] ${event.provider}/${event.account}/${event.model}: ${event.errorKind}: ${event.errorMessage}`,
		);
}

async function packagingSmoke(): Promise<void> {
	const arch = process.arch;
	const platform = process.platform;
	const directory = join(dirname(process.execPath), "native", platform, "prebuilds", `${platform}-${arch}`);
	const names =
		platform === "linux"
			? ["linux-platform-x11.node"]
			: [
					`${platform}-platform.node`,
					...(platform === "darwin"
						? ["darwin-modifiers.node"]
						: platform === "win32"
							? ["win32-console-mode.node"]
							: []),
				];
	const nativePath = names.map((name) => join(directory, name)).find(existsSync);
	if (!nativePath) throw new Error(`Packaged pi-tui native module is missing for ${platform}-${arch}`);
	const loaded = createRequire(import.meta.url)(nativePath) as unknown;
	if ((typeof loaded !== "object" || loaded === null) && typeof loaded !== "function")
		throw new Error("Packaged pi-tui native module did not load");

	const worker = new Worker("./src/utils/image-resize-worker.ts");
	try {
		const png = Uint8Array.from(
			Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
				"base64",
			),
		);
		const result = await new Promise<{ result?: unknown; error?: string }>((resolve, reject) => {
			const timeout = setTimeout(() => reject(new Error("Packaged image worker timed out")), 5_000);
			worker.onmessage = (event) => {
				clearTimeout(timeout);
				resolve(event.data as { result?: unknown; error?: string });
			};
			worker.onerror = (event) => {
				clearTimeout(timeout);
				reject(new Error(event.message));
			};
			worker.postMessage({ inputBytes: png, mimeType: "image/png", options: { maxWidth: 1, maxHeight: 1 } });
		});
		if (result.error || result.result === undefined)
			throw new Error(result.error ?? "Packaged image worker returned no result");
	} finally {
		worker.terminate();
	}
	console.log("packaging smoke ok");
}

function capabilityEscalationFor(route: RouteResult): CapabilityEscalationPolicy | undefined {
	const order = route.capabilityTierOrder ?? [];
	const baselineTier = route.selectedCapabilityTier;
	if (!baselineTier || order.length === 0) return undefined;
	const candidateTiers = Object.fromEntries(
		route.ranked.flatMap((item) =>
			item.status === "chosen" && item.capabilityTier
				? [[candidateTierKey(item.candidate), item.capabilityTier] as const]
				: [],
		),
	);
	return { order, baselineTier, candidateTiers };
}

async function createCliSupervisor(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
	chain: Candidate[],
	json: boolean,
	taskEstimate?: ReturnType<typeof estimateTask>,
	taskKind?: TaskKind,
	eventHandler?: (event: HarnessEvent) => void,
	capabilityEscalation?: CapabilityEscalationPolicy,
) {
	const faux = fauxProviders(args.includes("--faux") || process.env.DF_FAUX === "1");
	const providers = providerList(registry, faux.providers);
	const catalog = new ModelCatalog({
		home: defaultDfHome(),
		providers,
		providerConfigs: registry.entries,
		store,
		offline: faux.providers.length > 0 || process.env.DF_OFFLINE === "1" || process.env.PI_OFFLINE !== undefined,
	});
	const catalogs = new Map<string, CatalogResult>();
	const available: Candidate[] = [];
	const unavailable: CandidateFailureReason[] = [];
	const optional = new Set([
		...faux.optional,
		...registry.entries
			.filter((entry) => entry.auth.some((auth) => auth.kind === "api_key" && auth.optional))
			.map((entry) => entry.id),
	]);
	for (const candidate of chain) {
		let result: CatalogResult;
		try {
			await validateCandidateCredentials(
				store,
				candidate,
				registry.config(candidate.provider),
				optional.has(candidate.provider),
			);
			result = await catalog.get(candidate.provider, { account: candidate.account });
			if (!result.models.some((model) => model.id === candidate.model && isRunnableCatalogModel(model))) {
				throw new Error(
					`Model ${candidate.provider}/${candidate.model} is not present in the ${result.source} catalog for account ${candidate.account}`,
				);
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
	if (available.length === 0)
		throw new ChainExhaustedError(
			unavailable.map((reason) => reason.kind),
			unavailable,
		);
	return createFailoverSupervisor({
		chain: available,
		cwd: process.cwd(),
		home: defaultDfHome(),
		resume: option(args, "--resume"),
		policy: { allow: options(args, "--allow"), deny: options(args, "--deny"), headless: args[0] === "run" },
		providers,
		authOptionalProviders: [...optional],
		catalogs,
		providerConfigs: new Map(registry.entries.map((entry) => [entry.id, entry])),
		cooldownTtlMs: config.cooldownTtlMs,
		maxWaitMs: config.maxWaitMs,
		ephemeralProviders: faux.optional,
		taskEstimate,
		monitorRecovery: args[0] === "chat",
		outcomeStore: new OutcomeStore(defaultDfHome(), config.router?.learning),
		taskKind,
		...(capabilityEscalation ? { capabilityEscalation } : {}),
		// Admission control for every model call; DF_QUOTA=off falls back to learned limits only.
		...(process.env.DF_QUOTA === "off"
			? {}
			: {
					quota: new QuotaEngine(
						defaultDfHome(),
						new LimitLedger(defaultDfHome(), { fallbackTtlMs: config.cooldownTtlMs }),
						new Map(registry.entries.map((entry) => [entry.id, entry])),
					),
				}),
		store,
		onEvent: eventHandler ?? ((event) => renderEvent(event, json)),
	});
}

async function runCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
): Promise<void> {
	const startedAt = Date.now();
	const budget = makeRunDeadline(option(args, "--timeout"), startedAt);
	const chainValue = option(args, "--chain");
	const modelValue = option(args, "--model");
	if (chainValue && modelValue) throw new Error("Use only one of --chain or --model");
	const reasoning = option(args, "--reasoning");
	if (reasoning !== undefined && reasoning !== "hard") throw new Error("--reasoning must be hard");
	const json = args.includes("--json");
	const sizeValue = option(args, "--size");
	if (sizeValue !== undefined && !["small", "medium", "large"].includes(sizeValue))
		throw new Error("--size must be small, medium, or large");
	const maxTurns = Number.parseInt(option(args, "--max-turns") ?? "100", 10);
	if (!Number.isSafeInteger(maxTurns) || maxTurns <= 0) throw new Error("--max-turns must be a positive integer");
	const promptFile = option(args, "--prompt-file");
	const prompt = promptFile
		? await readFile(promptFile, "utf8")
		: removeOptions(args, [
				"--chain",
				"--model",
				"--reasoning",
				"--kind",
				"--size",
				"--difficulty",
				"--min-tier",
				"--need",
				"--context-tokens",
				"--max-turns",
				"--timeout",
				"--prompt-file",
				"--allow",
				"--deny",
				"--resume",
			])
				.join(" ")
				.trim();
	if (!prompt) throw new Error("run requires a prompt or --prompt-file");
	const route = await withinRunDeadline(resolveCliRoute(registry, store, config, args, prompt), budget);
	if (json) console.log(JSON.stringify({ type: "route", ...route }));
	else printRoute(route, console.error);
	const executableChain = executableChainFor(route);
	if (executableChain.length === 0)
		throw new ChainExhaustedError([], [], await new LimitLedger(defaultDfHome()).list());
	const task = estimateTask(prompt, route.profile.size, route.profile.contextTokens);
	const supervisor = await withinRunDeadline(
		createCliSupervisor(
			registry,
			store,
			config,
			["run", ...args],
			executableChain,
			json,
			task,
			route.profile.kind,
			undefined,
			capabilityEscalationFor(route),
		),
		budget,
	);
	if (json)
		console.log(
			JSON.stringify({
				type: "session",
				sessionId: supervisor.session.sessionId,
				candidate: supervisor.activeCandidate,
			}),
		);
	else
		console.error(
			`[session ${supervisor.session.sessionId}] ${supervisor.activeCandidate.provider}/${supervisor.activeCandidate.account}/${supervisor.activeCandidate.model}`,
		);
	try {
		const message = await supervisor.prompt(prompt, maxTurns, budget);
		if (!json) process.stdout.write("\n");
		else
			console.log(
				JSON.stringify({
					type: "result",
					sessionId: supervisor.session.sessionId,
					candidate: supervisor.activeCandidate,
					stopReason: message.stopReason,
					usage: message.usage,
				}),
			);
	} finally {
		supervisor.session.dispose();
	}
}

async function quotaCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	ledger: LimitLedger,
	config: DfConfig,
	args: string[],
): Promise<void> {
	const home = defaultDfHome();
	const engine = new QuotaEngine(home, ledger, new Map(registry.entries.map((entry) => [entry.id, entry])));
	const chains = [config.defaultChain, config.hardReasoningChain, config.sensitiveChain].flatMap((chain) =>
		chain ? parseChain(chain) : [],
	);
	const accounts = (await store.listAccounts()).map((account) => ({
		provider: account.provider,
		label: account.label,
	}));
	// Chain accounts backed by local credential files are real accounts too, though the store does not list them.
	for (const candidate of chains) {
		if (accounts.some((account) => account.provider === candidate.provider && account.label === candidate.account))
			continue;
		if (await store.readCredential(candidate.provider, candidate.account).catch(() => undefined))
			accounts.push({ provider: candidate.provider, label: candidate.account });
	}
	const report = await buildQuotaReport({
		providers: registry.entries,
		accounts,
		chains,
		engine,
		provider: option(args, "--provider"),
	});
	if (args.includes("--json")) {
		console.log(JSON.stringify(report, null, 2));
		return;
	}
	const now = Date.now();
	const until = (at?: number) => (at === undefined ? "-" : `${Math.max(0, Math.ceil((at - now) / 60_000))}m`);
	console.log("provider	account	model	state	until	limits (used/limit source)");
	for (const provider of report.providers) {
		if (provider.accounts.length === 0) {
			console.log(
				`${provider.id}	-	-	no-account	-	${provider.free ? `${provider.free.kind}: ${provider.free.keyUrl}` : "no free tier recorded"}`,
			);
			continue;
		}
		for (const account of provider.accounts)
			for (const model of account.models) {
				const limits =
					model.items
						.map(
							(item) =>
								`${item.type}${item.dimension ? `:${item.dimension}` : ""} ${item.used ?? "?"}/${item.limit ?? "?"} ${item.source}`,
						)
						.join("; ") || "none known";
				console.log(
					`${provider.id}	${account.label}	${model.model}	${model.state}	${until(model.until)}	${limits}`,
				);
			}
	}
}

async function limitsCommand(ledger: LimitLedger, args: string[]): Promise<void> {
	if (args[0] === "clear") {
		const selector = args[1];
		if (!selector) throw new Error("limits clear requires a selector");
		const removed = await ledger.clear(selector);
		const event = { type: "limits_cleared", selector, removed, observedAt: Date.now() };
		if (args.includes("--json")) console.log(JSON.stringify(event));
		else console.log(`Cleared ${removed} limit entr${removed === 1 ? "y" : "ies"} for ${selector}.`);
		return;
	}
	for (const entry of await ledger.recover())
		console.error(`[recovered] ${entry.provider}/${entry.account}/${entry.model} ${entry.type}`);
	const entries = await ledger.list();
	if (args.includes("--json")) {
		console.log(JSON.stringify({ version: 1, entries }));
		return;
	}
	console.log("provider\taccount\tmodel\ttype\tremaining\tresets in\tsource");
	const now = Date.now();
	for (const entry of entries)
		console.log(
			`${entry.provider}\t${entry.account}\t${entry.model}\t${entry.type}${entry.dimension ? `:${entry.dimension}` : ""}\t${entry.remaining ?? "-"}${entry.limit === undefined ? "" : `/${entry.limit}`}\t${Math.max(0, Math.ceil((entry.resetAt - now) / 1000))}s\t${entry.source}`,
		);
}

async function chatCommand(
	registry: ProviderRegistry,
	store: FileCredentialStore,
	config: DfConfig,
	args: string[],
): Promise<void> {
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
		console.error(
			`[session ${supervisor.session.sessionId}] ${supervisor.activeCandidate.provider}/${supervisor.activeCandidate.account}/${supervisor.activeCandidate.model}`,
		);
		while (true) {
			const prompt = (await rl.question("\ndf> ")).trim();
			if (prompt === "/exit" || prompt === "/quit") break;
			if (!prompt) continue;
			await supervisor.prompt(prompt);
			process.stdout.write("\n");
		}
		supervisor.session.dispose();
	} finally {
		rl.close();
	}
}

async function graphCommand(args: string[]): Promise<void> {
	const subcommand = args[0];
	const graphPath =
		subcommand === "validate" ? (args[1] ?? bundledGraphPath()) : (option(args, "--graph") ?? bundledGraphPath());
	const document = JSON.parse(await readFile(graphPath, "utf8")) as unknown;
	const graph = validateGraph(
		document && typeof document === "object" && "graph" in document ? (document as { graph: unknown }).graph : document,
	);
	if (subcommand === "validate") {
		console.log(
			`${graphPath}: valid workflow graph v${graph.version} (${graph.nodes.length} nodes, ${graph.edges.length} edges)`,
		);
		return;
	}
	if (subcommand === "dispatch") {
		const { dispatch } = await import("./graph/dispatch.ts");
		await dispatch(args.slice(1));
		return;
	}
	if (subcommand !== "plan") throw new Error(`Unknown graph command: ${subcommand ?? ""}`);
	const eventPath = option(args, "--event");
	const statePath = option(args, "--state");
	if (!eventPath || !statePath) throw new Error("graph plan requires --event <file> --state <file>");
	const [event, state] = await Promise.all([readFile(eventPath, "utf8"), readFile(statePath, "utf8")]);
	console.log(JSON.stringify(plan(graph, JSON.parse(event) as GraphEvent, JSON.parse(state) as RunState), null, 2));
}

async function doctorCommand(args: string[]): Promise<void> {
	const check = args[0];
	if (!check || check === "identities") {
		await runDoctorIdentities(args.slice(check === "identities" ? 1 : 0));
		return;
	}
	throw new Error(`Unknown doctor check: ${check}. Available checks: identities`);
}

async function secretsCli(home: string, args: string[]): Promise<void> {
	const allowFileKey = args.includes("--insecure-file-key");
	const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
	await secretsCommand(
		args.filter((arg) => arg !== "--insecure-file-key"),
		{
			dfHome: home,
			allowFileKey,
			stdin: async () => {
				try {
					return await Bun.stdin.text();
				} catch {
					return "";
				}
			},
			githubClient: (repoSlug: string) => {
				if (!token) throw new Error("df secrets push/doctor needs GITHUB_TOKEN or GH_TOKEN");
				const [owner, repo] = repoSlug.split("/");
				if (!owner || !repo) throw new Error(`Expected <owner/repo>, got ${repoSlug}`);
				const client = new GitHubClient({ token });
				return { client, repository: new GitHubRepository(client, owner, repo) };
			},
		},
	);
}

export async function main(args = process.argv.slice(2)): Promise<void> {
	if (args[0] === "graph") return graphCommand(args.slice(1));
	const home = defaultDfHome();
	const config = await loadDfConfig(home);
	const providerConfig = await loadProviderConfig(home);
	const registry = new ProviderRegistry(providerConfig);
	const ledger = new LimitLedger(home, {
		fallbackTtlMs: config.cooldownTtlMs,
		persist: (candidate) => candidate.provider !== "faux",
	});
	const store = new FileCredentialStore(
		home,
		localCredentialFallback(home, config, providerConfig),
		(provider, label) => ledger.clearAccount(provider, label),
	);
	const command = args[0];
	switch (command) {
		case "__packaging-smoke":
			return packagingSmoke();
		case "providers":
			return providersCommand(registry);
		case "models":
			return modelsCommand(registry, store, args.slice(1), ledger);
		case "accounts":
			return accountsCommand(store);
		case "limits":
			return limitsCommand(ledger, args.slice(1));
		case "quota":
			return quotaCommand(registry, store, ledger, config, args.slice(1));
		case "route":
			return routeCommand(registry, store, config, args.slice(1));
		case "account":
			if (args[1] === "set") return accountSetCommand(store, args.slice(2));
			if (args[1] === "import") return accountImportCommand(registry, store, args.slice(2));
			if (args[1] === "export") return accountExportCommand(store, args.slice(2));
			if (args[1] === "load") return accountLoadCommand(store, args.slice(2));
			throw new Error(`Unknown account command: ${args[1] ?? ""}`);
		case "login":
			return loginCommand(registry, store, args[1], option(args, "--account"));
		case "logout":
			return logoutCommand(store, args[1], option(args, "--account"));
		case "ask":
			return askCommand(registry, store, config, args.slice(1));
		case "run":
			return runCommand(registry, store, config, args.slice(1));
		case "chat":
			return chatCommand(registry, store, config, args.slice(1));
		case "ci": {
			const exitCode = await runCiCli(args.slice(1));
			if (exitCode !== 0) process.exitCode = exitCode;
			return;
		}
		case "doctor":
			return doctorCommand(args.slice(1));
		case "secrets":
			return secretsCli(home, args.slice(1));
		case "help":
		case "--help":
		case "-h":
			console.log(usage());
			return;
		case undefined:
			return chatCommand(registry, store, config, []);
		default:
			throw new Error(`Unknown command: ${command}\n${usage()}`);
	}
}

export function exitCodeFor(error: unknown): number {
	if (error instanceof ChainExhaustedError) return error.exitCode;
	if (error instanceof RunTimeoutError) return error.exitCode;
	return 1;
}

if (import.meta.main) {
	main().catch((error: unknown) => {
		const message = redactErrorMessage(error);
		const exitCode = exitCodeFor(error);
		if (process.argv.includes("--json"))
			console.log(
				JSON.stringify({
					type: "error",
					message,
					exitCode,
					...(error instanceof ChainExhaustedError ? { reasons: error.reasons, limits: error.limits } : {}),
					...(error instanceof RunTimeoutError
						? {
								kind: "timeout",
								budgetMs: error.budgetMs,
								elapsedMs: error.elapsedMs,
								...(error.sessionId ? { sessionId: error.sessionId } : {}),
							}
						: {}),
				}),
			);
		console.error(message);
		process.exitCode = exitCode;
	});
}
