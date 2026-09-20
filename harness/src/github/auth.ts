/** Temporary migration facade; machine GitHub App credentials live in @darkfactory/keychain. */
export { AppInstallationTokenProvider, appIdentityFromManifest, resolveGitHubCredential } from "@darkfactory/keychain";
export type { GitHubAppIdentity } from "@darkfactory/keychain";
