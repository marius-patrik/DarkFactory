import { describe, expect, test } from "bun:test";
import { apply, name, type NativeWorkflowService } from "../../../packages/harness/src/dsh/workflow.ts";
import { runGraph } from "../../../packages/harness/src/graph/executor.ts";
import {
  PERSONA_SELECTED,
  PersonaController,
  foldPersona,
  hasOpenTurn,
} from "../../../packages/harness/src/dsh/personas/controller.ts";
import type { HostAgent, HostSession, HostSessionEvent } from "../../../packages/harness/src/dsh/personas/types.ts";

describe("native DSH workflow service", () => {
  test("is a Cordis plugin that provides the canonical executor, not another graph engine", () => {
    const registrations = new Map<string, NativeWorkflowService>();
    apply({
      provide(key, service) {
        if (registrations.has(key)) throw new Error("duplicate service");
        registrations.set(key, service);
      },
    });
    expect(name).toBe("darkfactory-workflow");
    expect(registrations.size).toBe(1);
    expect(registrations.get("dfWorkflow")?.execute).toBe(runGraph);
  });
});

function session(initial: HostSessionEvent[] = []): HostSession {
  const events = [...initial];
  return {
    get events() {
      return events;
    },
    append(type, data) {
      events.push({ type, data: data as Record<string, unknown> });
    },
  };
}

describe("dsh-stack persona behavior preserved in native migration", () => {
  test("persona selection between turns appends exactly one event", () => {
    const s = session();
    const controller = new PersonaController({ resolve: (id) => id === "reviewer" });
    const agent: HostAgent = { session: s };
    expect(controller.set(agent, "reviewer")).toBe("committed");
    expect(controller.set(agent, "reviewer")).toBe("noop");
    expect(s.events).toEqual([{ type: PERSONA_SELECTED, data: { personaId: "reviewer" } }]);
    expect(controller.get(agent)).toEqual({ personaId: "reviewer" });
    expect(() => controller.set(agent, "nonexistent")).toThrow("Unknown persona");
  });

  test("open-turn switch defers the durable change until an accepted step", () => {
    const s = session([{ type: "turn/start" }]);
    const controller = new PersonaController({ resolve: (id) => ["reviewer", "planner"].includes(id) });
    const agent: HostAgent = { session: s };
    expect(hasOpenTurn(s.events)).toBe(true);
    expect(controller.set(agent, "reviewer")).toBe("queued");
    expect(foldPersona(s.events)).toBe("");
    expect(controller.set(agent, "planner")).toBe("queued");
    expect(controller.get(agent)).toEqual({ personaId: "", pending: "planner" });
    controller.commitPending(s);
    controller.commitPending(s);
    expect(s.events.filter((e) => e.type === PERSONA_SELECTED)).toEqual([
      { type: PERSONA_SELECTED, data: { personaId: "planner" } },
    ]);
    expect(controller.get(agent)).toEqual({ personaId: "planner" });
  });

  test("failed durable append preserves the intent for retry", () => {
    const events: HostSessionEvent[] = [{ type: "turn/start" }];
    let failOnce = true;
    const s: HostSession = {
      events,
      append(type, data) {
        if (failOnce) {
          failOnce = false;
          throw new Error("write failed");
        }
        events.push({ type, data: data as Record<string, unknown> });
      },
    };
    const controller = new PersonaController({ resolve: (id) => id === "reviewer" });
    expect(controller.set({ session: s }, "reviewer")).toBe("queued");
    expect(() => controller.commitPending(s)).toThrow("write failed");
    expect(controller.pendingOf({ session: s })).toBe("reviewer");
    controller.commitPending(s);
    expect(foldPersona(s.events)).toBe("reviewer");
  });
});
