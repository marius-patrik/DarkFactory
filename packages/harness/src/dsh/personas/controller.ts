/**
 * Migrated with provenance from dsh-stack:
 * packages/stack/agents/agents/src/controller.ts
 * commit 8752dad1514cd10966db6859c449f0cba941b57f; MIT license.
 *
 * Durable persona selection is kept distinct from native DSH agent presets.
 * Activation and prompt-section wiring are NOT migrated by this pure module.
 */
/**
 * Live persona state: one durable `persona/selected` session-log event per
 * session, folded on read (last one wins), with selections made during an
 * open turn kept pending and committed at the next accepted in-turn pre-step.
 * This mirrors the harness's own plan-mode controller (`plan/mode`): UIs
 * observe committed flips through `session/event`, and resume/fork restore
 * the state from the log alone because events never re-fire on seeded logs.
 * @module agents/controller
 */

import type {
  HostAgent,
  HostSession,
  HostSessionEvent,
  PersonaSelectedData,
  PersonaState,
} from "./types.js";

/** The session-log event that records a committed persona switch. */
export const PERSONA_SELECTED = "persona/selected";

/**
 * Fold the last committed persona from `events[0, end)`. A prefix with no
 * `persona/selected` event folds to `''`.
 * @param events - the session log or any prefix of it.
 * @param end - fold `events[0, end)`; defaults to the whole log.
 * @returns the persona id in force, or `''` when none has been selected.
 */
export function foldPersona(events: readonly HostSessionEvent[], end = events.length): string {
  let personaId = "";
  let index = 0;
  for (const event of events) {
    if (index >= end) break;
    index++;
    if (event.type !== PERSONA_SELECTED) continue;
    const data = event.data as PersonaSelectedData | undefined;
    if (typeof data?.personaId === "string" && data.personaId !== "") personaId = data.personaId;
  }
  return personaId;
}

/** Whether the log holds an opened turn without its closing `turn/end`. */
export function hasOpenTurn(events: readonly HostSessionEvent[]): boolean {
  let open = false;
  for (const event of events) {
    if (event.type === "turn/start") open = true;
    else if (event.type === "turn/end") open = false;
  }
  return open;
}

/** The controller's catalog hook, so a switch can never select a phantom. */
export interface PersonaControllerOptions {
  /** Whether the given persona id exists in the runtime catalog. */
  resolve(personaId: string): boolean;
}

/**
 * `PersonaController`: owns each session's live persona. `set()` appends
 * immediately between turns and queues during an open turn; `commitPending()`
 * appends a queued selection at the next accepted in-turn pre-step, before
 * its request assembly. Repeated selection of the current or already-queued
 * state is a no-op.
 */
export class PersonaController {
  /** Latest selection per session awaiting the next accepted in-turn pre-step. */
  private readonly pendingIntents = new WeakMap<object, string>();

  /** Constructs an instance. */
  constructor(private readonly options: PersonaControllerOptions) {}

  /** The committed persona plus any queued selection for the agent's session. */
  get(agent: HostAgent): PersonaState {
    const pending = this.pendingIntents.get(agent.session);
    const personaId = foldPersona(agent.session.events);
    return pending === undefined ? { personaId } : { personaId, pending };
  }

  /** A queued selection for the agent's session, when any. */
  pendingOf(agent: HostAgent): string | undefined {
    return this.pendingIntents.get(agent.session);
  }

  /**
   * Select the persona for an agent's session. Between turns the method
   * appends the change immediately because no in-turn pre-step will run until
   * another prompt starts a turn. During an open turn the selection stays
   * pending until the next accepted in-turn pre-step.
   * @param agent - the agent whose session switches.
   * @param personaId - the persona to switch to; must resolve in the catalog.
   * @returns what happened: `committed` (logged now), `queued` (awaiting the
   * next accepted in-turn pre-step), `cancelled` (an opposite queued selection
   * was cleared; the logged state already matches), or `noop`.
   * @throws when the persona id is not in the runtime catalog.
   */
  set(agent: HostAgent, personaId: string): "committed" | "queued" | "cancelled" | "noop" {
    if (!this.options.resolve(personaId)) throw new Error(`Unknown persona: ${personaId}`);
    const session = agent.session;
    const pending = this.pendingIntents.get(session);
    const target = pending ?? foldPersona(session.events);
    if (personaId === target) return "noop";
    if (hasOpenTurn(session.events)) {
      this.pendingIntents.set(session, personaId);
      return foldPersona(session.events) === personaId ? "cancelled" : "queued";
    }
    if (personaId === foldPersona(session.events)) {
      this.pendingIntents.delete(session);
      return "cancelled";
    }
    session.append(PERSONA_SELECTED, { personaId });
    this.pendingIntents.delete(session);
    return "committed";
  }

  /**
   * Append one queued selection before the next request assembly. Delete only
   * after the append succeeds, so a failed durable write leaves the selection
   * retryable at a later accepted in-turn pre-step, not dropped.
   */
  commitPending(session: HostSession): void {
    const pending = this.pendingIntents.get(session);
    if (pending === undefined) return;
    if (pending === foldPersona(session.events)) {
      this.pendingIntents.delete(session);
      return;
    }
    session.append(PERSONA_SELECTED, { personaId: pending });
    this.pendingIntents.delete(session);
  }
}
