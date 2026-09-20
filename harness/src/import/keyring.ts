export type { ClaudeKeyring } from "@darkfactory/keychain";
export {
	CLAUDE_CREDENTIALS_SERVICE_PREFIX,
	decodeKeychainPayload,
	OsClaudeKeyringAdapter,
	parseKeychainDump,
} from "@darkfactory/keychain";
export const KEYCHAIN_ENUMERATION_ARGV: readonly string[] = ["dump-keychain"];
