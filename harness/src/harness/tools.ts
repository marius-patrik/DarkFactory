import { existsSync, realpathSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import type { ExtensionFactory, ToolCallEvent } from "@earendil-works/pi-coding-agent";

/** Options for constructing a {@link ToolPolicy}. */
export interface ToolPolicyOptions {
	/** The working directory that paths must stay within. */
	cwd: string;
	/** Patterns that are allowed; if empty, all non-deny commands/paths are allowed. */
	allow?: readonly string[];
	/** Patterns that are always denied. */
	deny?: readonly string[];
	/** When true, blocks interactive prompts and runs non-interactively. */
	headless?: boolean;
}

/** The result of evaluating a tool call against a {@link ToolPolicy}. */
export interface PolicyDecision {
	/** Whether the tool call is permitted. */
	allowed: boolean;
	/** Explanation for the decision, present when `allowed` is false. */
	reason?: string;
}

type RuleKind = "path" | "command" | "any";

interface Rule {
	kind: RuleKind;
	pattern: RegExp;
	raw: string;
}

function compileRule(value: string): Rule {
	const match = /^(path|command):(.*)$/u.exec(value);
	const kind = (match?.[1] ?? "any") as RuleKind;
	const raw = match?.[2] ?? value;
	if (!raw) throw new Error("Policy rules cannot be empty");
	const source = raw.split("*").map((part) => part.replace(/[\\^$+?.()|[\]{}]/g, "\\$&")).join(".*");
	return { kind, raw: value, pattern: new RegExp(`^${source}$`, "iu") };
}

function inside(root: string, path: string): boolean {
	const normalizedRoot = process.platform === "win32" ? root.toLowerCase() : root;
	const normalizedPath = process.platform === "win32" ? path.toLowerCase() : path;
	const rel = relative(normalizedRoot, normalizedPath);
	return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

function canonicalPath(path: string): string {
	let parent = path;
	const missing: string[] = [];
	while (!existsSync(parent)) {
		const next = dirname(parent);
		if (next === parent) return path;
		missing.unshift(path.slice(next.length).replace(/^[/\\]+/u, ""));
		parent = next;
		path = next;
	}
	return resolve(realpathSync(parent), ...missing);
}

function matches(rules: readonly Rule[], kind: Exclude<RuleKind, "any">, values: readonly string[]): boolean {
	return rules.some((rule) => (rule.kind === "any" || rule.kind === kind) && values.some((value) => rule.pattern.test(value)));
}

function suspiciousCommandPaths(command: string): string[] {
	const tokens = command.match(/(?:[A-Za-z]:[\\/][^\s"']+|~(?:[\\/][^\s"']*)?|\.\.[\\/][^\s"']*|\/(?:[^\s"']+))/gu) ?? [];
	return tokens.map((token) => token.replace(/[;,|&]+$/u, ""));
}

/** Deterministic, non-prompting policy used by pi's tool_call extension hook. */
export class ToolPolicy {
	/** The resolved working directory this policy enforces. */
	readonly cwd: string;
	private readonly canonicalCwd: string;
	private readonly allow: Rule[];
	private readonly deny: Rule[];

	constructor(options: ToolPolicyOptions) {
		this.cwd = resolve(options.cwd);
		this.canonicalCwd = canonicalPath(this.cwd);
		this.allow = (options.allow ?? []).map(compileRule);
		this.deny = (options.deny ?? []).map(compileRule);
	}

	/**
	 * Evaluates a tool call against this policy.
	 * @param event - The tool call event to evaluate.
	 * @returns The policy decision; `allowed: false` with a reason when blocked.
	 */
	evaluate(event: Pick<ToolCallEvent, "toolName" | "input">): PolicyDecision {
		const input = event.input as Record<string, unknown>;
		if (event.toolName === "bash" || event.toolName === "powershell") {
			const command = typeof input.command === "string" ? input.command : "";
			const values = [command, `${event.toolName}:${command}`];
			if (matches(this.deny, "command", values)) return { allowed: false, reason: `Command denied by policy: ${command}` };
			const commandAllow = this.allow.filter((rule) => rule.kind === "command" || rule.kind === "any");
			if (commandAllow.length > 0 && !matches(commandAllow, "command", values)) {
				return { allowed: false, reason: "Command is not included by --allow policy" };
			}
			if (/(?:^|[\s;&|])(?:cd|pushd)\s+(?:["']?(?:\.\.|~|\/|[A-Za-z]:)|\\\.\.)|\$(?:\{)?HOME(?:\})?|%USERPROFILE%/iu.test(command) &&
				!matches(this.allow, "command", values)) {
				return { allowed: false, reason: "Command may escape the workspace" };
			}
			for (const token of suspiciousCommandPaths(command)) {
				const normalized = token.startsWith("~") ? token : resolve(this.cwd, token);
				if ((token.startsWith("~") || !inside(this.cwd, normalized)) && !matches(this.allow, "path", [token, normalized])) {
					return { allowed: false, reason: `Command path escapes workspace: ${token}` };
				}
			}
			return { allowed: true };
		}

		if (["read", "write", "edit", "grep", "find", "ls"].includes(event.toolName)) {
			const raw = typeof input.path === "string" ? input.path : this.cwd;
			const absolute = resolve(this.cwd, raw);
			const canonical = canonicalPath(absolute);
			const values = [raw, absolute, canonical, `${event.toolName}:${raw}`, `${event.toolName}:${absolute}`, `${event.toolName}:${canonical}`];
			if (matches(this.deny, "path", values)) return { allowed: false, reason: `Path denied by policy: ${raw}` };
			if (!inside(this.canonicalCwd, canonical) && !matches(this.allow, "path", values)) {
				return { allowed: false, reason: `Path escapes workspace: ${raw}` };
			}
			return { allowed: true };
		}

		return { allowed: false, reason: `Tool is not enabled by df policy: ${event.toolName}` };
	}
}

/**
 * Creates a pi extension hook that enforces a {@link ToolPolicy} on every tool call.
 * @param policy - The policy to enforce; blocks calls that violate it.
 * @returns An extension factory for pi's tool_call hook.
 */
export function policyExtension(policy: ToolPolicy): ExtensionFactory {
	return (pi) => {
		pi.on("tool_call", (event) => {
			const decision = policy.evaluate(event);
			return decision.allowed ? undefined : { block: true, reason: decision.reason ?? "Blocked by df policy" };
		});
	};
}
