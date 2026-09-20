export type { KeyringAdapter } from "@darkfactory/keychain";
export {
	importAntigravityAccount,
	OsKeyringAdapter,
	parseAntigravityKeyring,
} from "@darkfactory/keychain";
export type ImportFetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
