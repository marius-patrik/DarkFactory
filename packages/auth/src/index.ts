/** @packageDocumentation
 * Browser-safe human GitHub authentication and session boundary for DarkFactory Web.
 *
 * Machine credentials and GitHub App private-key operations belong to keychain custody and are never exposed here.
 */
export type { AuthorAssociation } from "@darkfactory/protocol/workflow";
export * from "./client.ts";
export * from "./broker.ts";
export * from "./types.ts";
export * from "./permissions.ts";
