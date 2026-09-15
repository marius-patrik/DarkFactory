import type { DfConfig } from "../config.ts";
import type { Candidate } from "../failover.ts";

export interface SensitiveDataInput {
	prompt: string;
	toolResults: readonly unknown[];
}

export interface SensitiveDataHook {
	detect(input: SensitiveDataInput): boolean | Promise<boolean>;
}

export interface GraphNodeRouting {
	chain?: string;
	model?: string;
	reasoning?: "hard";
}

export interface RoutingInput {
	prompt: string;
	toolResults?: readonly unknown[];
	explicitChain?: string;
	explicitModel?: string;
	reasoning?: "hard";
	node?: GraphNodeRouting;
	sensitiveHook?: SensitiveDataHook;
}

export interface RoutingDecision {
	chain: Candidate[];
	source: "explicit" | "graph" | "sensitive" | "hard" | "default";
}

const SECRET_OR_PII =
	/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bAIza[0-9A-Za-z_-]{20,}\b|\bsk-[A-Za-z0-9_-]{16,}\b|\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b|\b(?:api[_ -]?key|access[_ -]?token|refresh[_ -]?token|password|secret)\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{8,}|\b\d{3}-\d{2}-\d{4}\b/iu;

function stringify(value: unknown): string {
	if (typeof value === "string") return value;
	try {
		return JSON.stringify(value) ?? "";
	} catch {
		return String(value);
	}
}

const EMAIL = /\b[A-Z0-9._%+[\]-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;

/** Commit metadata addresses (GitHub noreply, vendor noreply) identify tools and accounts, not people's inboxes. */
/** Domains reserved for documentation and tests (RFC 2606, RFC 6761): no address there belongs to a person. */
const RESERVED_EMAIL_DOMAIN = /@(?:[a-z0-9-]+\.)*(?:example\.(?:com|net|org)|example|invalid|test|localhost)$/iu;

function containsPersonalEmail(text: string): boolean {
	for (const match of text.matchAll(EMAIL)) {
		if (!/noreply/iu.test(match[0]) && !RESERVED_EMAIL_DOMAIN.test(match[0])) return true;
	}
	return false;
}

function sensitive(text: string): boolean {
	return SECRET_OR_PII.test(text) || containsPersonalEmail(text);
}

export const defaultSensitiveDataHook: SensitiveDataHook = {
	detect({ prompt, toolResults }) {
		return sensitive(prompt) || toolResults.some((result) => sensitive(stringify(result)));
	},
};

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

export function parseChain(value: string): Candidate[] {
	const chain = value
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map(parseCandidate);
	if (chain.length === 0) throw new Error("Failover chain is empty");
	return chain;
}

/** Explicit caller/node intent is authoritative; policy only chooses when neither supplied a route. */
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
