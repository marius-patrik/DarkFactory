import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type {
	AccountRecord,
	BorrowedCredentialCoordinator,
	BorrowedCredentialPlan,
	OAuthCredentialSlot,
} from "./credentials.ts";
import { decodeExternalKeyringPayload, type ExternalKeyring } from "./external-keyring.ts";

/** Supported expiry representations in external CLI credential documents. */
export type ExternalExpiryFormat = "epoch_ms" | "epoch_seconds" | "iso";

/** Declarative mapping for one borrowed external credential source. */
export interface ExternalCredentialSourceConfig {
	id: string;
	path?: string;
	keyring?: { service: string; account?: string };
	fields: {
		access: string;
		refresh: string;
		expires: string;
		accountId?: string;
	};
	expires?: ExternalExpiryFormat;
	mode?: "reimport-only" | "never";
}

function object(value: unknown, label: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} has an invalid shape`);
	return value as Record<string, unknown>;
}

function pathParts(path: string, sourceEntry?: string): string[] {
	return path.split(".").map((part) => (part === "*" ? (sourceEntry ?? "") : part));
}

function getPath(document: Record<string, unknown>, path: string, sourceEntry?: string): unknown {
	let current: unknown = document;
	for (const part of pathParts(path, sourceEntry)) {
		if (!part || !current || typeof current !== "object" || Array.isArray(current)) return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

function expiry(value: unknown, format: ExternalExpiryFormat): number | undefined {
	if (format === "iso") {
		if (typeof value !== "string") return undefined;
		const parsed = Date.parse(value);
		return Number.isFinite(parsed) ? parsed : undefined;
	}
	if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
	return format === "epoch_seconds" ? value * 1_000 : value;
}

function sourceEntry(
	document: Record<string, unknown>,
	config: ExternalCredentialSourceConfig,
	account: AccountRecord,
): string | undefined {
	const stored = account.metadata?.source_entry;
	if (stored) return stored;
	const wildcard = Object.values(config.fields).some((path) => path.split(".").includes("*"));
	return wildcard ? Object.keys(document).sort()[0] : undefined;
}

/**
 * Read-only coordinator for credentials owned by external CLIs.
 *
 * It may re-read a source file or keyring item, but it never writes or rotates
 * the source. Provider refresh remains disabled by `FileCredentialStore`.
 */
export class ConfiguredBorrowedCredentialCoordinator implements BorrowedCredentialCoordinator {
	private readonly sources = new Map<string, ExternalCredentialSourceConfig>();

	constructor(
		private readonly sourceHome: string,
		configs: readonly ExternalCredentialSourceConfig[],
		private readonly keyring?: ExternalKeyring,
	) {
		for (const config of configs) {
			if (this.sources.has(config.id)) throw new Error(`Duplicate borrowed credential source: ${config.id}`);
			this.sources.set(config.id, config);
		}
	}

	private config(account: AccountRecord): ExternalCredentialSourceConfig {
		const id = account.metadata?.importer;
		const config = id ? this.sources.get(id) : undefined;
		if (!config) throw new Error(`Borrowed account ${account.id} has no configured source importer`);
		return config;
	}

	private async document(
		account: AccountRecord,
		config: ExternalCredentialSourceConfig,
	): Promise<Record<string, unknown>> {
		if (account.metadata?.source_kind === "keyring" || config.keyring) {
			if (!this.keyring) throw new Error("External keyring source is not available");
			const service = account.metadata?.source_service ?? config.keyring?.service;
			const keyAccount = account.metadata?.source_account ?? config.keyring?.account;
			if (!service) throw new Error("External keyring source is not configured");
			const raw = await this.keyring.read(service, keyAccount);
			if (!raw) throw new Error("Borrowed credential is no longer present in the external keyring");
			return object(JSON.parse(decodeExternalKeyringPayload(raw)) as unknown, "Borrowed keyring credential");
		}
		const relative = account.metadata?.source_path ?? config.path;
		if (!relative) throw new Error("Borrowed credential file path is not configured");
		try {
			return object(
				JSON.parse(await readFile(join(this.sourceHome, relative), "utf8")) as unknown,
				"Borrowed credential source",
			);
		} catch (error) {
			if (error instanceof SyntaxError) throw new Error("Borrowed credential source contains invalid JSON");
			throw error;
		}
	}

	async prepare(account: AccountRecord): Promise<BorrowedCredentialPlan> {
		const config = this.config(account);
		const document = await this.document(account, config);
		const entry = sourceEntry(document, config, account);
		const access = getPath(document, config.fields.access, entry);
		const refresh = getPath(document, config.fields.refresh, entry);
		const expires = expiry(getPath(document, config.fields.expires, entry), config.expires ?? "epoch_ms");
		if (typeof access !== "string" || !access || typeof refresh !== "string" || !refresh) {
			throw new Error("Borrowed credential source is missing its OAuth token fields");
		}
		if (!expires || !Number.isFinite(expires))
			throw new Error("Borrowed credential source has no valid access token expiry");
		const rawAccountId = config.fields.accountId ? getPath(document, config.fields.accountId, entry) : undefined;
		const credential: OAuthCredentialSlot = {
			type: "oauth",
			access,
			refresh,
			expires,
			...(typeof rawAccountId === "string" && rawAccountId ? { accountId: rawAccountId } : {}),
		};
		return { credential, mode: config.mode ?? "reimport-only" };
	}
}
