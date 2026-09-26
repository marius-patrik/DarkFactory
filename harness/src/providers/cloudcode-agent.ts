import type {
	AssistantMessage,
	Context,
	Model,
	ProviderHeaders,
	ProviderResponse,
	StreamFunction,
	TextContent,
	Usage,
} from "@earendil-works/pi-ai";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai/utils/event-stream";
import type { ProviderConfig } from "./schema.ts";

function contentText(content: Context["messages"][number]["content"]): string {
	return typeof content === "string"
		? content
		: content.map((part) => (part.type === "text" ? part.text : `[${part.type}]`)).join("");
}
function serialize(context: Context): { userMessage: string; history?: Array<{ content: string }> } {
	let userIndex = -1;
	for (let index = context.messages.length - 1; index >= 0; index--)
		if (context.messages[index]?.role === "user") {
			userIndex = index;
			break;
		}
	if (userIndex < 0) throw new Error("cloudcode-agent requires a user message");
	// Bound because `noUncheckedIndexedAccess` keeps the indexed element possibly-undefined; the
	// `userIndex < 0` guard above does not narrow it.
	const userEntry = context.messages[userIndex];
	if (!userEntry) throw new Error("cloudcode-agent requires a user message");
	const userMessage = contentText(userEntry.content);
	if (!userMessage) throw new Error("cloudcode-agent requires a non-empty user message");
	const history = context.messages.flatMap((message, index) =>
		index === userIndex ? [] : [{ content: `[${message.role}]\n${contentText(message.content)}` }],
	);
	if (context.systemPrompt) history.unshift({ content: `[system]\n${context.systemPrompt}` });
	return { userMessage, ...(history.length ? { history } : {}) };
}
function requestHeaders(
	input: ProviderHeaders | undefined,
	config: ProviderConfig,
): { headers: Record<string, string>; project?: string } {
	const headers: Record<string, string> = {};
	let project: string | undefined;
	for (const [name, value] of Object.entries(input ?? {})) {
		if (name.toLowerCase() === config.request?.projectSlot?.toLowerCase()) project = value ?? undefined;
		else if (value !== null) headers[name] = value;
	}
	if (config.request?.projectSlot && !project) throw new Error(`Missing ${config.request.projectSlot} account slot`);
	return { headers, ...(project ? { project } : {}) };
}
const ZERO_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 };

export function cloudcodeAgentApi(config: ProviderConfig): {
	stream: StreamFunction<any>;
	streamSimple: StreamFunction<any>;
} {
	const stream: StreamFunction<any> = (model, context, options = {}) => {
		const events = createAssistantMessageEventStream();
		void (async () => {
			const output: AssistantMessage = {
				role: "assistant",
				content: [],
				api: model.api,
				provider: model.provider,
				model: model.id,
				usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: ZERO_COST },
				stopReason: "pending",
				timestamp: Date.now(),
			};
			try {
				const prepared = requestHeaders(options.headers, config);
				let payload: unknown = { ...(prepared.project ? { project: prepared.project } : {}), ...serialize(context) };
				payload = (await options.onPayload?.(payload, model)) ?? payload;
				const response = await (options.fetch ?? globalThis.fetch)(`${config.baseUrl}${config.request?.path ?? ""}`, {
					method: "POST",
					headers: { "content-type": "application/json", accept: "application/json", ...prepared.headers },
					body: JSON.stringify(payload),
					signal: options.signal,
					redirect: "error",
				});
				const observed: ProviderResponse = {
					status: response.status,
					headers: Object.fromEntries(response.headers.entries()),
				};
				await options.onResponse?.(observed, model as Model<string>);
				const raw = await response.text();
				if (!response.ok) {
					const error = new Error(
						`cloudcode-agent request failed (HTTP ${response.status}): ${raw.slice(0, 4096)}`,
					) as Error & { status: number; headers: Record<string, string> };
					error.status = response.status;
					error.headers = observed.headers;
					throw error;
				}
				let value: unknown;
				try {
					value = JSON.parse(raw);
				} catch {
					throw new Error("cloudcode-agent response was not valid JSON");
				}
				if (!Array.isArray(value)) throw new Error("cloudcode-agent response was not an array");
				const chunks = value as Array<Record<string, any>>;
				const text = chunks.map((chunk) => (typeof chunk.markdown === "string" ? chunk.markdown : "")).join("");
				if (!text) throw new Error("cloudcode-agent returned no text");
				const usage =
					chunks
						.map((chunk) => chunk.usageMetadata)
						.filter(Boolean)
						.at(-1) ?? {};
				const out = Number(usage.candidatesTokenCount) || 0;
				const total = Number(usage.totalTokenCount) || out;
				output.usage = {
					input: Math.max(0, total - out),
					output: out,
					cacheRead: 0,
					cacheWrite: 0,
					totalTokens: total,
					cost: ZERO_COST,
				} satisfies Usage;
				const block: TextContent = { type: "text", text: "" };
				output.content.push(block);
				events.push({ type: "start", partial: output });
				events.push({ type: "text_start", contentIndex: 0, partial: output });
				block.text = text;
				events.push({ type: "text_delta", contentIndex: 0, delta: text, partial: output });
				events.push({ type: "text_end", contentIndex: 0, content: text, partial: output });
				output.stopReason = "stop";
				events.push({ type: "done", reason: "stop", message: output });
				events.end();
			} catch (error) {
				output.stopReason = options.signal?.aborted ? "aborted" : "error";
				output.errorMessage = error instanceof Error ? error.message : String(error);
				events.push({ type: "error", reason: output.stopReason, error: output });
				events.end();
			}
		})();
		return events;
	};
	return { stream, streamSimple: stream };
}
