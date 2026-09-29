import { z } from "zod";
import type { GitHubRepository } from "../github/repository";

/** Prefix of the repository variables that record a quota-blocked run. */
export const QUOTA_VARIABLE_PREFIX = "DF_QUOTA_";

/** The record a blocked run leaves behind, parsed and validated. */
const quotaRecordSchema = z.object({
	item: z.number().int(),
	is_pr: z.boolean().optional(),
	reset_at: z.string().min(1),
});

export interface QuotaRecord {
	/** Issue or pull request number that is blocked. */
	item: number;
	/** Whether the blocked item is a pull request. */
	isPr: boolean;
	/** When the model's quota resets, ISO-8601. */
	resetAt: string;
}

export interface SweepResult {
	/** Items whose reset time had passed and which were resumed. */
	resumed: number[];
	/** Records that could not be read and were deleted. */
	deletedUnreadable: string[];
	/** Records whose dispatch failed and were kept for the next sweep. */
	keptAfterFailure: string[];
}

export interface SweepOptions {
	/** Repository whose variables and dispatches are used. */
	repo: GitHubRepository;
	/** Current time; records resetting after it are left alone. */
	now: Date;
	/** Notice sink for unreadable records and failed dispatches. */
	log?: (message: string) => void;
}

/**
 * Parses one `DF_QUOTA_*` variable value.
 *
 * @param value Raw variable value.
 * @returns The validated record.
 * @throws Error when the value is not a quota record.
 */
export function parseQuotaRecord(value: string): QuotaRecord {
	const parsed = quotaRecordSchema.safeParse(JSON.parse(value) as unknown);
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "malformed quota record");
	return { item: parsed.data.item, isPr: parsed.data.is_pr === true, resetAt: parsed.data.reset_at };
}

/**
 * Resumes every quota-blocked run whose reset time has passed.
 *
 * A run that exhausts every model records itself in a `DF_QUOTA_<run-id>` repository variable.
 * This sweep is the way back: for each record whose reset has passed it sends the
 * `agent-dispatch` `resume` stage and then deletes the variable. The order matters — a dispatch
 * that fails keeps the variable so the next sweep tries again, and a record that cannot be read at
 * all is deleted rather than retried forever.
 *
 * @param options Repository, clock and notice sink.
 * @returns What was resumed, deleted and kept.
 */
export async function sweepQuotaResumes({ repo, now, log = () => {} }: SweepOptions): Promise<SweepResult> {
	const result: SweepResult = { resumed: [], deletedUnreadable: [], keptAfterFailure: [] };

	for (const variable of await repo.listVariables()) {
		if (!variable.name.startsWith(QUOTA_VARIABLE_PREFIX)) continue;

		let record: QuotaRecord;
		try {
			record = parseQuotaRecord(variable.value ?? "");
		} catch (error) {
			log(`Notice: deleting unreadable quota record ${variable.name}: ${(error as Error).message}`);
			await repo.deleteVariable(variable.name);
			result.deletedUnreadable.push(variable.name);
			continue;
		}

		if (new Date(record.resetAt).getTime() > now.getTime()) continue;

		try {
			await repo.dispatchRepositoryEvent("agent-dispatch", { stage: "resume", item: record.item, is_pr: record.isPr });
		} catch (error) {
			log(`Notice: resume dispatch for #${record.item} failed, keeping ${variable.name}: ${(error as Error).message}`);
			result.keptAfterFailure.push(variable.name);
			continue;
		}
		await repo.deleteVariable(variable.name);
		result.resumed.push(record.item);
	}

	return result;
}
