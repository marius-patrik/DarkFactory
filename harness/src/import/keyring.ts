import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Claude Code keychain service-name prefix (claude-credentials.ts:111-117). */
export const CLAUDE_CREDENTIALS_SERVICE_PREFIX = "Claude Code-credentials";

/** `security dump-keychain` argv — metadata only, never `-d`/`-w` (credential-source.ts:63). */
export const KEYCHAIN_ENUMERATION_ARGV: readonly string[] = ["dump-keychain"];

/**
 * Injectable keychain access so the Claude importer is testable without touching an OS keychain.
 */
export interface ClaudeKeyring {
	/**
	 * Lists all Claude Code keychain service names.
	 *
	 * @returns A list of service names.
	 */
	listServices(): Promise<string[]>;
	/**
	 * Reads the secret for a Claude Code keychain service.
	 *
	 * @param service - The keychain service name.
	 * @returns The stored secret, or undefined if not found.
	 */
	read(service: string): Promise<string | undefined>;
}

/**
 * A service and account pair from a keychain dump.
 *
 * @param service - The keychain service name.
 * @param account - The account name, or null if absent.
 */
export interface KeychainDumpEntry {
	/** The keychain service name. */
	service: string;
	/** The account name, or null if absent. */
	account: string | null;
}

/**
 * Parses the output of `security dump-keychain` into service/account pairs.
 *
 * @param dump - The raw keychain dump string.
 * @returns A deduplicated list of service and account objects.
 */
export function parseKeychainDump(dump: string): KeychainDumpEntry[] {
	const items: { service: string; account: string | null }[] = [];
	let service: string | null = null;
	let account: string | null = null;
	for (const line of dump.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (trimmed.startsWith("keychain:")) {
			if (service) items.push({ service, account });
			service = null;
			account = null;
			continue;
		}
		const svce = /^"svce"<blob>="(.*)"$/.exec(trimmed);
		if (svce) service = svce[1] ?? null;
		const acct = /^"acct"<blob>="(.*)"$/.exec(trimmed);
		if (acct) account = acct[1] ?? null;
	}
	if (service) items.push({ service, account });
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = `${item.service}${item.account ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	}).map((item) => ({ service: item.service, account: item.account }));
}

/**
 * Decodes a keychain payload value, unwrapping the `go-keyring-base64:` prefix
 * if present.
 *
 * @param value - The raw payload string.
 * @returns The decoded UTF-8 string.
 */
export function decodeKeychainPayload(value: string): string {
	const prefix = "go-keyring-base64:";
	if (!value.startsWith(prefix)) return value;
	try {
		return Buffer.from(value.slice(prefix.length), "base64").toString("utf8");
	} catch {
		return value;
	}
}

/**
 * macOS-only keychain adapter for Claude Code logins. Enumerates item metadata
 * without decrypting anything (`dump-keychain`, no data flags), then releases
 * exactly one `Claude Code-credentials*` service with `find-generic-password -w`.
 * On other platforms there is no Claude keychain login to find.
 */
export class OsClaudeKeyringAdapter implements ClaudeKeyring {
	/**
	 * Lists all Claude Code keychain service names on macOS.
	 *
	 * @returns A sorted list of service names matching the Claude Code prefix.
	 */
	async listServices(): Promise<string[]> {
		if (process.platform !== "darwin") return [];
		try {
			const { stdout } = await execFileAsync("security", [...KEYCHAIN_ENUMERATION_ARGV], { encoding: "utf8" });
			return parseKeychainDump(stdout)
				.map((item) => item.service)
				.filter((service) => new RegExp(`^${CLAUDE_CREDENTIALS_SERVICE_PREFIX}`).test(service));
		} catch {
			return [];
		}
	}

	/**
	 * Reads the secret for a Claude Code keychain service.
	 *
	 * @param service - The keychain service name.
	 * @returns The stored secret, or undefined if not found.
	 */
	async read(service: string): Promise<string | undefined> {
		if (process.platform !== "darwin") return undefined;
		try {
			const { stdout } = await execFileAsync("security", ["find-generic-password", "-s", service, "-w"], { encoding: "utf8" });
			return stdout.trim() || undefined;
		} catch {
			return undefined;
		}
	}
}