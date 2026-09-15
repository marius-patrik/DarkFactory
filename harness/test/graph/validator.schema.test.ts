import { describe, expect, test } from "bun:test";
import graph from "../../assets/graph.darkfactory.json";
import { GraphValidationError, validateGraph } from "../../src/graph/index.ts";

function invalidate(change: (value: any) => void): string[] {
  const value = structuredClone(graph) as any;
  change(value);
  try {
    validateGraph(value);
  } catch (error) {
    expect(error).toBeInstanceOf(GraphValidationError);
    return (error as GraphValidationError).issues;
  }
  throw new Error("expected validation failure");
}

function canValidate(change: (value: any) => void) {
  const value = structuredClone(graph) as any;
  change(value);
  expect(validateGraph(value)).toBeDefined();
}

describe("AgentNode schema extensions", () => {
  test("valid AgentNode with all new fields passes", () => {
    canValidate((g) => {
      const node = g.nodes.find((n: any) => n.kind === "agent");
      if (!node) throw new Error("no agent node");
      node.prompt = "You are a helpful assistant";
      node.mode = "write";
      node.workdir = "./tmp";
      node.max_turns = 5;
    });
  });

  test("invalid mode value is rejected", () => {
    expect(invalidate((g) => {
      const node = g.nodes.find((n: any) => n.kind === "agent");
      if (!node) throw new Error("no agent node");
      node.mode = "execute";
    })).toEqual(expect.arrayContaining([expect.stringContaining("mode")]));
  });

  test("missing prompt with mode write still passes", () => {
    canValidate((g) => {
      const node = g.nodes.find((n: any) => n.kind === "agent");
      if (!node) throw new Error("no agent node");
      delete node.prompt; // ensure not present
      node.mode = "write";
    });
  });

  test("non‑string prompt is rejected", () => {
    expect(invalidate((g) => {
      const node = g.nodes.find((n: any) => n.kind === "agent");
      if (!node) throw new Error("no agent node");
      // @ts-ignore deliberately set wrong type
      node.prompt = 123;
    })).toEqual(expect.arrayContaining([expect.stringContaining("prompt")]));
  });

  test("rejects graph missing required top-level fields", () => {
    const missingVersion = invalidate((g) => delete g.version);
    expect(missingVersion.some((i) => i.toLowerCase().includes("version") && i.toLowerCase().includes("invalid input"))).toBe(true);
    const missingChecks = invalidate((g) => delete g.checks);
    expect(missingChecks.some((i) => i.toLowerCase().includes("checks") && i.toLowerCase().includes("invalid input"))).toBe(true);
    const missingNodes = invalidate((g) => delete g.nodes);
    expect(missingNodes.some((i) => i.toLowerCase().includes("nodes") && i.toLowerCase().includes("invalid input"))).toBe(true);
    const missingEdges = invalidate((g) => delete g.edges);
    expect(missingEdges.some((i) => i.toLowerCase().includes("edges") && i.toLowerCase().includes("invalid input"))).toBe(true);
  });
});
