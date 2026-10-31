/** @packageDocumentation
 * Confidential durable broker persistence backed by SQLite WAL and AES-256-GCM.
 * Both data files must reside on a private server filesystem, never in a repository.
 * The key must come from server-owned secret storage, not a browser or checked-in config.
 */
import { Database } from "bun:sqlite";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { chmodSync, mkdirSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { withFileLock } from "../../keychain/src/storage/file-lock.ts";
import type { AuthTokenStore } from "./broker.ts";
import type { MutationReceiptJournal, VerifiedCommentReceipt } from "./http.ts";
import type { BrokerTokenRecord } from "./types.ts";

interface DurableBrokerOptions {
	path: string;
	/** Base64-encoded 32-byte secret, injected from the server's native keychain. */
	keyBase64: string;
}

interface SessionRow {
	payload: string;
}
interface ReceiptRow {
	intent_hash: string;
	status: "pending" | "verified";
	receipt: string | null;
}

function decodeKey(value: string): Buffer {
	const bytes = Buffer.from(value, "base64");
	if (bytes.length !== 32 || bytes.toString("base64") !== value)
		throw new Error("Confidential broker requires a canonical 256-bit encryption key");
	return bytes;
}

function openPrivateDatabase(path: string): { db: Database; filename: string } {
	const filename = resolve(path);
	const insideRepo = relative(process.cwd(), filename);
	if (!isAbsolute(path) || (!insideRepo.startsWith("..") && !isAbsolute(insideRepo)))
		throw new Error("Confidential broker data must be an absolute path outside the project");
	mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
	const db = new Database(filename, { create: true });
	chmodSync(filename, 0o600);
	db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA busy_timeout = 10000;");
	return { db, filename };
}

function encrypt(key: Buffer, id: string, value: BrokerTokenRecord): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	cipher.setAAD(Buffer.from(id));
	const encrypted = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
	return JSON.stringify({
		iv: iv.toString("base64"),
		tag: cipher.getAuthTag().toString("base64"),
		ciphertext: encrypted.toString("base64"),
	});
}

function decrypt(key: Buffer, id: string, text: string): BrokerTokenRecord {
	try {
		const payload = JSON.parse(text) as { iv: string; tag: string; ciphertext: string };
		const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
		decipher.setAAD(Buffer.from(id));
		decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
		const data = Buffer.concat([decipher.update(Buffer.from(payload.ciphertext, "base64")), decipher.final()]);
		const parsed = JSON.parse(data.toString("utf8")) as BrokerTokenRecord;
		if (!parsed?.token?.access_token || !parsed?.token?.token_type) throw new Error("Malformed record");
		return parsed;
	} catch {
		throw new Error("Confidential authentication record corrupted or inaccessible");
	}
}

/** Durable, encrypted broker session storage with per-session cross-process locking. */
export class SqliteAuthTokenStore implements AuthTokenStore {
	readonly #db: Database;
	readonly #filename: string;
	readonly #key: Buffer;

	constructor(options: DurableBrokerOptions) {
		this.#key = decodeKey(options.keyBase64);
		const opened = openPrivateDatabase(options.path);
		this.#db = opened.db;
		this.#filename = opened.filename;
		this.#db.exec("CREATE TABLE IF NOT EXISTS auth_sessions (id TEXT PRIMARY KEY, payload TEXT NOT NULL)");
	}

	async get(sessionId: string): Promise<BrokerTokenRecord | undefined> {
		const row = this.#db.query("SELECT payload FROM auth_sessions WHERE id = ?").get(sessionId) as SessionRow | null;
		return row ? decrypt(this.#key, sessionId, row.payload) : undefined;
	}

	async set(sessionId: string, record: BrokerTokenRecord): Promise<void> {
		const payload = encrypt(this.#key, sessionId, record);
		this.#db
			.query(
				"INSERT INTO auth_sessions(id, payload) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
			)
			.run(sessionId, payload);
	}

	async delete(sessionId: string): Promise<void> {
		this.#db.query("DELETE FROM auth_sessions WHERE id = ?").run(sessionId);
	}

	withLock<T>(sessionId: string, run: () => Promise<T>): Promise<T> {
		const hash = createHash("sha256").update(sessionId).digest("hex");
		return withFileLock(`${this.#filename}.locks/${hash}.lock.df`, run, { staleMs: 120_000, timeoutMs: 120_000 });
	}

	close(): void {
		this.#db.close();
	}
}

/**
 * Durable idempotency receipt journal. A failed or interrupted mutation remains pending
 * (its remote effect is unknown), and is never replayed automatically.
 */
export class SqliteMutationReceiptJournal implements MutationReceiptJournal {
	readonly #db: Database;

	constructor(path: string) {
		this.#db = openPrivateDatabase(path).db;
		this.#db.exec(
			"CREATE TABLE IF NOT EXISTS mutation_receipts (id TEXT PRIMARY KEY, intent_hash TEXT NOT NULL, status TEXT NOT NULL, receipt TEXT)",
		);
	}

	async once(
		key: string,
		intentHash: string,
		run: () => Promise<VerifiedCommentReceipt>,
	): Promise<VerifiedCommentReceipt> {
		const inserted = this.#db
			.query("INSERT OR IGNORE INTO mutation_receipts(id, intent_hash, status, receipt) VALUES (?, ?, 'pending', NULL)")
			.run(key, intentHash);
		if (inserted.changes === 0) {
			const row = this.#db
				.query("SELECT intent_hash, status, receipt FROM mutation_receipts WHERE id = ?")
				.get(key) as ReceiptRow | null;
			if (!row) throw new Error("Mutation journal unavailable");
			if (row.intent_hash !== intentHash) throw new Error("Idempotency key reused for different intent");
			if (row.status !== "verified" || !row.receipt)
				throw new Error("Mutation result uncertain; authoritative reconciliation required");
			return JSON.parse(row.receipt) as VerifiedCommentReceipt;
		}
		const receipt = await run();
		if (!Number.isSafeInteger(receipt.id) || receipt.id < 1) throw new Error("Invalid verified mutation receipt");
		this.#db
			.query(
				"UPDATE mutation_receipts SET status = 'verified', receipt = ? WHERE id = ? AND intent_hash = ? AND status = 'pending'",
			)
			.run(JSON.stringify(receipt), key, intentHash);
		return receipt;
	}

	close(): void {
		this.#db.close();
	}
}
