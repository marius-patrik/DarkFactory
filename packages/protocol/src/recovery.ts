import { z } from "zod";

const gitShaSchema = z.string().regex(/^[0-9a-f]{40}(?:[0-9a-f]{24})?$/iu, "Expected a full Git object SHA");
const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/iu, "Expected a SHA-256 digest");

/** Local/recovered source categories accepted by the governed recovery intake contract. */
const recoverySourceKindSchema = z.enum(["worktree", "branch", "ref", "stash", "snapshot"]);

/** Exact dirty/untracked snapshot identity captured without embedding recovered bytes. */
const recoverySnapshotIdentitySchema = z.object({
	id: z.string().min(1),
	contentSha256: sha256Schema,
	trackedTreeSha: gitShaSchema.optional(),
	untrackedManifestSha256: sha256Schema.optional(),
});

/** Exact provenance for one local or recovered implementation source. */
const recoverySourceIdentitySchema = z
	.object({
		id: z.string().min(1),
		kind: recoverySourceKindSchema,
		originalPath: z.string().min(1).optional(),
		originalRef: z.string().min(1).optional(),
		originalHead: gitShaSchema,
		snapshot: recoverySnapshotIdentitySchema.optional(),
		recoveryRef: z.string().min(1).optional(),
		recoverySha: gitShaSchema.optional(),
		canonicalBaseSha: gitShaSchema,
	})
	.superRefine((source, context) => {
		if (source.kind === "worktree" && !source.originalPath) {
			context.addIssue({ code: "custom", path: ["originalPath"], message: "Worktree recovery requires originalPath" });
		}
		if ((source.kind === "branch" || source.kind === "ref" || source.kind === "stash") && !source.originalRef) {
			context.addIssue({
				code: "custom",
				path: ["originalRef"],
				message: `${source.kind} recovery requires originalRef`,
			});
		}
		if (source.kind === "snapshot" && !source.snapshot) {
			context.addIssue({ code: "custom", path: ["snapshot"], message: "Snapshot recovery requires snapshot identity" });
		}
		if ((source.recoveryRef === undefined) !== (source.recoverySha === undefined)) {
			context.addIssue({
				code: "custom",
				path: ["recoveryRef"],
				message: "recoveryRef and recoverySha must be recorded together",
			});
		}
	});

/** Request binding preserved independently from implementation/review completion state. */
const recoveryRequestBindingSchema = z.object({
	request: z.number().int().positive(),
	requestVersion: z.string().min(1),
});

/** Metadata-only sensitive-data finding. Secret values are intentionally absent from this contract. */
const recoverySensitiveFindingSchema = z.object({
	id: z.string().min(1),
	kind: z.string().min(1),
	path: z.string().min(1).optional(),
	ruleId: z.string().min(1).optional(),
});

/** Secret/publication safety state for one imported source. */
const recoverySafetySchema = z
	.object({
		status: z.enum(["safe", "blocked"]),
		publicationAllowed: z.boolean(),
		findings: z.array(recoverySensitiveFindingSchema),
		blockedReasons: z.array(z.string().min(1)),
	})
	.superRefine((safety, context) => {
		if (safety.status === "blocked" && safety.publicationAllowed) {
			context.addIssue({
				code: "custom",
				path: ["publicationAllowed"],
				message: "Blocked recovery cannot be published",
			});
		}
		if (safety.status === "blocked" && safety.blockedReasons.length === 0) {
			context.addIssue({ code: "custom", path: ["blockedReasons"], message: "Blocked recovery requires a reason" });
		}
	});

/** Approved-Planning identity used to prove whether approval remains reusable after intake. */
const recoveryPlanningStateSchema = z.object({
	status: z.enum(["unreviewed", "approved", "stale"]),
	contextFingerprint: z.string().min(1).optional(),
	approvedRequestVersion: z.string().min(1).optional(),
	approvedBaseSha: gitShaSchema.optional(),
	approvedSourceFingerprint: sha256Schema.optional(),
});

/** Terminal disposition represented in provenance/audit state. */
const recoveryDispositionSchema = z.object({
	kind: z.enum(["integrated", "rejected", "superseded"]),
	reason: z.string().min(1),
	pr: z.number().int().positive().optional(),
	mergeSha: gitShaSchema.optional(),
});

/** Cleanup state for a temporary recovery ref/worktree/stash. */
const recoveryCleanupStateSchema = z.object({
	uniqueStateRemaining: z.boolean(),
	eligible: z.boolean(),
});

/** Durable provenance record for one governed recovery intake. */
export const recoveryIntakeRecordSchema = z.object({
	version: z.literal(1),
	id: z.string().min(1),
	sourceFingerprint: sha256Schema,
	source: recoverySourceIdentitySchema,
	binding: recoveryRequestBindingSchema,
	safety: recoverySafetySchema,
	planning: recoveryPlanningStateSchema,
	lifecycle: z.enum(["preserved", "blocked", "ready_for_planning", "reconciling", "terminal"]),
	disposition: recoveryDispositionSchema.optional(),
	cleanup: recoveryCleanupStateSchema,
	auditEvidence: z.array(z.string().min(1)),
});

/** Local/recovered source category. */
type RecoverySourceKind = z.infer<typeof recoverySourceKindSchema>;
/** Exact dirty/untracked snapshot identity. */
type RecoverySnapshotIdentity = z.infer<typeof recoverySnapshotIdentitySchema>;
/** Exact local/recovered implementation source identity. */
export type RecoverySourceIdentity = z.infer<typeof recoverySourceIdentitySchema>;
/** Request/version binding for one recovery intake. */
type RecoveryRequestBinding = z.infer<typeof recoveryRequestBindingSchema>;
/** Metadata-only sensitive-data finding. */
type RecoverySensitiveFinding = z.infer<typeof recoverySensitiveFindingSchema>;
/** Secret/publication safety state. */
type RecoverySafety = z.infer<typeof recoverySafetySchema>;
/** Planning reuse/freshness state. */
type RecoveryPlanningState = z.infer<typeof recoveryPlanningStateSchema>;
/** Terminal recovery disposition. */
type RecoveryDisposition = z.infer<typeof recoveryDispositionSchema>;
/** Cleanup eligibility state. */
export type RecoveryCleanupState = z.infer<typeof recoveryCleanupStateSchema>;
/** Durable governed recovery provenance/audit record. */
export type RecoveryIntakeRecord = z.infer<typeof recoveryIntakeRecordSchema>;
