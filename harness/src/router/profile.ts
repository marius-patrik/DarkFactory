import { defaultSensitiveDataHook } from "../harness/routing.ts";
import type { RouterConfig, RouterInput, TaskKind, TaskNeed, TaskProfile, TaskSize } from "./types.ts";

export type CheapClassifier = (prompt: string, candidate: string) => Promise<TaskKind>;

const DIRECT_ARTIFACT_RULES: Array<[TaskKind, RegExp, string]> = [
	[
		"image",
		/\b(?:generate|create|edit|draw|render|produce)\b.{0,48}\b(?:image|illustration|photo|sprite|texture)\b/iu,
		"direct image artifact production intent",
	],
	[
		"video",
		/\b(?:generate|create|edit|render|produce)\b.{0,48}\b(?:video|animation|clip|movie)\b/iu,
		"direct video artifact production intent",
	],
];

const ENGINEERING_STAGE_INTENT =
	/^\s*(?:(?:please|kindly)\s+|(?:(?:can|could|would|will)\s+you\s+))?(?:implement|build|add|code|develop|refactor|change|fix|debug|repair|review|audit|inspect|critique|test|write\s+tests?|document|summari[sz]e|plan|design|architect)\b/iu;

const KIND_RULES: Array<[TaskKind, RegExp, string]> = [
	["fix", /\b(?:fix|debug|repair|regression|bug|failing test|root cause)\b/iu, "fix/debugging intent"],
	["review", /\b(?:review|audit|inspect|critique|race condition|security scan)\b/iu, "review/audit intent"],
	[
		"implement",
		/\b(?:implement|build|add|create|code|develop|refactor|change|write tests?|test)\b/iu,
		"implementation/change intent",
	],
	["plan", /\b(?:plan|design|architect|proposal|roadmap)\b/iu, "planning/design intent"],
	["summarize", /\b(?:summari[sz]e|digest|tl;?dr|condense|document)\b/iu, "summary/documentation intent"],
	["classify", /\b(?:classify|categorize|label|route this)\b/iu, "classification/routing intent"],
];

interface KindInference {
	kind: TaskKind;
	ambiguous: boolean;
	reason: string;
	directArtifact: boolean;
}

interface ClassifiedTask {
	profile: TaskProfile;
	details: string[];
}

function uniqueNeeds(needs: readonly TaskNeed[]): TaskNeed[] {
	const order: TaskNeed[] = ["tools", "vision", "long_context", "reasoning", "image_gen", "video_gen"];
	return order.filter((need) => needs.includes(need));
}

function inferKind(prompt: string): KindInference {
	const engineeringStage = ENGINEERING_STAGE_INTENT.test(prompt);
	if (!engineeringStage) {
		for (const [kind, pattern, reason] of DIRECT_ARTIFACT_RULES) {
			if (pattern.test(prompt)) return { kind, ambiguous: false, reason, directArtifact: true };
		}
	}

	const hits = KIND_RULES.filter(([, pattern]) => pattern.test(prompt));
	const first = hits[0];
	if (hits.length === 1 && first) {
		return { kind: first[0], ambiguous: false, reason: first[2], directArtifact: false };
	}
	if (hits.length > 1 && first) {
		return {
			kind: first[0],
			ambiguous: true,
			reason: `${first[2]}; prompt also matched ${hits
				.slice(1)
				.map(([kind]) => kind)
				.join(", ")}`,
			directArtifact: false,
		};
	}
	return {
		kind: "chat",
		ambiguous: !/^(?:hi|hello|hey|thanks|thank you|what|who|when|where|why|how)\b/iu.test(prompt.trim()),
		reason: engineeringStage
			? "engineering-stage wording suppresses quoted/subject-only artifact vocabulary"
			: "no specialized or engineering intent matched",
		directArtifact: false,
	};
}

function sizeFor(tokens: number, promptLength: number): TaskSize {
	if (tokens >= 64_000 || promptLength >= 20_000) return "large";
	if (tokens >= 8_000 || promptLength >= 4_000) return "medium";
	return "small";
}

/**
 * Classifies a routing task while retaining human-readable inference details for route diagnostics.
 *
 * The returned TaskProfile shape remains stable; diagnostics are carried separately and are consumed
 * by the router's existing candidate-detail surface.
 */
export async function classifyTaskWithDiagnostics(
	input: RouterInput,
	config: Pick<RouterConfig, "classifier"> = {},
	classify?: CheapClassifier,
): Promise<ClassifiedTask> {
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

	let kind: TaskKind;
	let kindDetail: string;
	if (declaredKind) {
		kind = declaredKind;
		kindDetail = `kind '${kind}' declared by pipeline/node/flags; prompt subject vocabulary cannot override stage semantics`;
	} else if (inferred.directArtifact) {
		kind = inferred.kind;
		kindDetail = `kind '${kind}' inferred from ${inferred.reason}; optional classifier is not consulted`;
	} else if (sensitivity === "normal" && inferred.ambiguous && config.classifier && classify) {
		kind = await classify(input.prompt, config.classifier);
		kindDetail = `kind '${kind}' selected by optional classifier after ambiguous heuristic inference (${inferred.reason})`;
	} else {
		kind = inferred.kind;
		kindDetail = `kind '${kind}' inferred from ${inferred.reason}`;
	}

	const size = input.flags?.size ?? input.node?.size ?? sizeFor(contextTokens, input.prompt.length);
	const explicitNeeds = [...(input.node?.needs ?? []), ...(input.flags?.needs ?? [])];
	const needs: TaskNeed[] = [...explicitNeeds];
	const needDetails: string[] = explicitNeeds.map((need) => `need '${need}' explicitly declared by node/flags`);

	if ((input.attachedFiles ?? []).some((file) => file.modality === "image")) {
		needs.push("vision");
		needDetails.push("need 'vision' inferred from attached image input");
	}
	if (contextTokens >= 64_000) {
		needs.push("long_context");
		needDetails.push(`need 'long_context' inferred from ${contextTokens} context tokens`);
	}
	if (
		["plan", "implement", "review", "fix"].includes(kind) ||
		input.reasoning === "hard" ||
		input.node?.reasoning === "hard"
	) {
		needs.push("reasoning");
		needDetails.push(`need 'reasoning' inferred from ${kind} stage semantics`);
	}
	if (["implement", "fix"].includes(kind)) {
		needs.push("tools");
		needDetails.push(`need 'tools' inferred from ${kind} stage semantics`);
	}
	if (kind === "image") {
		needs.push("image_gen");
		needDetails.push("need 'image_gen' inferred only because this step directly produces an image artifact");
	}
	if (kind === "video") {
		needs.push("video_gen");
		needDetails.push("need 'video_gen' inferred only because this step directly produces a video artifact");
	}

	const profile: TaskProfile = {
		kind,
		size,
		needs: uniqueNeeds(needs),
		sensitivity,
		contextTokens,
	};
	return {
		profile,
		details: [kindDetail, ...needDetails.filter((detail, index, all) => all.indexOf(detail) === index)],
	};
}

export async function classifyTask(
	input: RouterInput,
	config: Pick<RouterConfig, "classifier"> = {},
	classify?: CheapClassifier,
): Promise<TaskProfile> {
	return (await classifyTaskWithDiagnostics(input, config, classify)).profile;
}
