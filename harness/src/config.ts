import { readFile } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";
import type { Credential } from "@earendil-works/pi-ai";
import type { CredentialFallback } from "./credentials.ts";
import type { ProviderConfigFile } from "./providers/schema.ts";

// Free-tier Gemini models that returned 200 on the AI Studio key (probed 2026-09-13; ~20 requests/day each), then keyless/free providers.
export const DEFAULT_CHAIN = "google/gemini-3.8-flash@default,google/gemini-3.7-flash@default,google/gemini-3.6-flash@default,google/gemini-3.5-flash@default,google/gemini-3-flash-preview@default,google/gemini-3.5-flash-lite@default,google/gemini-3.1-flash-lite@default,opencode-zen/big-pickle@default,openai-codex/gpt-5.6-luna@default,grok-sub/grok-4.6@default,kimi-coding/kimi-for-coding@default,groq/llama-3.3-70b-versatile@default,cerebras/llama-3.3-70b@default";

export interface DfConfig {
	defaultChain: string;
	cooldownTtlMs?: number;
	maxWaitMs?: number;
	hardReasoningChain?: string;
	sensitiveChain?: string;
	credentialFiles?: Record<string, string>;
}

export type ConfigReader = (path: string) => Promise<string>;

function optionalString(record: Record<string, unknown>, name: string): string | undefined {
	const value = record[name];
	if (value === undefined) return undefined;
	if (typeof value !== "string" || !value.trim()) throw new Error(`config.json ${name} must be a non-empty string`);
	return value.trim();
}

export async function loadDfConfig(home: string, reader: ConfigReader = (path) => readFile(path, "utf8")): Promise<DfConfig> {
	const path = join(home, "config.json");
	let raw: string;
	try {
		raw = await reader(path);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === "ENOENT") return { defaultChain: DEFAULT_CHAIN };
		throw error;
	}
	let value: unknown;
	try { value = JSON.parse(raw) as unknown; }
	catch { throw new Error("Invalid $DF_HOME/config.json JSON"); }
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid $DF_HOME/config.json");
	const record = value as Record<string, unknown>;
	const hardReasoningChain = optionalString(record, "hardReasoningChain");
	const sensitiveChain = optionalString(record, "sensitiveChain");
	const cooldownTtlMs = record.cooldownTtlMs;
	if (cooldownTtlMs !== undefined && (typeof cooldownTtlMs !== "number" || !Number.isSafeInteger(cooldownTtlMs) || cooldownTtlMs <= 0)) {
		throw new Error("config.json cooldownTtlMs must be a positive integer");
	}
	const maxWaitMs = record.maxWaitMs;
	if (maxWaitMs !== undefined && (typeof maxWaitMs !== "number" || !Number.isSafeInteger(maxWaitMs) || maxWaitMs <= 0)) {
		throw new Error("config.json maxWaitMs must be a positive integer");
	}
	let credentialFiles: Record<string, string> | undefined;
	if (record.credentialFiles !== undefined) {
		if (!record.credentialFiles || typeof record.credentialFiles !== "object" || Array.isArray(record.credentialFiles)) throw new Error("config.json credentialFiles must be an object");
		credentialFiles = {};
		for (const [account, path] of Object.entries(record.credentialFiles as Record<string, unknown>)) credentialFiles[account] = optionalString({ path }, "path")!;
	}
	return {
		defaultChain: optionalString(record, "defaultChain") ?? DEFAULT_CHAIN,
		...(hardReasoningChain ? { hardReasoningChain } : {}),
		...(sensitiveChain ? { sensitiveChain } : {}),
		...(typeof cooldownTtlMs === "number" ? { cooldownTtlMs } : {}),
		...(typeof maxWaitMs === "number" ? { maxWaitMs } : {}),
		...(credentialFiles ? { credentialFiles } : {}),
	};
}

export function localCredentialFallback(
	home: string,
	config: DfConfig,
	providers: ProviderConfigFile,
	options: { env?: Readonly<Record<string, string | undefined>>; read?: ConfigReader } = {},
): CredentialFallback {
	const env = options.env ?? process.env;
	const reader = options.read ?? ((path: string) => readFile(path, "utf8"));
	return async (provider, label) => {
		const apiKey = providers.providers.find((entry) => entry.id === provider)?.auth.find((entry) => entry.kind === "api_key");
		if (label === "default") {
			for (const name of apiKey?.env ?? []) {
				const value = env[name]?.trim();
				if (value) return { type: "api_key", key: value };
			}
		}
		const configured = config.credentialFiles?.[`${provider}:${label}`];
		if (!configured) return undefined;
		const path = isAbsolute(configured) ? configured : resolve(home, configured);
		let key: string;
		try { key = (await reader(path)).trim(); }
		catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Credential file does not exist: ${path}`);
			throw error;
		}
		if (!key) throw new Error(`Credential file is empty: ${path}`);
		return { type: "api_key", key };
	};
}
