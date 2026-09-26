import { createHash } from "node:crypto";
import {
	type RecoveryCleanupState,
	type RecoveryIntakeRecord,
	type RecoverySourceIdentity,
	recoveryIntakeRecordSchema,
} from "@darkfactory/protocol/recovery";

/** Current authoritative context used to decide whether approved Planning remains reusable. */
export interface RecoveryPlanningContext {
	requestVersion: string;
	baseSha: string;
	sourceFingerprint: string;
}

/** Result of checking an imported recovery record against current Planning context. */
export interface RecoveryPlanningFreshness {
	valid: boolean;
	reasons: readonly ("request_changed" | "base_changed" | "source_changed" | "not_approved")[];
}

/** Computes the canonical SHA-256 identity of one exact recovered source description. */
export function fingerprintRecoverySource(source: RecoverySourceIdentity): string {
	const canonical = {
		id: source.id,
		kind: source.kind,
		originalPath: source.originalPath ?? null,
		originalRef: source.originalRef ?? null,
		originalHead: source.originalHead,
		snapshot: source.snapshot
			? {
					id: source.snapshot.id,
					contentSha256: source.snapshot.contentSha256,
					trackedTreeSha: source.snapshot.trackedTreeSha ?? null,
					untrackedManifestSha256: source.snapshot.untrackedManifestSha256 ?? null,
				}
			: null,
		recoveryRef: source.recoveryRef ?? null,
		recoverySha: source.recoverySha ?? null,
		canonicalBaseSha: source.canonicalBaseSha,
	};
	return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Parses and validates one serialized recovery-intake record, including its claimed exact source fingerprint. */
export function validateRecoveryIntakeRecord(value: unknown): RecoveryIntakeRecord {
	const record = recoveryIntakeRecordSchema.parse(value);
	const expected = fingerprintRecoverySource(record.source);
	if (record.sourceFingerprint !== expected) {
		throw new Error(`Recovery source fingerprint mismatch: recorded=${record.sourceFingerprint} expected=${expected}`);
	}
	return record;
}

/**
 * Proves whether a previously approved Planning artifact still applies after recovery intake.
 *
 * Reuse is allowed only when the approved Request version, canonical base, and exact imported-source
 * fingerprint all match the current authoritative context.
 */
export function evaluateRecoveryPlanningFreshness(
	record: RecoveryIntakeRecord,
	current: RecoveryPlanningContext,
): RecoveryPlanningFreshness {
	const reasons: RecoveryPlanningFreshness["reasons"][number][] = [];
	if (record.planning.status !== "approved") reasons.push("not_approved");
	if (record.planning.approvedRequestVersion !== current.requestVersion) reasons.push("request_changed");
	if (record.planning.approvedBaseSha !== current.baseSha) reasons.push("base_changed");
	if (record.planning.approvedSourceFingerprint !== current.sourceFingerprint) reasons.push("source_changed");
	return { valid: reasons.length === 0, reasons };
}

/** Throws when recovered material is not approved for remote publication. */
export function assertRecoveryPublicationAllowed(record: RecoveryIntakeRecord): void {
	if (record.safety.status === "blocked" || !record.safety.publicationAllowed) {
		const reason = record.safety.blockedReasons.join("; ") || "sensitive recovery material is blocked";
		throw new Error(`Recovery publication blocked: ${reason}`);
	}
}

/**
 * Computes whether temporary recovery state can be cleaned.
 *
 * Cleanup is terminal only after unique state is represented elsewhere and an explicit integrated,
 * rejected, or superseded disposition has been recorded with audit evidence.
 */
export function evaluateRecoveryCleanup(record: RecoveryIntakeRecord): RecoveryCleanupState {
	const eligible =
		record.lifecycle === "terminal" &&
		record.disposition !== undefined &&
		!record.cleanup.uniqueStateRemaining &&
		record.auditEvidence.length > 0;
	return { uniqueStateRemaining: record.cleanup.uniqueStateRemaining, eligible };
}

/** Enforces that persisted cleanup eligibility matches deterministic provenance state. */
export function assertRecoveryCleanupTruth(record: RecoveryIntakeRecord): void {
	const expected = evaluateRecoveryCleanup(record);
	if (record.cleanup.eligible !== expected.eligible) {
		throw new Error(
			`Recovery cleanup eligibility is inconsistent: recorded=${record.cleanup.eligible} expected=${expected.eligible}`,
		);
	}
}

/**
 * Validates the minimal intake contract without advancing any Planning/review/merge gate.
 *
 * This deliberately performs no git mutation or graph resume; those effects join #384/#358.
 */
export function validateRecoveryIntakeForLifecycle(value: unknown): RecoveryIntakeRecord {
	const record = validateRecoveryIntakeRecord(value);
	assertRecoveryCleanupTruth(record);
	if (record.lifecycle === "terminal" && !record.disposition) {
		throw new Error("Terminal recovery intake requires an explicit disposition");
	}
	if (record.lifecycle !== "terminal" && record.disposition) {
		throw new Error("Nonterminal recovery intake cannot carry a terminal disposition");
	}
	return record;
}
