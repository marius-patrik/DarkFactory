import { defaultSensitiveDataHook } from "../harness/routing.ts";
import type { RouterConfig, RouterInput, TaskKind, TaskNeed, TaskProfile, TaskSize } from "./types.ts";

/**
 * A lightweight classifier that determines the task kind from a prompt.
 * It returns a {@link TaskKind} promise for the given prompt and candidate model.
 */
export type CheapClassifier = (prompt: string, candidate: string) => Promise<TaskKind>;

const KIND_RULES: Array<[TaskKind, RegExp]> = [
	["image", /\b(?:generate|create|edit|draw|render)\b.{0,32}\b(?:image|illustration|photo|sprite|texture)\b|\bimage generation\b/iu],
	["video", /\b(?:generate|create|edit|render)\b.{0,32}\b(?:video|animation|clip|movie)\b|\bvideo generation\b/iu],
	["fix", /\b(?:fix|debug|repair|regression|bug|failing test|root cause)\b/iu],
	["review", /\b(?:review|audit|inspect|critique|race condition|security scan)\b/iu],
	["implement", /\b(?:implement|build|add|create|code|develop|refactor|change)\b/iu],
	["plan", /\b(?:plan|design|architect|proposal|roadmap)\b/iu],
	["summarize", /\b(?:summari[sz]e|digest|tl;?dr|condense)\b/iu],
	["classify", /\b(?:classify|categorize|label|route this)\b/iu],
];

function uniqueNeeds(needs: readonly TaskNeed[]): TaskNeed[] {
	const order: TaskNeed[] = ["tools", "vision", "long_context", "reasoning", "image_gen", "video_gen"];
	return order.filter((need) => needs.includes(need));
}

function inferKind(prompt: string): { kind: TaskKind; ambiguous: boolean } {
	const hits = KIND_RULES.filter(([, pattern]) => pattern.test(prompt));
	if (hits.length === 1) return { kind: hits[0]![0], ambiguous: false };
	if (hits.length > 1) return { kind: hits[0]![0], ambiguous: true };
	return { kind: "chat", ambiguous: !/^(?:hi|hello|hey|thanks|thank you|what|who|when|where|why|how)\b/iu.test(prompt.trim()) };
}

function sizeFor(tokens: number, promptLength: number): TaskSize {
	if (tokens >= 64_000 || promptLength >= 20_000) return "large";
	if (tokens >= 8_000 || promptLength >= 4_000) return "medium";
	return "small";
}

/**
 * Classifies a routing task based on the input prompt, attached files, and configuration.
 *
 * @param input - The router input containing the prompt and optional files.
 * @param config - Optional router configuration with a custom classifier.
 * @param classify - Optional cheap classifier override used when the default inference is ambiguous.
 * @returns A {@link TaskProfile} describing the inferred kind, size, needed capabilities, and sensitivity.
 */
export async function classifyTask(input: RouterInput, config: Pick<RouterConfig, "classifier"> = {}, classify?: CheapClassifier): Promise<TaskProfile> {
	const promptTokens = Math.ceil(input.prompt.length / 4);
	const attachedTokens = (input.attachedFiles ?? []).reduce((total, file) => total + (file.tokens ?? Math.ceil((file.text?.length ?? 0) / 4)), 0);
	const contextTokens = promptTokens + attachedTokens;
	const inferred = inferKind(input.prompt);
	const declaredKind = input.flags?.kind ?? input.node?.kind;
	const detected = await defaultSensitiveDataHook.detect({ prompt: input.prompt, toolResults: input.toolResults ?? [] });
	const sensitivity = input.flags?.sensitivity ?? input.node?.sensitivity ?? (detected ? "sensitive" : "normal");
	const kind = declaredKind ?? (sensitivity === "normal" && inferred.ambiguous && config.classifier && classify ? await classify(input.prompt, config.classifier) : inferred.kind);
	const size = input.flags?.size ?? input.node?.size ?? sizeFor(contextTokens, input.prompt.length);
	const needs: TaskNeed[] = [...(input.node?.needs ?? []), ...(input.flags?.needs ?? [])];
	if ((input.attachedFiles ?? []).some((file) => file.modality === "image")) needs.push("vision");
	if (contextTokens >= 64_000) needs.push("long_context");
	if (["plan", "implement", "review", "fix"].includes(kind) || input.reasoning === "hard" || input.node?.reasoning === "hard") needs.push("reasoning");
	if (["implement", "fix"].includes(kind)) needs.push("tools");
	if (kind === "image") needs.push("image_gen");
	if (kind === "video") needs.push("video_gen");
	return { kind, size, needs: uniqueNeeds(needs), sensitivity, contextTokens };
}
