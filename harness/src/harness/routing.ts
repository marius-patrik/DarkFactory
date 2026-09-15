import type { Candidate } from "../failover.ts";
import type { DfConfig } from "../config.ts";

/**
 * Input shape for sensitive data detection hooks.
 * Contains the raw prompt and any tool results that may contain secrets.
 */
export interface SensitiveDataInput {
	/** The user prompt string. */
	prompt: string;
	/** Array of tool result objects (read‑only). */
	toolResults: readonly unknown[];
}

/**
 * Hook interface for detecting sensitive data in a prompt or tool results.
 */
export interface SensitiveDataHook {
	/**
 	 * Determine whether the given input contains sensitive data.
 	 * @param input - The data to inspect.
 	 * @returns `true` if sensitive data is detected, otherwise `false`. May also return a Promise.
 	 */
	detect(input: SensitiveDataInput): boolean | Promise<boolean>;
}

/**
 * Partial routing information for a graph node.
 */
export interface GraphNodeRouting {
	/** Optional explicit chain string (comma‑separated candidates). */
	chain?: string;
	/** Optional explicit model string (single candidate). */
	model?: string;
	/** If set to "hard", forces hard reasoning mode. */
	reasoning?: "hard";
}

/**
 * Input parameters for routing resolution.
 */
export interface RoutingInput {
	/** Prompt text to be routed. */
	prompt: string;
	/** Optional tool results array. */
	toolResults?: readonly unknown[];
	/** Explicit chain provided by the caller (comma‑separated). */
	explicitChain?: string;
	/** Explicit model provided by the caller (single candidate). */
	explicitModel?: string;
	/** Optional hard reasoning flag. */
	reasoning?: "hard";
	/** Optional node routing overrides from the graph. */
	node?: GraphNodeRouting;
	/** Optional custom sensitive data detection hook. */
	sensitiveHook?: SensitiveDataHook;
}

/**
 * Result of routing resolution.
 */
export interface RoutingDecision {
	/** Ordered list of candidates to be used for routing. */
	chain: Candidate[];
	/** Source of the routing decision. */
	source: "explicit" | "graph" | "sensitive" | "hard" | "default";
}

const SECRET_OR_PII = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAIza[0-9A-Za-z_-]{20,}\b|\bsk-[A-Za-z0-9_-]{16,}\b|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}|\b\d{3}-\d{2}-\d{4}\b/iu;

function stringify(value: unknown): string {
	if (typeof value === "string") return value;
	try { return JSON.stringify(value) ?? ""; }
	catch { return String(value); }
}

const EMAIL = /\b[A-Z0-9._%+\[\]-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

/** Commit metadata addresses (GitHub noreply, vendor noreply) identify tools and accounts, not people's inboxes. */
function containsPersonalEmail(text: string): boolean {
	for (const match of text.matchAll(EMAIL)) {
		if (!/noreply/iu.test(match[0])) return true;
	}
	return false;
}

function sensitive(text: string): boolean {
	return SECRET_OR_PII.test(text) || containsPersonalEmail(text);
}

/**
 * Default implementation of {@link SensitiveDataHook} that detects secrets and personal email.
 */
export const defaultSensitiveDataHook: SensitiveDataHook = {
	detect({ prompt, toolResults }) {
		return sensitive(prompt) || toolResults.some((result) => sensitive(stringify(result)));
	},
};

/**
 * Parse a candidate string of the form `provider/model@account`.
 *
 * @param value - The candidate string to parse.
 * @throws `Error` if the string is malformed.
 * @returns An object containing `provider`, `model`, and `account`.
 */
export function parseCandidate(value: string): Candidate {
	const slash = value.indexOf("/");
	if (slash <= 0 || slash === value.length - 1) throw new Error(`Invalid chain candidate: ${value}`);
	const provider = value.slice(0, slash);
	const modelAndAccount = value.slice(slash + 1);
	const at = modelAndAccount.lastIndexOf("@");
	const model = at < 0 ? modelAndAccount : modelAndAccount.slice(0, at);
	const account = at < 0 ? "default" : modelAndAccount.slice(at + 1);
	if (!model || !account) throw new Error(`Invalid chain candidate: ${value}`);
	return { provider, model, account };
}

/**
 * Parse a comma‑separated list of candidate strings into an array of {@link Candidate}.
 *
 * @param value - The comma‑separated candidate list.
 * @throws `Error` if the resulting chain is empty.
 * @returns Array of parsed candidates.
 */
export function parseChain(value: string): Candidate[] {
	const chain = value.split(",").map((entry) => entry.trim()).filter(Boolean).map(parseCandidate);
	if (chain.length === 0) throw new Error("Failover chain is empty");
	return chain;
}

/**
 * Resolve routing based on explicit inputs, graph defaults, and sensitivity policies.
 *
 * @param config - Global DF configuration containing default chains.
 * @param input - Routing input describing prompts, tool results, and overrides.
 * @returns A {@link RoutingDecision} describing the chosen chain and its source.
 * @throws `Error` if parsing of any chain fails.
 */
export async function resolveRouting(config: DfConfig, input: RoutingInput): Promise<RoutingDecision> {
	const explicit = input.explicitChain ?? input.explicitModel;
	if (explicit) return { chain: parseChain(explicit), source: "explicit" };
	const graph = input.node?.chain ?? input.node?.model;
	if (graph) return { chain: parseChain(graph), source: "graph" };
	const sensitive = await (input.sensitiveHook ?? defaultSensitiveDataHook).detect({
		prompt: input.prompt,
		toolResults: input.toolResults ?? [],
	});
	if (sensitive && config.sensitiveChain) return { chain: parseChain(config.sensitiveChain), source: "sensitive" };
	if ((input.reasoning === "hard" || input.node?.reasoning === "hard") && config.hardReasoningChain) {
		return { chain: parseChain(config.hardReasoningChain), source: "hard" };
	}
	return { chain: parseChain(config.defaultChain), source: "default" };
}
