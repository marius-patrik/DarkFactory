import { describe, it, expect, vi, beforeEach, afterEach } from "bun:test";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, rm, readdir, stat } from "fs/promises";
import { runGraph } from "../../src/graph/executor.ts";
import type { AgentNode, AutomationNode, GraphEvent, GraphNode, WorkflowGraph } from "../../src/graph/types.ts";
import type { NodeResult } from "../../src/graph/executor.ts";

// Fake handlers
const agentCalls: Array<{ nodeId: string; item: string }> = [];
const automationCalls: Array<{ nodeId: string; item: string }> = [];

const handlers = {
  agent: async (node: AgentNode, ctx: any): Promise<NodeResult> => {
    agentCalls.push({ nodeId: node.id, item: ctx.item as string });
    // Simulate success
    return {
      outcome: "success",
      outputs: {},
    };
  },
  automation: async (node: AutomationNode, ctx: any): Promise<NodeResult> => {
    automationCalls.push({ nodeId: node.id, item: ctx.item as string });
    // For the producer node, set the items output
    if (node.id === "producer") {
      return {
        outcome: "success",
        outputs: { items: ["a", "b", "c"] },
      };
    }
    return {
      outcome: "success",
      outputs: {},
    };
  },
};

function resetCalls() {
  agentCalls.length = 0;
  automationCalls.length = 0;
}

function createTestGraph(): WorkflowGraph {
  return {
    version: 1,
    checks: [],
    nodes: [
      {
        id: "producer",
        kind: "automation",
        script: "",
        outputs: ["items"],
        trigger: { event: "issues.opened" },
      },
      {
        id: "foreach_node",
        kind: "agent",
        reasoning: "standard",
        prompt: "",
        foreach: {
          items: "items",
          max_parallel: 2,
        },
      },
      {
        id: "consumer",
        kind: "automation",
        script: "",
        inputs: ["foreach_node_out"], // we don't actually use this, just to have an edge
      },
    ],
    edges: [
      { from: "producer", to: "foreach_node", on: { node_outcome: "success" } },
      { from: "foreach_node", to: "consumer", on: { children: "all_done" } },
    ],
  } as WorkflowGraph;
}

function createTestGraphWithFailure(): WorkflowGraph {
  return {
    version: 1,
    checks: [],
    nodes: [
      {
        id: "producer",
        kind: "automation",
        script: "",
        outputs: ["items"],
        trigger: { event: "issues.opened" },
      },
      {
        id: "foreach_node",
        kind: "agent",
        reasoning: "standard",
        prompt: "",
        foreach: {
          items: "items",
          max_parallel: 2,
        },
      },
      {
        id: "consumer",
        kind: "automation",
        script: "",
      },
    ],
    edges: [
      { from: "producer", to: "foreach_node", on: { node_outcome: "success" } },
      { from: "foreach_node", to: "consumer", on: { children: "any_failed" } },
    ],
  } as WorkflowGraph;
}

describe("foreach fan-out feature", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = join(tmpdir(), `foreach-test-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    await mkdir(testDir, { recursive: true });
    resetCalls();
  });

  afterEach(async () => {
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch (_) {
      // ignore
    }
  });

  it("should create child directories and respect max_parallel", async () => {
    const graph = createTestGraph();
    const startEvent: GraphEvent = {
      type: "issues.opened",
      actor: { login: "tester", association: "NONE", is_bot: false },
    };

    const finalState = await runGraph(graph, testDir, handlers, startEvent);

    // Check that the producer and consumer ran (automation)
    expect(automationCalls.length).toBe(2);
    const nodeIds = automationCalls.map((call) => call!.nodeId).sort();
    expect(nodeIds).toEqual(["consumer", "producer"].sort());
    // Check that the foreach node was called three times (agent)
    expect(agentCalls.length).toBe(3);
    // Check that the items were passed correctly
    const items = agentCalls.map((call) => call.item).sort();
    expect(items).toEqual(["a", "b", "c"].sort());
    // Check that child directories were created
    const childrenDir = join(testDir, "children");
    const childrenDirs = await readdir(childrenDir);
    expect(childrenDirs).toHaveLength(3);
    // Check that each child directory has a state.json and events.jsonl
    for (const dir of childrenDirs) {
      const childStatePath = join(childrenDir, dir, "state.json");
      const childEventsPath = join(childrenDir, dir, "events.jsonl");
      expect(await stat(childStatePath)).not.toBeNull();
      expect(await stat(childEventsPath)).not.toBeNull();
    }
    // Check that the consumer node ran (because all children succeeded)
    const consumerCalls = automationCalls.filter((call) => call.nodeId === "consumer");
    expect(consumerCalls.length).toBe(1);
  });

  it("should take any_failed edge when one child fails", async () => {
    // Create custom handlers that fail for item "b"
    const customHandlers = {
      agent: async (node: AgentNode, ctx: any): Promise<NodeResult> => {
        agentCalls.push({ nodeId: node.id, item: ctx.item as string });
        // Make the child with item "b" fail
        if (ctx.item === "b") {
          return {
            outcome: "failure",
            outputs: {},
          };
        }
        return {
          outcome: "success",
          outputs: {},
        };
      },
      automation: async (node: AutomationNode, ctx: any): Promise<NodeResult> => {
        automationCalls.push({ nodeId: node.id, item: ctx.item as string });
        if (node.id === "producer") {
          return {
            outcome: "success",
            outputs: { items: ["a", "b", "c"] },
          };
        }
        return {
          outcome: "success",
          outputs: {},
        };
      },
    };

    const graph = createTestGraphWithFailure();
    const startEvent: GraphEvent = {
      type: "issues.opened",
      actor: { login: "tester", association: "NONE", is_bot: false },
    };

    const testDir2 = join(tmpdir(), `foreach-test-fail-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
    await mkdir(testDir2, { recursive: true });

    try {
      const finalState = await runGraph(graph, testDir2, customHandlers, startEvent);
      // Check that the consumer node ran (because any_failed edge was taken)
      const consumerCalls = automationCalls.filter((call) => call.nodeId === "consumer");
      expect(consumerCalls.length).toBe(1);
      // Also check that the foreach node was called three times
      expect(agentCalls.length).toBe(3);
    } finally {
      await rm(testDir2, { recursive: true, force: true });
    }
  });
});