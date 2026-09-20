/** Temporary migration facade; machine GitHub App credentials live in @darkfactory/keychain. */

export type { GitHubAppIdentity } from "@darkfactory/keychain";
export { AppInstallationTokenProvider, appIdentityFromManifest, resolveGitHubCredential } from "@darkfactory/keychain";
