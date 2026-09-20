/** @packageDocumentation
 * Browser-safe human GitHub authentication and session boundary for DarkFactory Web.
 *
 * Machine credentials, OAuth refresh/access tokens, client secrets and GitHub App private-key operations remain outside
 * this browser-safe root. Confidential token operations are exported only from `@darkfactory/auth/broker`.
 */
export type { AuthorAssociation } from "@darkfactory/protocol/workflow";
export * from "./client.ts";
export * from "./permissions.ts";
export type { BrowserSession } from "./types.ts";
