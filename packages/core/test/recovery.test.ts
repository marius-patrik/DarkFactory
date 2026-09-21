import { describe, expect, test } from "bun:test";
import type { RecoveryIntakeRecord, RecoverySourceIdentity } from "@darkfactory/protocol/recovery";
import {
	assertRecoveryCleanupTruth,
	assertRecoveryPublicationAllowed,
	evaluateRecoveryCleanup,
	evaluateRecoveryPlanningFreshness,
	fingerprintRecoverySource,
	validateRecoveryIntakeForLifecycle,
	validateRecoveryIntakeRecord,
} from "../src/recovery.ts";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);
const SHA_C = "c".repeat(40);

const SOURCE: RecoverySourceIdentity = {
	id: "source:F14",
	kind: "branch",
	originalRef: "recovery/f14-borrowed-refresh",
	originalHead: SHA_A,
	recoveryRef: "recovery/f14-borrowed-refresh",
	recoverySha: SHA_A,
	canonicalBaseSha: SHA_B,
};
const SOURCE_FINGERPRINT = fingerprintRecoverySource(SOURCE);

function record(overrides: Partial<RecoveryIntakeRecord> = {}): RecoveryIntakeRecord {
	return {
		version: 1,
		id: "recovery:F14",
		sourceFingerprint: SOURCE_FINGERPRINT,
		source: SOURCE,
		binding: { request: 422, requestVersion: "v7" },
		safety: {
			status: "safe",
			publicationAllowed: true,
			findings: [],
			blockedReasons: [],
		},
		planning: {
			status: "unreviewed",
		},
		lifecycle: "ready_for_planning",
		cleanup: { uniqueStateRemaining: true, eligible: false },
		auditEvidence: ["issue:422:source-disposition"],
		...overrides,
	};
}

describe("recovery provenance contract", () => {
	test("validates exact source identity and Request binding without advancing lifecycle gates", () => {
		const parsed = validateRecoveryIntakeForLifecycle(record());
		expect(parsed.binding).toEqual({ request: 422, requestVersion: "v7" });
		expect(parsed.source.originalHead).toBe(SHA_A);
		expect(parsed.lifecycle).toBe("ready_for_planning");
	});

	test("rejects incomplete exact source identity", () => {
		const candidate = record({
			source: {
				id: "source:missing-ref",
				kind: "branch",
				originalHead: SHA_A,
				canonicalBaseSha: SHA_B,
			},
		});
		expect(() => validateRecoveryIntakeRecord(candidate)).toThrow("branch recovery requires originalRef");
	});

	test("rejects a forged source fingerprint that does not match exact provenance", () => {
		const forged = record({ sourceFingerprint: "f".repeat(64) });
		expect(() => validateRecoveryIntakeRecord(forged)).toThrow("Recovery source fingerprint mismatch");
	});

	test("requires approved Planning to match Request, base and exact imported source", () => {
		const approved = record({
			planning: {
				status: "approved",
				contextFingerprint: "planning:approved",
				approvedRequestVersion: "v7",
				approvedBaseSha: SHA_B,
				approvedSourceFingerprint: SOURCE_FINGERPRINT,
			},
			lifecycle: "reconciling",
		});

		expect(
			evaluateRecoveryPlanningFreshness(approved, {
				requestVersion: "v7",
				baseSha: SHA_B,
				sourceFingerprint: SOURCE_FINGERPRINT,
			}),
		).toEqual({ valid: true, reasons: [] });

		expect(
			evaluateRecoveryPlanningFreshness(approved, {
				requestVersion: "v8",
				baseSha: SHA_C,
				sourceFingerprint: "d".repeat(64),
			}),
		).toEqual({
			valid: false,
			reasons: ["request_changed", "base_changed", "source_changed"],
		});
	});

	test("never permits publication of blocked sensitive recovery state", () => {
		const blocked = record({
			safety: {
				status: "blocked",
				publicationAllowed: false,
				findings: [{ id: "secret:1", kind: "credential", path: ".env", ruleId: "secret-scan" }],
				blockedReasons: ["secret-bearing local material requires operator remediation"],
			},
			lifecycle: "blocked",
		});
		expect(() => assertRecoveryPublicationAllowed(blocked)).toThrow("Recovery publication blocked");
		expect(JSON.stringify(blocked.safety.findings)).not.toContain("super-secret-token");
	});

	test("rejects contradictory blocked publication state at the protocol boundary", () => {
		const contradictory = record({
			safety: {
				status: "blocked",
				publicationAllowed: true,
				findings: [],
				blockedReasons: ["blocked"],
			},
			lifecycle: "blocked",
		});
		expect(() => validateRecoveryIntakeRecord(contradictory)).toThrow("Blocked recovery cannot be published");
	});

	test("cleanup becomes eligible only after terminal disposition, represented unique state and audit evidence", () => {
		const terminal = record({
			lifecycle: "terminal",
			disposition: {
				kind: "integrated",
				reason: "All unique semantics landed in final owner",
				pr: 931,
				mergeSha: SHA_C,
			},
			cleanup: { uniqueStateRemaining: false, eligible: true },
		});
		expect(evaluateRecoveryCleanup(terminal)).toEqual({ uniqueStateRemaining: false, eligible: true });
		expect(() => assertRecoveryCleanupTruth(terminal)).not.toThrow();
		expect(validateRecoveryIntakeForLifecycle(terminal).disposition?.kind).toBe("integrated");
	});

	test("cleanup remains blocked while unique state exists or evidence is absent", () => {
		const unique = record({
			lifecycle: "terminal",
			disposition: { kind: "superseded", reason: "Current final owner supersedes recovered bytes" },
			cleanup: { uniqueStateRemaining: true, eligible: false },
		});
		expect(evaluateRecoveryCleanup(unique).eligible).toBe(false);

		const noEvidence = record({
			lifecycle: "terminal",
			disposition: { kind: "rejected", reason: "Recovered write-back behavior violates custody contract" },
			cleanup: { uniqueStateRemaining: false, eligible: false },
			auditEvidence: [],
		});
		expect(evaluateRecoveryCleanup(noEvidence).eligible).toBe(false);
	});

	test("rejects cleanup flags that claim more than deterministic provenance supports", () => {
		const falseClaim = record({
			cleanup: { uniqueStateRemaining: true, eligible: true },
		});
		expect(() => assertRecoveryCleanupTruth(falseClaim)).toThrow("cleanup eligibility is inconsistent");
	});
});
