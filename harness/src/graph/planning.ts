import type { PlanningArtifact, PlanningContextPacket } from "../../../packages/protocol/src/planning.ts";
import type { ReviewFinding } from "../../../packages/protocol/src/review.ts";
import { contextFingerprint, type ReviewSubjectAdapter } from "./review-loop.ts";

function finding(id: string, category: string, message: string, extra: Partial<ReviewFinding> = {}): ReviewFinding {
	return { id, category, severity: "error", message, ...extra };
}

function isContext(value: unknown): value is PlanningContextPacket {
	if (!value || typeof value !== "object") return false;
	const packet = value as Partial<PlanningContextPacket>;
	return (
		!!packet.request &&
		typeof packet.request.issue === "number" &&
		typeof packet.request.body === "string" &&
		typeof packet.request.version === "string" &&
		!!packet.base &&
		typeof packet.base.sha === "string" &&
		typeof packet.base.defaultBranch === "string" &&
		Array.isArray(packet.dependencies) &&
		Array.isArray(packet.shippedInterfaces) &&
		Array.isArray(packet.recovery)
	);
}

function isArtifact(value: unknown): value is PlanningArtifact {
	return (
		!!value && typeof value === "object" && typeof (value as Partial<PlanningArtifact>).verbatimRequest === "string"
	);
}

export function validatePlanningArtifact(context: unknown, artifact: unknown): ReviewFinding[] {
	if (!isContext(context))
		return [
			finding(
				"planning-context-invalid",
				"context",
				"Planning context packet is missing required authoritative fields.",
			),
		];
	if (!isArtifact(artifact))
		return [
			finding(
				"planning-artifact-invalid",
				"artifact",
				"Planning artifact must use the structured PlanningArtifact contract.",
			),
		];

	const findings: ReviewFinding[] = [];
	const fingerprint = contextFingerprint(context);
	if (artifact.contextFingerprint !== fingerprint)
		findings.push(
			finding(
				"planning-context-stale",
				"staleness",
				"Planning artifact was produced from a different authoritative context fingerprint.",
			),
		);
	if (artifact.verbatimRequest !== context.request.body)
		findings.push(
			finding(
				"planning-request-not-verbatim",
				"request",
				"Planning artifact does not preserve the Request body verbatim.",
			),
		);
	if (
		artifact.acceptanceCriteria.length !== context.request.acceptanceCriteria.length ||
		artifact.acceptanceCriteria.some((criterion, index) => criterion !== context.request.acceptanceCriteria[index])
	)
		findings.push(
			finding("planning-criteria-drift", "request", "Planning artifact changed or dropped acceptance criteria."),
		);

	const known = new Set(context.shippedInterfaces);
	for (const owner of artifact.implementation.knownOwners)
		if (!known.has(owner))
			findings.push(
				finding(
					`planning-owner-${owner}`,
					"invented-owner",
					`Planning claims implementation owner/interface "${owner}" without authoritative shipped-interface evidence.`,
					{ evidence: owner },
				),
			);

	if (artifact.hold?.kind === "dependency") {
		const dependencies = new Set(context.dependencies.map((dependency) => dependency.id));
		for (const ref of artifact.hold.refs)
			if (!dependencies.has(ref))
				findings.push(
					finding(
						`planning-dependency-${ref}`,
						"dependency",
						`Ready-but-held Planning references unknown dependency "${ref}".`,
					),
				);
	}
	if (artifact.hold?.kind === "recovery") {
		const recovery = new Set(context.recovery);
		for (const ref of artifact.hold.refs)
			if (!recovery.has(ref))
				findings.push(
					finding(
						`planning-recovery-${ref}`,
						"recovery",
						`Ready-but-held Planning references unknown recovery source "${ref}".`,
					),
				);
	}

	const serialized = JSON.stringify(artifact);
	for (const [id, pattern, message] of [
		[
			"planning-legacy-manifest",
			/\.darkfactory\/manifest\.json|\.github\/darkfactory\.json/u,
			"Planning references a retired manifest path.",
		],
		["planning-df-directory", /(?:^|[/"'])\.df\//u, "Planning treats .df as a directory instead of a file extension."],
		["planning-legacy-config", /\.darkfactory\/df\/config\.json/u, "Planning references the retired config path."],
	] as const)
		if (pattern.test(serialized)) findings.push(finding(id, "stale-architecture", message));

	if (context.base.defaultBranch !== "main" && /(?:default|base|target)[^\n]{0,32}\bmain\b/iu.test(serialized))
		findings.push(
			finding(
				"planning-hardcoded-main",
				"repository",
				`Planning hard-codes main even though the authoritative default branch is ${context.base.defaultBranch}.`,
			),
		);

	for (const [key, values] of Object.entries({
		behavioralContract: artifact.behavioralContract,
		scope: artifact.scope,
		sequencing: artifact.sequencing,
		verification: artifact.verification,
	}))
		if (!Array.isArray(values) || values.length === 0)
			findings.push(finding(`planning-empty-${key}`, "artifact", `Planning artifact must include ${key}.`));

	return findings;
}

export const planningReviewAdapter: ReviewSubjectAdapter = {
	subject: "planning",
	validate: validatePlanningArtifact,
};
