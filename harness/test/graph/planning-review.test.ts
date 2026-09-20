import { describe, expect, test } from "bun:test";
import type { PlanningArtifact, PlanningContextPacket } from "@darkfactory/protocol/planning";
import { planningReviewAdapter, validatePlanningArtifact } from "../../src/graph/planning.ts";
import { contextFingerprint, evaluateReview } from "../../src/graph/review-loop.ts";

const context = (): PlanningContextPacket => ({
	request: {
		issue: 391,
		body: "Preserve this exact Request body.",
		version: "v2",
		acceptanceCriteria: ["one Planning artifact", "independent review", "one approval gate"],
		parent: 68,
	},
	relationships: { parent: 68 },
	dependencies: [{ id: "#340", state: "Done", version: "7dd4aa8" }],
	approvedDecisions: ["direct TypeScript rebuild"],
	base: { sha: "abc123", defaultBranch: "darkfactory" },
	shippedInterfaces: ["packages/protocol", "harness/src/graph"],
	recovery: ["recovery/f40-capability-tiers"],
});

function artifact(packet: PlanningContextPacket = context()): PlanningArtifact {
	return {
		contextFingerprint: contextFingerprint(packet),
		verbatimRequest: packet.request.body,
		acceptanceCriteria: [...packet.request.acceptanceCriteria],
		behavioralContract: ["Use one reviewed Planning artifact."],
		scope: ["Planning review lifecycle"],
		exclusions: ["No legacy Python compatibility"],
		dependencies: ["#340"],
		sequencing: ["review before approval"],
		verification: ["shared review-loop tests"],
		implementation: {
			knownOwners: ["harness/src/graph"],
			discoveryRequired: ["final production handler"],
		},
	};
}

describe("Planning artifact validation", () => {
	test("accepts evidence-backed Planning with exact Request semantics", () => {
		expect(validatePlanningArtifact(context(), artifact())).toEqual([]);
	});

	test("emits a complete deterministic finding set in one review", () => {
		const packet = context();
		const bad: PlanningArtifact = {
			...artifact(packet),
			contextFingerprint: "stale",
			verbatimRequest: "rewritten request",
			acceptanceCriteria: ["one Planning artifact"],
			behavioralContract: [],
			scope: [],
			sequencing: [],
			verification: [],
			implementation: {
				knownOwners: [".darkfactory/manifest.json", "src/invented.ts"],
				discoveryRequired: [],
			},
		};
		const result = evaluateReview({
			subject: "planning",
			context: packet,
			artifact: bad,
			modelFindings: [
				{
					id: "model-extra",
					category: "dependency",
					severity: "error",
					message: "dependency contract is stale",
				},
			],
			adapter: planningReviewAdapter,
			iteration: 1,
		});
		const ids = result.findings.map((finding) => finding.id);
		expect(ids).toContain("planning-context-stale");
		expect(ids).toContain("planning-request-not-verbatim");
		expect(ids).toContain("planning-criteria-drift");
		expect(ids).toContain("planning-owner-.darkfactory/manifest.json");
		expect(ids).toContain("planning-owner-src/invented.ts");
		expect(ids).toContain("planning-legacy-manifest");
		expect(ids).toContain("planning-empty-behavioralContract");
		expect(ids).toContain("planning-empty-scope");
		expect(ids).toContain("planning-empty-sequencing");
		expect(ids).toContain("planning-empty-verification");
		expect(ids).toContain("model-extra");
		expect(result.clean).toBe(false);
	});

	test("ready-but-held Planning validates references without inventing implementation owners", () => {
		const packet = context();
		const held: PlanningArtifact = {
			...artifact(packet),
			implementation: { knownOwners: [], discoveryRequired: ["recovery delta ownership"] },
			hold: { kind: "recovery", refs: ["recovery/f40-capability-tiers"], reason: "inspect preserved implementation" },
		};
		expect(validatePlanningArtifact(packet, held)).toEqual([]);

		const invalid = {
			...held,
			hold: { kind: "dependency" as const, refs: ["#999"], reason: "wait" },
		};
		expect(validatePlanningArtifact(packet, invalid).map((finding) => finding.id)).toContain(
			"planning-dependency-#999",
		);
	});

	test("detects stale df-directory/config assumptions and hard-coded main", () => {
		const packet = context();
		const bad: PlanningArtifact = {
			...artifact(packet),
			exclusions: [".df/review.md", ".darkfactory/df/config.json", "default branch main"],
		};
		const ids = validatePlanningArtifact(packet, bad).map((finding) => finding.id);
		expect(ids).toContain("planning-df-directory");
		expect(ids).toContain("planning-legacy-config");
		expect(ids).toContain("planning-hardcoded-main");
	});
});
