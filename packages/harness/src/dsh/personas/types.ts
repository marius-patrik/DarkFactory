/**
 * Migrated with provenance from dsh-stack:
 * packages/stack/agents/agents/src/types.ts
 * commit 8752dad1514cd10966db6859c449f0cba941b57f; MIT license.
 */
/**
 * Structural host types for the live-persona controller. The plugin runs
 * inside the harness but declares no runtime dependency on harness-internal
 * packages; these narrow faces cover only the seams `PersonaController` and
 * the `persona:policy` section touch — the session log, the composed-preset
 * header, the pre-step hook, and the prompt-section context.
 * @module agents/types
 */

/** A session log event as the controller folds it. */
export interface HostSessionEvent {
	type: string;
	data?: Record<string, unknown>;
}

/** The `persona/selected` event payload. */
export interface PersonaSelectedData {
	personaId: string;
}

/** The narrow session face: the log, the composed preset id, and append. */
export interface HostSession {
	readonly events: readonly HostSessionEvent[];
	readonly header?: { readonly agentPreset?: string };
	append(type: string, data: unknown): unknown;
}

/** The narrow agent face the controller and section receive. */
export interface HostAgent {
	readonly session: HostSession;
}

/** The pre-step waterfall decision the controller observes. */
export interface PreStepDecision {
	readonly kind: string;
}

/** Controller state: the persona in force, plus any queued selection. */
export interface PersonaState {
	/** The committed persona id, or `''` before the first selection. */
	personaId: string;
	/** A selection awaiting the next accepted in-turn pre-step, when any. */
	pending?: string;
}

/** The client wire value of the `persona` session projection. */
export interface PersonaProjection {
	/** The persona id in force; `''` when the session has none. */
	personaId: string;
	/** True while a `/persona` selection awaits its `persona/selected` commit. */
	pending: boolean;
}
