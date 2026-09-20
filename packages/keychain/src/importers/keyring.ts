/**
 * OS keychain enumeration and extraction utilities.
 * @packageDocumentation
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Claude Code keychain service-name prefix. */
export const CLAUDE_CREDENTIALS_SERVICE_PREFIX = "Claude Code-credentials";

/** Injectable keychain access so importers are testable without touching OS native keychains. */
export interface ClaudeKeyring {
	/** Lists available service names matching keychain patterns. */
	listServices(): Promise<string[]>;
	/** Reads raw payload for a service/account item. */
	read(service: string): Promise<string | undefined>;
}

/** Decodes keychain payloads, optionally stripping go-keyring b64 prefixes. */
export function decodeKeychainPayload(value: string): string {
	const prefix = "go-keyring-base64:";
	if (!value.startsWith(prefix)) return value;
	try {
		return Buffer.from(value.slice(prefix.length), "base64").toString("utf8");
	} catch {
		return value;
	}
}

/** Parses security dump output into service/account pairs. */
export function parseKeychainDump(dump: string): { service: string; account: string | null }[] {
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
 * macOS-only keychain adapter for Claude Code logins. Enumerates item metadata
 * then extracts payloads via find-generic-password -w.
 */
export class OsClaudeKeyringAdapter implements ClaudeKeyring {
	async listServices(): Promise<string[]> {
		if (process.platform !== "darwin") return [];
		try {
			const { stdout } = await execFileAsync("security", ["dump-keychain"], { encoding: "utf8" });
			return parseKeychainDump(stdout)
				.map((item) => item.service)
				.filter((service) => new RegExp(`^${CLAUDE_CREDENTIALS_SERVICE_PREFIX}`).test(service));
		} catch {
			return [];
		}
	}

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
