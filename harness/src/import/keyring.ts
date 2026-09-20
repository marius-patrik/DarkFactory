export {
	CLAUDE_CREDENTIALS_SERVICE_PREFIX,
	decodeKeychainPayload,
	parseKeychainDump,
	OsClaudeKeyringAdapter,
} from "@darkfactory/keychain";
export type { ClaudeKeyring } from "@darkfactory/keychain";
export const KEYCHAIN_ENUMERATION_ARGV: readonly string[] = ["dump-keychain"];
