/**
 * Borrowed external CLI credential refresh/import coordination.
 * @packageDocumentation
 */
import { readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { accountId, type AccountRecord, type CredentialSlot, type FileCredentialStore, type OAuthCredentialSlot } from "../credentials.ts";
import type { ImporterConfig, ProviderConfig } from "./provider-types"; // Not imported; we rely on import structure
import type { HomeReader } from "./reader.ts";
import { parseJson, record, stringField } from "./shared.ts";

/** Non-destructive borrowed refresh/import mode. */
export type BorrowedRefreshMode = "write-back" | "reimport-only" | "never";

/** Prepared refresh plan produced by the borrowed credential coordinator. */
export interface BorrowedRefreshPlan {
	credential: OAuthCredentialSlot;
	refresh: boolean;
	mode: BorrowedRefreshMode;
}

/** Borrowed credential coordinator interface. */
export interface BorrowedCredentialCoordinator {
	prepare(account: AccountRecord, options?: { signal?: AbortSignal }): Promise<BorrowedRefreshPlan>;
	writeBack?(account: AccountRecord, newCredential: OAuthCredentialSlot, options?: { signal?: AbortSignal }): Promise<void>;
}

function getPath(document: Record<string, unknown>, path: string, sourceEntry?: string): unknown {
	const parts = (path || "").split(".");
	if (!parts.length || (parts.length === 1 && !parts[0])) return document[sourceEntry ?? ""] ?? document;
	const entry = sourceEntry ? document[sourceEntry] : document;
	if (typeof entry !== "object" || entry === null) return undefined;
	let current: Record<string, unknown> | unknown = entry;
	for (const part of parts) {
		if (!current || typeof current !== "object" || Array.isArray(current)) return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function setPath(document: Record<string, unknown>, path: string, value: unknown, sourceEntry?: string): void {
	const parts = (path || "").split(".");
	if (!parts.length || (parts.length === 1 && !parts[0])) {
		if (sourceEntry && typeof document[sourceEntry] === "object" && document[sourceEntry] !== null) {
			(document[sourceEntry] as Record<string, unknown>)[path] = value;
		} else {
			document[path] = value;
		}
		return;
	}
	let current: Record<string, unknown> = document;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i]!;
		if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	current[parts[parts.length - 1]!] = value;
}

export interface ConfiguredBorrowedCredentialCoordinatorOptions {
	declaration: (account: AccountRecord) => { importer: ImporterConfig; provider: ProviderConfig };
	sourceHome: string;
	documentReader?: (account: AccountRecord) => Promise<Record<string, unknown>>;
}

/** Configured borrowed credential coordinator for a specific source CLI. */
export class ConfiguredBorrowedCredentialCoordinator implements BorrowedCredentialCoordinator {
	readonly #sourceHome: string;
	readonly #declaration: ConfiguredBorrowedCredentialCoordinatorOptions["declaration"];

	constructor(options: ConfiguredBorrowedCredentialCoordinatorOptions) {
		this.#declaration = options.declaration;
		this.#sourceHome = options.sourceHome;
	}

	private sourceEntry(document: Record<string, unknown>, importer: ImporterConfig, account: AccountRecord): string | undefined {
		return account.metadata?.source_entry ?? (importer.path ? importer.path.split("/").pop() : undefined);
	}

	private async loadDocument(account: AccountRecord, importer: ImporterConfig): Promise<Record<string, unknown>> {
		if (this.#declaration) {
			const providerConfig = this.#declaration(account);
			return {}; // Simplified for keychain consolidation
		}
		const relative = account.metadata?.source_path ?? importer.path;
		if (!relative) throw new Error("Borrowed credential file path is not configured");
		const path = join(this.#sourceHome, relative);
		try {
			return parseJson(await readFile(path, "utf8"), `Borrowed credential source`) ?? {};
		} catch (e) {
			throw new Error("Borrowed credential source could not be read");
		}
	}

	async prepare(account: AccountRecord, options?: { signal?: AbortSignal }): Promise<BorrowedRefreshPlan> {
		const parsed = this.#declaration(account);
		const mode = parsed.importer.refresh ?? "never";
		const source = await this.loadDocument(account, parsed.importer);
		const mapping = parsed.importer.fieldMapping ?? {};
		const accessPath = mapping.access ?? "";
		const refreshPath = mapping.refresh ?? "";
		const expiresPath = mapping.expires ?? "";

		const rawAccess = accessPath ? getPath(source, accessPath) : undefined;
		const access = typeof rawAccess === "string" ? rawAccess : "";
		const refresh = refreshPath ? (getPath(source, refreshPath) as string | undefined) ?? "" : "";
		const expiresValue = expiresPath ? (getPath(source, expiresPath) as number | undefined | string) : undefined;

		let expires = 0;
		if (typeof expiresValue === "number") expires = (parsed.importer.formats?.expires === "epoch_seconds" ? expiresValue * 1000 : expiresValue);
		else if (typeof expiresValue === "string") expires = Date.parse(expiresValue);

		if (!access || !refresh) {
			throw new Error("Borrowed credential source is missing required token fields");
		}

		const credential: OAuthCredentialSlot = { type: "oauth", access, refresh, expires };

		if (expires > Date.now() + 30_000) {
			return { credential, refresh: false, mode: mode as BorrowedRefreshMode };
		}

		if (mode === "write-back" || mode === "reimport-only") {
			return { credential, refresh: true, mode: mode as BorrowedRefreshMode };
		}

		throw new Error(`Imported account ${account.id} is expired; run the source CLI to refresh or \`df login\` a df-owned account`);
	}

	async writeBack(account: AccountRecord, newCredential: OAuthCredentialSlot, options?: { signal?: AbortSignal }): Promise<void> {
		const parsed = this.#declaration(account);
		const importer = parsed.importer;
		if (importer.refresh !== "write-back") return;

		const relative = account.metadata?.source_path ?? importer.path;
		if (!relative) throw new Error("Borrowed credential file path is not configured");
		const path = join(this.#sourceHome, relative);

		let document: Record<string, unknown>;
		try {
			document = parseJson(await readFile(path, "utf8"), `Borrowed credential source`) ?? {};
		} catch {
			throw new Error("Borrowed credential source could not be read for write-back");
		}

		const entry = this.sourceEntry(document, importer, account);
		const mapping = importer.fieldMapping ?? {};
		if (mapping.access) setPath(document, mapping.access, newCredential.access, entry);
		if (mapping.refresh) setPath(document, mapping.refresh, newCredential.refresh, entry);
		if (mapping.expires) {
			const mode = (importer.formats?.expires ?? "");
			let formatted: unknown = newCredential.expires;
			if (mode === "epoch_seconds") formatted = Math.floor(newCredential.expires / 1000);
			else if (mode === "iso") formatted = new Date(newCredential.expires).toISOString();
			setPath(document, mapping.expires, formatted, entry);
		}

		const tempPath = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		let fileMode = 0o600;
		try {
			const statMod = await import("node:fs/promises").then((fs) => fs.stat(path).catch(() => null));
			if (statMod && typeof (statMod as { mode?: number }).mode === "number") fileMode = (statMod as { mode: number }).mode & 0o777;
		} catch { /* ignore */ }
		await writeFile(tempPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", mode: fileMode, flag: "wx" });
		await rename(tempPath, path);
	}
}
