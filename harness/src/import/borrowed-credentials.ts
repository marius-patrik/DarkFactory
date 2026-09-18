import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AuthOperationOptions, OAuthCredential } from "@earendil-works/pi-ai";
import type { AccountRecord, BorrowedCredentialCoordinator, BorrowedRefreshPlan, BorrowedRefreshMode, OAuthCredentialSlot } from "../credentials.ts";
import type { ImporterConfig, ProviderConfig } from "../providers/schema.ts";
import type { KeyringAdapter } from "./antigravity.ts";
import { decodeKeychainPayload } from "./keyring.ts";
import { jwtClaims } from "./shared.ts";
import { withFileLock } from "../storage/file-lock.ts";

const REFRESH_SKEW_MS = 30_000;

function record(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} has an invalid shape`);
	return value as Record<string, unknown>;
}

function resolvedPath(path: string, sourceEntry?: string): string[] {
	return path.split(".").map((part) => part === "*" ? sourceEntry ?? "" : part);
}

function getPath(document: Record<string, unknown>, path: string, sourceEntry?: string): unknown {
	let value: unknown = document;
	for (const part of resolvedPath(path, sourceEntry)) {
		if (!part || !value || typeof value !== "object" || Array.isArray(value)) return undefined;
		value = (value as Record<string, unknown>)[part];
	}
	return value;
}

function setPath(document: Record<string, unknown>, path: string, value: unknown, sourceEntry?: string): void {
	const parts = resolvedPath(path, sourceEntry);
	let current: Record<string, unknown> = document;
	for (let i = 0; i < parts.length - 1; i++) {
		const part = parts[i];
		if (!part) return;
		if (!current[part] || typeof current[part] !== "object" || Array.isArray(current[part])) {
			current[part] = {};
		}
		current = current[part] as Record<string, unknown>;
	}
	const last = parts[parts.length - 1];
	if (last) current[last] = value;
}

function expiry(value: unknown, format: ImporterConfig["formats"] extends infer T ? T : never): number | undefined {
	const mode = (format as ImporterConfig["formats"] | undefined)?.expires;
	if (mode === "iso") return typeof value === "string" ? Date.parse(value) : undefined;
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return mode === "epoch_seconds" ? value * 1_000 : value;
}

function formatExpiry(value: number, format: ImporterConfig["formats"] extends infer T ? T : never): unknown {
	const mode = (format as ImporterConfig["formats"] | undefined)?.expires;
	if (mode === "iso") return new Date(value).toISOString();
	return mode === "epoch_seconds" ? Math.floor(value / 1_000) : value;
}

function sourceEntry(document: Record<string, unknown>, importer: ImporterConfig, account: AccountRecord): string | undefined {
	const stored = account.metadata?.source_entry;
	if (stored) return stored;
	const wildcard = Object.values(importer.fieldMapping).some((path) => path.split(".").includes("*"));
	return wildcard ? Object.keys(document).sort()[0] : undefined;
}

function mappedCredential(document: Record<string, unknown>, importer: ImporterConfig, provider: ProviderConfig, account: AccountRecord): OAuthCredential {
	const entry = sourceEntry(document, importer, account);
	const access = getPath(document, importer.fieldMapping.access ?? "", entry);
	const refresh = getPath(document, importer.fieldMapping.refresh ?? "", entry);
	if (typeof access !== "string" || !access || typeof refresh !== "string" || !refresh) throw new Error("Borrowed credential source is missing its OAuth token fields");
	const mappedExpiry = importer.fieldMapping.expires ? expiry(getPath(document, importer.fieldMapping.expires, entry), importer.formats) : undefined;
	const jwtExpiry = jwtClaims(access)?.exp;
	const expires = mappedExpiry ?? (typeof jwtExpiry === "number" && Number.isFinite(jwtExpiry) ? jwtExpiry * 1_000 : undefined);
	if (!expires || !Number.isFinite(expires)) throw new Error("Borrowed credential source has no valid access token expiry");
	const old = account.slots.oauth;
	const claimPath = provider.auth.find((auth) => auth.kind === "oauth")?.accountIdJwtClaim;
	let claim: unknown = jwtClaims(access);
	for (const part of claimPath ?? []) claim = claim && typeof claim === "object" ? (claim as Record<string, unknown>)[part] : undefined;
	const accountId = typeof claim === "string" && claim ? claim : old?.type === "oauth" ? old.accountId : undefined;
	return { type: "oauth", access, refresh, expires, ...(accountId ? { accountId } : {}) };
}

export class ConfiguredBorrowedCredentialCoordinator implements BorrowedCredentialCoordinator {
	private readonly importers = new Map<string, { importer: ImporterConfig; provider: ProviderConfig }>();

	constructor(private readonly sourceHome: string, providers: readonly ProviderConfig[], private readonly keyring: KeyringAdapter) {
		for (const provider of providers) for (const importer of provider.importers ?? []) this.importers.set(importer.id, { importer, provider });
	}

	private declaration(account: AccountRecord) {
		const id = account.metadata?.importer;
		const found = id ? this.importers.get(id) : undefined;
		if (!found) throw new Error(`Imported account ${account.id} has no configured source importer`);
		return found;
	}

	private async document(account: AccountRecord, importer: ImporterConfig): Promise<{ value: Record<string, unknown>; path?: string }> {
		if (account.metadata?.source_kind === "keyring" || importer.keyring) {
			const service = account.metadata?.source_service ?? importer.keyring?.service;
			const keyAccount = account.metadata?.source_account ?? importer.keyring?.account;
			if (!service) throw new Error("Borrowed keyring source is not configured");
			const raw = await this.keyring.read(service, keyAccount);
			if (!raw) throw new Error("Borrowed credential is no longer present in the OS keyring");
			return { value: record(JSON.parse(decodeKeychainPayload(raw)) as unknown, "Borrowed keyring credential") };
		}
		const relative = account.metadata?.source_path ?? importer.path;
		if (!relative) throw new Error("Borrowed credential file path is not configured");
		const path = join(this.sourceHome, relative);
		let parsed: unknown;
		try { parsed = JSON.parse(await readFile(path, "utf8")); }
		catch (error) { if (error instanceof SyntaxError) throw new Error("Borrowed credential source contains invalid JSON"); throw error; }
		return { value: record(parsed, "Borrowed credential source"), path };
	}

	async prepare(account: AccountRecord, options?: AuthOperationOptions): Promise<BorrowedRefreshPlan> {
		options?.signal?.throwIfAborted();
		const { importer, provider } = this.declaration(account);
		const mode = importer.refresh ?? "never";
		const source = await this.document(account, importer);
		const credential = mappedCredential(source.value, importer, provider, account);
		
		// If the source has a newer valid token, use it without refreshing
		if (credential.expires > Date.now() + REFRESH_SKEW_MS) {
			return { credential: credential as OAuthCredentialSlot, refresh: false, mode };
		}
		
		// Token is expired or about to expire
		if (mode === "write-back" || mode === "reimport-only") {
			// For write-back and reimport-only, we signal that a refresh is needed
			// The actual refresh will be done by the caller (AccountCredentialStore.modify)
			// which calls the OAuth refresh function
			return { credential: credential as OAuthCredentialSlot, refresh: true, mode };
		}
		
		// For "never" mode, we never refresh
		throw new Error(`Imported account ${account.id} is expired; run the source CLI to refresh or \`df login\` a df-owned account`);
	}

	/**
	 * Write the rotated OAuth tokens back to the source file/keyring.
	 * Called after a successful refresh when the importer mode is "write-back".
	 */
	async writeBack(account: AccountRecord, newCredential: OAuthCredentialSlot, options?: AuthOperationOptions): Promise<void> {
		options?.signal?.throwIfAborted();
		const { importer } = this.declaration(account);
		const mode = importer.refresh ?? "never";
		if (mode !== "write-back") return;
		
		if (account.metadata?.source_kind === "keyring" || importer.keyring) {
			// Keyring write-back not implemented yet - would require OS-specific keyring write
			// For now, we skip keyring write-back
			return;
		}
		
		const relative = account.metadata?.source_path ?? importer.path;
		if (!relative) throw new Error("Borrowed credential file path is not configured");
		const path = join(this.sourceHome, relative);
		
		// Read the current source file to preserve other fields
		let document: Record<string, unknown>;
		try {
			document = record(JSON.parse(await readFile(path, "utf8")), "Borrowed credential source");
		} catch (error) {
			if (error instanceof SyntaxError) throw new Error("Borrowed credential source contains invalid JSON");
			throw error;
		}
		
		const entry = sourceEntry(document, importer, account);
		
		// Update the token fields in the document
		setPath(document, importer.fieldMapping.access ?? "", newCredential.access, entry);
		setPath(document, importer.fieldMapping.refresh ?? "", newCredential.refresh, entry);
		if (importer.fieldMapping.expires) {
			setPath(document, importer.fieldMapping.expires, formatExpiry(newCredential.expires, importer.formats), entry);
		}
		
		// Atomic write: temp file + rename, preserve file mode
		const tempPath = `${path}.${process.pid}.${crypto.randomUUID()}.tmp`;
		let fileMode = 0o600;
		try {
			const stat = await import("node:fs/promises").then(fs => fs.stat(path)).catch(() => null);
			if (stat) fileMode = stat.mode & 0o777;
		} catch {}
		
		await writeFile(tempPath, `${JSON.stringify(document, null, 2)}\n`, { encoding: "utf8", mode: fileMode, flag: "wx" });
		await rename(tempPath, path);
	}
}