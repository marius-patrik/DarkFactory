export type ReviewSubject = "planning" | "implementation";
export type ReviewSeverity = "info" | "warning" | "error";

export interface ReviewFinding {
	id: string;
	category: string;
	severity: ReviewSeverity;
	message: string;
	evidence?: string;
	location?: string;
	remediation?: string;
}

export interface ReviewIterationRecord {
	iteration: number;
	phase: "review" | "fix";
	contextFingerprint: string;
	findings: ReviewFinding[];
	clean: boolean;
	observedAt: string;
}

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
