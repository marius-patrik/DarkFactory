import { createHash } from "node:crypto";
import type {
	ReviewFinding,
	ReviewIterationRecord,
	ReviewRuntimeState,
	ReviewSubject,
} from "../../../packages/protocol/src/review.ts";

function canonical(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
		.join(",")}}`;
}

export function contextFingerprint(context: unknown): string {
	return createHash("sha256").update(canonical(context)).digest("hex");
}

function findingId(subject: ReviewSubject, value: Omit<ReviewFinding, "id">): string {
	return `${subject}-${createHash("sha256").update(canonical(value)).digest("hex").slice(0, 16)}`;
}

function normalizeFinding(subject: ReviewSubject, value: unknown): ReviewFinding | undefined {
	if (typeof value === "string") {
		const message = value.trim();
		if (!message) return undefined;
		const base = { category: "review", severity: "error" as const, message };
		return { id: findingId(subject, base), ...base };
	}
	if (!value || typeof value !== "object") return undefined;
	const item = value as Record<string, unknown>;
	const message = typeof item.message === "string" ? item.message.trim() : "";
	if (!message) return undefined;
	const severity =
		item.severity === "info" || item.severity === "warning" || item.severity === "error" ? item.severity : "error";
	const base: Omit<ReviewFinding, "id"> = {
		category: typeof item.category === "string" && item.category.trim() ? item.category.trim() : "review",
		severity,
		message,
		...(typeof item.evidence === "string" && item.evidence.trim() ? { evidence: item.evidence.trim() } : {}),
		...(typeof item.location === "string" && item.location.trim() ? { location: item.location.trim() } : {}),
		...(typeof item.remediation === "string" && item.remediation.trim()
			? { remediation: item.remediation.trim() }
			: {}),
	};
	return {
		id: typeof item.id === "string" && item.id.trim() ? item.id.trim() : findingId(subject, base),
		...base,
	};
}

export function normalizeReviewFindings(subject: ReviewSubject, value: unknown): ReviewFinding[] {
	const raw = Array.isArray(value)
		? value
		: value && typeof value === "object" && Array.isArray((value as { findings?: unknown }).findings)
			? ((value as { findings: unknown[] }).findings ?? [])
			: value == null || value === false
				? []
				: [value];
	const unique = new Map<string, ReviewFinding>();
	for (const item of raw) {
		const finding = normalizeFinding(subject, item);
		if (finding) unique.set(finding.id, finding);
	}
	return [...unique.values()];
}

export interface ReviewSubjectAdapter {
	subject: ReviewSubject;
	validate(context: unknown, artifact: unknown): ReviewFinding[];
}

export function prepareReviewState(
	subject: ReviewSubject,
	context: unknown,
	previous?: ReviewRuntimeState,
): ReviewRuntimeState {
	const fingerprint = contextFingerprint(context);
	if (previous?.contextFingerprint === fingerprint) return previous;
	return {
		subject,
		contextFingerprint: fingerprint,
		findings: [],
		clean: false,
		iteration: 0,
		history: previous?.history ?? [],
	};
}

export function evaluateReview(input: {
	subject: ReviewSubject;
	context: unknown;
	artifact: unknown;
	modelFindings: unknown;
	previous?: ReviewRuntimeState;
	adapter?: ReviewSubjectAdapter;
	iteration: number;
	now?: Date;
}): ReviewRuntimeState {
	const base = prepareReviewState(input.subject, input.context, input.previous);
	const deterministic = input.adapter?.validate(input.context, input.artifact) ?? [];
	const model = normalizeReviewFindings(input.subject, input.modelFindings);
	const findings = new Map<string, ReviewFinding>();
	for (const finding of [...deterministic, ...model]) findings.set(finding.id, finding);
	const merged = [...findings.values()];
	const record: ReviewIterationRecord = {
		iteration: input.iteration,
		phase: "review",
		contextFingerprint: base.contextFingerprint,
		findings: merged,
		clean: merged.length === 0,
		observedAt: (input.now ?? new Date()).toISOString(),
	};
	return {
		...base,
		findings: merged,
		clean: merged.length === 0,
		iteration: input.iteration,
		history: [...base.history, record],
		approvedFingerprint: merged.length === 0 ? base.approvedFingerprint : undefined,
		approvedAt: merged.length === 0 ? base.approvedAt : undefined,
	};
}

export function recordReviewFix(state: ReviewRuntimeState, iteration: number, now = new Date()): ReviewRuntimeState {
	const record: ReviewIterationRecord = {
		iteration,
		phase: "fix",
		contextFingerprint: state.contextFingerprint,
		findings: state.findings,
		clean: false,
		observedAt: now.toISOString(),
	};
	return {
		...state,
		clean: false,
		iteration,
		history: [...state.history, record],
		approvedFingerprint: undefined,
		approvedAt: undefined,
	};
}

export function approveReview(state: ReviewRuntimeState, now = new Date()): ReviewRuntimeState {
	if (!state.clean || state.findings.length > 0) throw new Error(`Cannot approve unclean ${state.subject} review`);
	return {
		...state,
		approvedFingerprint: state.contextFingerprint,
		approvedAt: now.toISOString(),
	};
}

export function reviewApprovalFresh(state: ReviewRuntimeState | undefined): boolean {
	return !!state?.clean && state.approvedFingerprint === state.contextFingerprint;
}
