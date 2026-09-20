/** @packageDocumentation
 * Shared DarkFactory web rendering and operator-UI package boundary.
 *
 * Build-time documentation rendering is exposed from `@darkfactory/web/docs`. Browser code consumes only browser-safe
 * protocol/GitHub/auth contracts and never imports machine-secret keychain implementations.
 */
export type { RouteResult, TaskProfile } from "@darkfactory/protocol/model";
export { DarkFactoryShell, Router, Route, useRouter, RouteLink, type RouteConfig } from "./web-shell";
