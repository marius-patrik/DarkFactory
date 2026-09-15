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
});
