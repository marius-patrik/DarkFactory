import { defaultSensitiveDataHook } from "../harness/routing.ts";
import type { NeedDiagnostic, RouterConfig, RouterInput, TaskKind, TaskNeed, TaskProfile, TaskSize } from "./types.ts";

export type CheapClassifier = (prompt: string, candidate: string) => Promise<TaskKind>;

const DIRECT_ARTIFACT_RULES: Array<[TaskKind, RegExp]> = [
	["image", /\b(?:generate|create|edit|draw|render|produce)\b.{0,32}\b(?:image|illustration|photo|sprite|texture)\b/iu],
	["video", /\b(?:generate|create|edit|render|produce)\b.{0,32}\b(?:video|animation|clip|movie)\b/iu],
];

const ENGINEERING_CONTEXT =
	/\b(?:implement|code|develop|refactor|document|write tests?|unit tests?|integration tests?|review|audit|fix|debug|repair|regression|bug|provider|router|routing|API|SDK|support|capabilit(?:y|ies)|pipeline|workflow)\b/iu;

const KIND_RULES: Array<[TaskKind, RegExp]> = [
	["fix", /\b(?:fix|debug|repair|regression|bug|failing test|root cause)\b/iu],
	["review", /\b(?:review|audit|inspect|critique|race condition|security scan)\b/iu],
	["implement", /\b(?:implement|build|add|create|code|develop|refactor|change|document|write|test)\b/iu],
	["plan", /\b(?:plan|design|architect|proposal|roadmap)\b/iu],
	["summarize", /\b(?:summari[sz]e|digest|tl;?dr|condense)\b/iu],
	["classify", /\b(?:classify|categorize|label|route this)\b/iu],
];

function uniqueNeeds(needs: readonly TaskNeed[]): TaskNeed[] {
	const order: TaskNeed[] = ["tools", "vision", "long_context", "reasoning", "image_gen", "video_gen"];
	return order.filter((need) => needs.includes(need));
}

/** Infers capabilities from the current pipeline step rather than feature vocabulary. */
function inferNeeds(
	kind: TaskKind,
	explicitNeeds: readonly TaskNeed[],
): { needs: TaskNeed[]; diagnostics: NeedDiagnostic[] } {
	const needs = new Set(explicitNeeds);
	const diagnostics: NeedDiagnostic[] = [];
	for (const need of explicitNeeds) diagnostics.push({ need, reason: "explicitly requested via node or flags" });
	if (["plan", "implement", "review", "fix"].includes(kind) && !needs.has("reasoning")) {
		needs.add("reasoning");
		diagnostics.push({ need: "reasoning", reason: `stage '${kind}' defaults to reasoning-heavy model` });
	}
	if (["implement", "fix"].includes(kind) && !needs.has("tools")) {
		needs.add("tools");
		diagnostics.push({ need: "tools", reason: `stage '${kind}' requires tool access` });
	}
	if (kind === "image" && !needs.has("image_gen")) {
		needs.add("image_gen");
		diagnostics.push({ need: "image_gen", reason: "step directly requests image artifact production" });
	}
	if (kind === "video" && !needs.has("video_gen")) {
		needs.add("video_gen");
		diagnostics.push({ need: "video_gen", reason: "step directly requests video artifact production" });
	}
	return { needs: uniqueNeeds([...needs]), diagnostics };
}

function inferKind(prompt: string): { kind: TaskKind; ambiguous: boolean } {
	if (!ENGINEERING_CONTEXT.test(prompt)) {
		for (const [kind, pattern] of DIRECT_ARTIFACT_RULES) {
			if (pattern.test(prompt)) return { kind, ambiguous: false };
		}
	}
	const hits = KIND_RULES.filter(([, pattern]) => pattern.test(prompt));
	const first = hits[0];
	if (hits.length === 1 && first) return { kind: first[0], ambiguous: false };
	if (hits.length > 1 && first) return { kind: first[0], ambiguous: true };
	return {
		kind: "chat",
		ambiguous: !/^(?:hi|hello|hey|thanks|thank you|what|who|when|where|why|how)\b/iu.test(prompt.trim()),
	};
}

function sizeFor(tokens: number, promptLength: number): TaskSize {
	if (tokens >= 64_000 || promptLength >= 20_000) return "large";
	if (tokens >= 8_000 || promptLength >= 4_000) return "medium";
	return "small";
}

export async function classifyTask(
	input: RouterInput,
	config: Pick<RouterConfig, "classifier"> = {},
	classify?: CheapClassifier,
): Promise<TaskProfile> {
	const promptTokens = Math.ceil(input.prompt.length / 4);
	const attachedTokens = (input.attachedFiles ?? []).reduce(
		(total, file) => total + (file.tokens ?? Math.ceil((file.text?.length ?? 0) / 4)),
		0,
	);
	const contextTokens = promptTokens + attachedTokens;
	const inferred = inferKind(input.prompt);
	const declaredKind = input.flags?.kind ?? input.node?.kind;
	const detected = await defaultSensitiveDataHook.detect({
		prompt: input.prompt,
		toolResults: input.toolResults ?? [],
	});
	const sensitivity = input.flags?.sensitivity ?? input.node?.sensitivity ?? (detected ? "sensitive" : "normal");
	const kind =
		declaredKind ??
		(sensitivity === "normal" && inferred.ambiguous && config.classifier && classify
			? await classify(input.prompt, config.classifier)
			: inferred.kind);
	const size = input.flags?.size ?? input.node?.size ?? sizeFor(contextTokens, input.prompt.length);
	const { needs: baseNeeds, diagnostics } = inferNeeds(kind, [
		...(input.node?.needs ?? []),
		...(input.flags?.needs ?? []),
	]);
	const needs = [...baseNeeds];
	if ((input.attachedFiles ?? []).some((file) => file.modality === "image") && !needs.includes("vision")) {
		needs.push("vision");
		diagnostics.push({ need: "vision", reason: "attached image files require vision capability" });
	}
	if (contextTokens >= 64_000 && !needs.includes("long_context")) {
		needs.push("long_context");
		diagnostics.push({ need: "long_context", reason: `context tokens (${contextTokens}) exceed 64k threshold` });
	}
	if ((input.reasoning === "hard" || input.node?.reasoning === "hard") && !needs.includes("reasoning")) {
		needs.push("reasoning");
		diagnostics.push({ need: "reasoning", reason: "explicit hard reasoning requested" });
	}
	return { kind, size, needs: uniqueNeeds(needs), diagnostics, sensitivity, contextTokens };
}
