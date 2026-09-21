import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/** Metadata-only argv used to enumerate macOS keychain items. */
export const KEYCHAIN_ENUMERATION_ARGV: readonly string[] = ["dump-keychain"];

/** Read-only external keyring access used by credential importers. */
export interface ExternalKeyring {
	listServices(): Promise<Array<{ service: string; account: string | null }>>;
	read(service: string, account?: string | null): Promise<string | undefined>;
}

/** Parse service/account metadata from `security dump-keychain` output. */
export function parseKeychainDump(dump: string): Array<{ service: string; account: string | null }> {
	const items: Array<{ service: string; account: string | null }> = [];
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
		const serviceMatch = /^"svce"<blob>="(.*)"$/.exec(trimmed);
		if (serviceMatch) service = serviceMatch[1] ?? null;
		const accountMatch = /^"acct"<blob>="(.*)"$/.exec(trimmed);
		if (accountMatch) account = accountMatch[1] ?? null;
	}
	if (service) items.push({ service, account });
	const seen = new Set<string>();
	return items.filter((item) => {
		const key = `${item.service}\0${item.account ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/** Decode Go keyring base64 wrappers while leaving ordinary plaintext unchanged. */
export function decodeExternalKeyringPayload(value: string): string {
	const prefix = "go-keyring-base64:";
	if (!value.startsWith(prefix)) return value;
	try {
		return Buffer.from(value.slice(prefix.length), "base64").toString("utf8");
	} catch {
		return value;
	}
}

/** macOS read-only external keyring adapter. Other platforms return no entries. */
export class OsExternalKeyring implements ExternalKeyring {
	async listServices(): Promise<Array<{ service: string; account: string | null }>> {
		if (process.platform !== "darwin") return [];
		try {
			const { stdout } = await execFileAsync("security", [...KEYCHAIN_ENUMERATION_ARGV], { encoding: "utf8" });
			return parseKeychainDump(stdout);
		} catch {
			return [];
		}
	}

	async read(service: string, account?: string | null): Promise<string | undefined> {
		if (process.platform !== "darwin") return undefined;
		const args = ["find-generic-password", "-s", service];
		if (account) args.push("-a", account);
		args.push("-w");
		try {
			const { stdout } = await execFileAsync("security", args, { encoding: "utf8" });
			return stdout.trim() || undefined;
		} catch {
			return undefined;
		}
	}
}
