/**
 * Native Cordis/DSH plugin entry for DarkFactory's existing durable workflow.
 *
 * The service delegates to the canonical DarkFactory graph executor. It
 * deliberately does not provide an agent driver, API endpoint, credential
 * authority, or a second workflow scheduler. DSH's loader owns the lifecycle.
 *
 * The minimal structural context keeps this transitional adapter independent
 * of a separately installed Cordis type package. Verify it with the real DSH
 * Host before selecting the first production composition.
 */
import { runGraph } from "../graph/executor.ts";

export const name = "darkfactory-workflow";

/** This plugin does not take ownership of DSH's agent/session services. */
export const inject: string[] = [];

export interface NativeWorkflowService {
	/** Reuse the exact graph executor; pass the caller's authorized handlers. */
	execute: typeof runGraph;
}

/** Minimal slice of the native Cordis Context.provide contract. */
export interface CordisServiceContext {
	provide(name: "dfWorkflow", service: NativeWorkflowService): unknown;
}

/**
 * Mount the workflow into the native Cordis service graph.
 *
 * Cordis owns withdrawing the provided service when this plugin unloads.
 * No execution begins at activation; requests must supply explicit handlers,
 * a graph event and their own durable run directory.
 */
export function apply(ctx: CordisServiceContext): void {
	ctx.provide("dfWorkflow", { execute: runGraph });
}
