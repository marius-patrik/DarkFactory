/**
 * PostgreSQL-backed distributed ownership for the canonical graph executor.
 *
 * PostgreSQL's unique-key INSERT/ON CONFLICT UPDATE is the acquisition
 * linearization point. It increments a durable generation on every handover.
 * All renewals, assertions, and releases match owner AND generation.
 *
 * This protects the graph's cooperative effect boundary. GitHub itself does
 * NOT accept a generation token, so an HTTP mutation already in flight when
 * its owner's lease expires cannot be retrospectively fenced by this module.
 * Production operation additionally requires serialized effect transport,
 * shared durable run files and ambiguity reconciliation.
 */
import { randomUUID } from "node:crypto";
import { SQL } from "bun";
import type { DistributedGraphLease } from "./executor.ts";

export class FencedGraphLeaseError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "FencedGraphLeaseError";
	}
}

export interface PostgresGraphLeaseOptions {
	/** PostgreSQL connection string; NOT a SQLite/MySQL URL. */
	connectionString: string;
	/** Stable repository/environment scope. */
	namespace: string;
	/** Map host-specific runDir values onto one canonical Request key. */
	runKey(runDir: string): string;
	/** Lease expiry in milliseconds; must exceed three renewal periods. */
	ttlMs?: number;
	renewMs?: number;
	/** Bounded acquisition wait; contention is a failure, not a local fallback. */
	acquireTimeoutMs?: number;
}

export class PostgresGraphLease implements DistributedGraphLease {
	readonly #options: Required<Omit<PostgresGraphLeaseOptions, "runKey">> & Pick<PostgresGraphLeaseOptions, "runKey">;

	constructor(options: PostgresGraphLeaseOptions) {
		const ttlMs = options.ttlMs ?? 30_000;
		const renewMs = options.renewMs ?? 5_000;
		const acquireTimeoutMs = options.acquireTimeoutMs ?? 30_000;
		if (!/^postgres(?:ql)?:\/\//u.test(options.connectionString))
			throw new Error("Distributed graph lease requires PostgreSQL, not a local database");
		if (!options.namespace.trim() || !/^[a-zA-Z0-9_.:\/-]+$/u.test(options.namespace))
			throw new Error("Invalid distributed graph lease namespace");
		if (!Number.isSafeInteger(ttlMs) || !Number.isSafeInteger(renewMs) || renewMs < 100 || ttlMs <= renewMs * 3)
			throw new Error("Distributed lease expiry must exceed three renewal intervals");
		if (!Number.isSafeInteger(acquireTimeoutMs) || acquireTimeoutMs < 0 || acquireTimeoutMs > 300_000)
			throw new Error("Invalid bounded lease acquisition timeout");
		this.#options = { ...options, ttlMs, renewMs, acquireTimeoutMs };
	}

	async withLease<T>(runDir: string, work: (claim: { assertOwned(): Promise<void> }) => Promise<T>): Promise<T> {
		const keyPart = this.#options.runKey(runDir);
		if (!keyPart || !/^[a-zA-Z0-9_.:\/-]+$/u.test(keyPart) || keyPart.length > 512)
			throw new Error("runKey must be a stable, nonempty canonical Request identity");
		const key = this.#options.namespace + ":" + keyPart;
		const owner = randomUUID();
		const sql = new SQL(this.#options.connectionString);
		const { ttlMs, renewMs, acquireTimeoutMs } = this.#options;
		let generation: string | undefined;
		let interval: ReturnType<typeof setInterval> | undefined;
		let renewal: Promise<void> = Promise.resolve();
		let lost: FencedGraphLeaseError | undefined;
		try {
			const deadline = performance.now() + acquireTimeoutMs;
			for (;;) {
				const acquired = await sql<{ generation: string }[]>`
					INSERT INTO darkfactory_graph_leases (run_key, owner_id, generation, expires_at)
					VALUES (${key}, ${owner}, 1, clock_timestamp() + make_interval(secs => ${ttlMs / 1000}))
					ON CONFLICT (run_key) DO UPDATE SET
						owner_id = EXCLUDED.owner_id,
						generation = darkfactory_graph_leases.generation + 1,
						expires_at = EXCLUDED.expires_at
					WHERE darkfactory_graph_leases.expires_at <= clock_timestamp()
					RETURNING generation::text AS generation
				`;
				if (acquired.length === 1) {
					generation = acquired[0]!.generation;
					break;
				}
				if (performance.now() >= deadline)
					throw new FencedGraphLeaseError("Distributed run lease is held by another runner");
				await Bun.sleep(Math.min(250, Math.max(1, deadline - performance.now())));
			}
			const ownedGeneration = generation;
			const assertOwned = async () => {
				if (lost) throw lost;
				let rows: { owned: boolean }[];
				try {
					rows = await sql<{ owned: boolean }[]>`
						SELECT EXISTS (
							SELECT 1 FROM darkfactory_graph_leases
							WHERE run_key = ${key} AND owner_id = ${owner}
							  AND generation = ${ownedGeneration}
							  AND expires_at > clock_timestamp()
						) AS owned
					`;
				} catch {
					lost = new FencedGraphLeaseError("Distributed ownership verification failed");
					throw lost;
				}
				if (!rows[0]?.owned) {
					lost = new FencedGraphLeaseError("Distributed graph ownership expired or a newer generation acquired");
					throw lost;
				}
			};
			interval = setInterval(() => {
				renewal = renewal
					.then(async () => {
						if (lost) return;
						const rows = await sql<{ generation: string }[]>`
						UPDATE darkfactory_graph_leases
						SET expires_at = clock_timestamp() + make_interval(secs => ${ttlMs / 1000})
						WHERE run_key = ${key} AND owner_id = ${owner}
						  AND generation = ${ownedGeneration} AND expires_at > clock_timestamp()
						RETURNING generation::text AS generation
					`;
						if (rows.length !== 1) throw new FencedGraphLeaseError("Distributed lease renewal lost ownership");
					})
					.catch((error: unknown) => {
						lost =
							error instanceof FencedGraphLeaseError
								? error
								: new FencedGraphLeaseError("Distributed lease renewal failed");
					});
			}, renewMs);
			const value = await work({ assertOwned });
			await renewal;
			await assertOwned();
			return value;
		} finally {
			if (interval) clearInterval(interval);
			await renewal;
			if (generation) {
				try {
					await sql`
						UPDATE darkfactory_graph_leases SET expires_at = clock_timestamp()
						WHERE run_key = ${key} AND owner_id = ${owner} AND generation = ${generation}
					`;
				} catch {
					// Expiry and generation matching are the safe-handover fallback.
					// Do not overwrite an exception from the work being fenced.
				}
			}
			await sql.close();
		}
	}
}
