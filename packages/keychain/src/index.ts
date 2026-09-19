/** @packageDocumentation
 * Machine credential custody boundary. Browser packages must never import this package.
 *
 * The FileCredentialStore adapter is temporary until #422 moves the implementation here.
 */
export {
	FileCredentialStore,
	defaultDfHome,
	parseAccountId,
	validateAccountRecord,
} from "../../../harness/src/credentials.ts";
export type {
	AccountRecord,
	Credential,
	CredentialFallback,
	CredentialSlot,
} from "../../../harness/src/credentials.ts";
