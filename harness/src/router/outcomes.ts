import { appendFile, mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { CandidateOutcome, TaskKind } from "./types.ts";

const candidateKey = (value: CandidateOutcome["candidate"]) => `${value.provider}/${value.model}@${value.account}`;

/**
 * Stores and retrieves routing outcome records for candidates.
 *
 * Each record records the success/failure of a candidate at a specific time.
 * The store maintains a limited number of recent records and computes penalties
 * for recently failing candidates.
 */
export class OutcomeStore {
	/**
	 * Filesystem path to the JSONL file where outcomes are persisted.
	 */
	readonly path: string;
	private readonly windowMs: number;
	private readonly maxPenalty: number;
	private readonly maxRecords: number;

	/**
	 * Creates a new outcome store.
	 *
	 * @param home - Directory where the outcome file will be stored.
	 * @param options - Optional configuration:
	 *   @param options.windowMs – Time window for penalty decay (default 7 days).
	 *   @param options.maxPenalty – Maximum penalty per candidate (default 20).
	 *   @param options.maxRecords – Maximum stored records (default 1,000).
	 */
	constructor(home: string, options: { windowMs?: number; maxPenalty?: number; maxRecords?: number } = {}) {
		this.path = join(home, "router-outcomes.jsonl");
		this.windowMs = options.windowMs ?? 7 * 86_400_000;
		this.maxPenalty = options.maxPenalty ?? 20;
		this.maxRecords = options.maxRecords ?? 1_000;
	}

	/**
	 * Records a new outcome for a candidate.
	 *
	 * @param outcome - The outcome data to append to the store.
	 */
	async record(outcome: CandidateOutcome): Promise<void> {
		await mkdir(dirname(this.path), { recursive: true });
		await appendFile(this.path, `${JSON.stringify(outcome)}\n`, { encoding: "utf8", mode: 0o600 });
	}

	private async read(): Promise<CandidateOutcome[]> {
		let text: string;
		try { text = await readFile(this.path, "utf8"); }
		catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
		return text.trim().split(/\r?\n/u).filter(Boolean).slice(-this.maxRecords).flatMap((line) => {
			try { const value = JSON.parse(line) as CandidateOutcome; return value?.candidate && typeof value.observedAt === "number" ? [value] : []; }
			catch { return []; }
		});
	}

	/**
	 * Computes penalty scores for candidates based on recent failures.
	 *
	 * @param kind - The task kind for which penalties are calculated.
	 * @param now - Current timestamp (ms since epoch); defaults to `Date.now()`.
	 * @returns A map from candidate key to penalty value.
	 */
	async penalties(kind: TaskKind, now = Date.now()): Promise<Map<string, number>> {
		const totals = new Map<string, number>();
		for (const outcome of await this.read()) {
			const age = now - outcome.observedAt;
			if (outcome.kind !== kind || outcome.success || age < 0 || age >= this.windowMs) continue;
			const weight = this.maxPenalty * (1 - age / this.windowMs);
			const key = candidateKey(outcome.candidate);
			totals.set(key, Math.min(this.maxPenalty, (totals.get(key) ?? 0) + weight));
		}
		return totals;
	}
}
