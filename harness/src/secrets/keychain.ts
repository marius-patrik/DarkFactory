/** Temporary migration facade; OS keychain custody lives in @darkfactory/keychain. */
export { deleteVaultKey, loadVaultKey, storeVaultKey } from "@darkfactory/keychain";
export type { CommandRunner, KeychainOptions } from "@darkfactory/keychain";
