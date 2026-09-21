/** Artifact subject handled by the shared review/fix engine. */
export type ReviewSubject = "planning" | "implementation";
/** Normalized severity of a review finding. */
export type ReviewSeverity = "info" | "warning" | "error";

/** Structured finding emitted by the shared review engine. */
export interface ReviewFinding {
	id: string;
	category: string;
	severity: ReviewSeverity;
	message: string;
	evidence?: string;
	location?: string;
	remediation?: string;
}

/** Persisted record of one review or fix iteration. */
export interface ReviewIterationRecord {
	iteration: number;
	phase: "review" | "fix";
	contextFingerprint: string;
	findings: ReviewFinding[];
	clean: boolean;
	observedAt: string;
}

/** Durable resumable state of a review/fix loop. */
export interface ReviewRuntimeState {
	subject: ReviewSubject;
	contextFingerprint: string;
	findings: ReviewFinding[];
	clean: boolean;
	iteration: number;
	history: ReviewIterationRecord[];
	approvedFingerprint?: string;
	approvedAt?: string;
}

/** Graph configuration for review and fix nodes. */
export type ReviewNodeConfig =
	| {
			subject: ReviewSubject;
			phase: "review";
			context: string;
			artifact: string;
			findings: string;
			clean: string;
	  }
	| {
			subject: ReviewSubject;
			phase: "fix";
			context: string;
			artifact: string;
			findings: string;
	  };

export { reviewFindingSchema, reviewResultSchema } from "./result-capture.ts";
