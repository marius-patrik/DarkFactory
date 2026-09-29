/**
 * Reading `df run --json`.
 *
 * `df` streams one JSON object per line - session, text deltas, tool start and end, failover, step,
 * result and error - and the result event carries no text of its own. The answer is the assistant
 * text streamed *after* the last tool call, so deltas are collected into segments split at every
 * tool event and only the last segment is kept. A run that never touches a tool answers with the
 * whole stream.
 *
 * Keeping this here rather than in the attempt ladder is what lets the ladder treat df like any
 * other harness: the ladder reads an answer, and this is where the event stream becomes one.
 */

/** Environment variables mapped onto `df account set`: variable, df account id, slot. */
export const DF_ACCOUNT_SET_MAP: readonly (readonly [variable: string, account: string, slot: string])[] = [
	["GEMINI_API_KEY", "google:default", "api_key"],
	["GEMINI_API_KEY_2", "google:key2", "api_key"],
	["GEMINI_API_KEY_3", "google:key3", "api_key"],
	["OPENROUTER_API_KEY", "openrouter:default", "api_key"],
	["OPENROUTER_API_KEY_2", "openrouter:acct2", "api_key"],
	["GROQ_API_KEY", "groq:default", "api_key"],
] as const;

/** Subscription logins df loads as df-owned accounts: variable, df account id. */
export const DF_ACCOUNT_LOAD_MAP: readonly (readonly [variable: string, account: string])[] = [
	["DF_ACCOUNT_OPENAI_CODEX", "openai-codex:pipeline"],
	["DF_ACCOUNT_GROK_SUB", "grok-sub:pipeline"],
] as const;

/** `df` exit code: quota was exhausted on every candidate in df's own chain. */
export const DF_EXIT_QUOTA_EXHAUSTED = 2;

/** `df` exit code: every candidate failed to authenticate. */
export const DF_EXIT_AUTH_FAILED = 3;

/** Event kinds that end the current answer segment and begin a new one. */
const SEGMENT_BOUNDARY_TYPES = new Set(["tool_start", "tool_end", "failover"]);

/** One line of the event stream, as far as this module cares. */
interface DfEvent {
	type?: unknown;
	delta?: unknown;
	message?: unknown;
	errorMessage?: unknown;
	stopReason?: unknown;
}

/**
 * Parse one line of the stream, ignoring anything that is not a JSON object.
 *
 * @param line - One line of stdout.
 * @returns The parsed event, or `undefined` for a line that is not an event.
 */
function parseEventLine(line: string): DfEvent | undefined {
	const trimmed = line.trim();
	if (!trimmed.startsWith("{")) return undefined;
	try {
		const parsed: unknown = JSON.parse(trimmed);
		if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return undefined;
		return parsed as DfEvent;
	} catch {
		return undefined;
	}
}

/**
 * Extract the final answer text from a `df run --json` event stream.
 *
 * A new segment starts after each tool call and after an attempt that failed. The closing `step` of
 * a successful turn follows its text and must not clear it, which is why only a `step` that carries
 * an error or an error stop reason ends a segment.
 *
 * @param stdout - Captured standard output of `df run --json`.
 * @returns The final answer text, stripped, or an empty string when no delta was streamed.
 */
export function parseDfJsonOutput(stdout: string): string {
	const segments: string[][] = [[]];
	for (const line of (stdout ?? "").split("\n")) {
		const event = parseEventLine(line);
		if (!event) continue;
		if (event.type === "text_delta") {
			if (typeof event.delta === "string" && event.delta) {
				(segments[segments.length - 1] as string[]).push(event.delta);
			}
			continue;
		}
		if (typeof event.type !== "string") continue;
		if (SEGMENT_BOUNDARY_TYPES.has(event.type)) {
			segments.push([]);
			continue;
		}
		if (event.type === "step" && (event.errorMessage || event.stopReason === "error")) segments.push([]);
	}
	return (segments[segments.length - 1] as string[]).join("").trim();
}

/**
 * Read the error message from a failed `df run --json` invocation.
 *
 * A failing run prints a final `{"type": "error", "message": ...}` line on stdout beside its
 * nonzero exit. That message names the failing candidate and the reason without ever carrying a
 * secret, because df redacts credentials itself, so it is safe to surface.
 *
 * @param stdout - Captured standard output of the failed invocation.
 * @returns The last error event's message, or an empty string when there is none.
 */
export function parseDfErrorMessage(stdout: string): string {
	let message = "";
	for (const line of (stdout ?? "").split("\n")) {
		const event = parseEventLine(line);
		if (event?.type === "error" && typeof event.message === "string") message = event.message;
	}
	return message.trim();
}

/**
 * Build the failure detail for a `df` invocation that exited nonzero.
 *
 * df reports quota and auth through its exit code rather than through stderr wording, so the code
 * is translated into wording here. That keeps the single quota classification deciding everything
 * instead of gaining a second, exit-code-shaped branch beside it.
 *
 * @param input - The failed invocation's exit code, stdout, and already-captured detail.
 * @returns The detail the quota and error paths decide on.
 */
export function dfFailureDetail(input: { exitCode: number; stdout: string; detail: string }): string {
	const parts: string[] = [];
	const message = parseDfErrorMessage(input.stdout);
	if (message) parts.push(message);
	if (input.detail && !message.includes(input.detail)) parts.push(input.detail);
	if (input.exitCode === DF_EXIT_QUOTA_EXHAUSTED) {
		parts.push("df exit code 2: quota exhausted on every candidate in the chain");
	} else if (input.exitCode === DF_EXIT_AUTH_FAILED) {
		parts.push("df exit code 3: authentication failed on every candidate in the chain");
	}
	const detail = parts.join("\n").trim();
	return detail || `df exited ${input.exitCode}`;
}

/**
 * Every secret name the df container setup consumes, in setup order.
 *
 * This is the list a calling workflow must declare and forward. A workflow that omits one does not
 * fail, it silently drops that df account, so the list belongs beside the maps that consume it and
 * nowhere else.
 *
 * @returns The secret variable names, without repeats.
 */
export function dfSetupSecretNames(): string[] {
	const names = [
		...DF_ACCOUNT_SET_MAP.map(([variable]) => variable),
		...DF_ACCOUNT_LOAD_MAP.map(([variable]) => variable),
	];
	return [...new Set(names)];
}
