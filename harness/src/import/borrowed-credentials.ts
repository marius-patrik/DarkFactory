import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { AuthOperationOptions, OAuthCredential } from "@earendil-works/pi-ai";
import type { AccountRecord, BorrowedCredentialCoordinator, BorrowedRefreshPlan } from "../credentials.ts";
import type { ImporterConfig, ProviderConfig } from "../providers/schema.ts";
import type { KeyringAdapter } from "./antigravity.ts";
import { decodeKeychainPayload } from "./keyring.ts";
import { jwtClaims } from "./shared.ts";

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

function expiry(value: unknown, format: ImporterConfig["formats"] extends infer T ? T : never): number | undefined {
	const mode = (format as ImporterConfig["formats"] | undefined)?.expires;
	if (mode === "iso") return typeof value === "string" ? Date.parse(value) : undefined;
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return mode === "epoch_seconds" ? value * 1_000 : value;
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
		const source = await this.document(account, importer);
		const credential = mappedCredential(source.value, importer, provider, account);
		if (credential.expires > Date.now() + REFRESH_SKEW_MS) return { credential, refresh: false };
		throw new Error(`Imported account ${account.id} is expired; re-import it from its source CLI`);
	}
}
