import { test, expect } from "bun:test";
import { runGraph, type NodeContext, type NodeHandlers, type NodeResult } from "../../src/graph/executor.ts";
import type { AgentNode, AutomationNode, GraphEvent, RunState, WorkflowGraph } from "../../src/graph/types.ts";
import { writeFile, mkdir, rm } from "fs/promises";
import { existsSync, readFileSync } from "fs";

// Helper to create a temporary directory
async function mkdtemp(): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const dir = `./tmp-run-${id}`;
  await mkdir(dir, { recursive: true });
  return dir;
}

// Helper to remove a directory
async function rmdir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

// Minimal workflow graph with two sequential agent nodes
const graph: WorkflowGraph = {
  version: 1,
  checks: [],
  nodes: [
    {
      id: "node1",
      kind: "agent",
      description: "First agent node",
      trigger: { event: "issues.opened" },
    } as AgentNode,
    {
      id: "node2",
      kind: "agent",
      description: "Second agent node",
    } as AgentNode,
  ],
  edges: [
    {
      from: "node1",
      to: "node2",
      on: { node_outcome: "success" },
    },
  ],
};

// Fake handlers that return deterministic results
const fakeHandlers: NodeHandlers = {
  agent(node: AgentNode, _ctx: NodeContext): Promise<NodeResult> {
    const outputs: Record<string, unknown> = {
      from_node: node.id,
      timestamp: 1234567890,
    };
    return Promise.resolve({ outcome: "success", outputs });
  },
  automation(_node: AutomationNode, _ctx: NodeContext): Promise<NodeResult> {
    return Promise.resolve({ outcome: "success", outputs: { from_automation: true } });
  },
};

// Start event that triggers the first node
const startEvent: GraphEvent = {
  type: "issues.opened",
  actor: { login: "test", association: "OWNER", is_bot: false },
};

async function assertEventsHasLines(eventsPath: string, expected: number): Promise<void> {
  if (!existsSync(eventsPath)) {
    expect(false).toBe(true); // fail immediately
    return;
  }
  const content = readFileSync(eventsPath, "utf8");
  const lines = content.trim().split("\n").filter((l) => l.length > 0);
  expect(lines.length).toBe(expected);
}

test("runGraph executes nodes sequentially and resumes correctly", async () => {
  const runDir = await mkdtemp();
  try {
    const eventsPath = `${runDir}/events.jsonl`;

    // First run
    const result1: RunState = await runGraph(graph, runDir, fakeHandlers, startEvent);

    // Check that both node outputs are present
    expect(result1.outputs.from_node).toBe("node2");
    expect(result1.iterations).toBeDefined();
    expect(result1.iterations?.node1).toBe(1);
    expect(result1.iterations?.node2).toBe(1);

    // Check events.jsonl has two entries (one per node)
    await assertEventsHasLines(eventsPath, 2);

    // Second run on same runDir (should resume)
    const result2: RunState = await runGraph(graph, runDir, fakeHandlers, startEvent);

    // Should not re-execute nodes; iterations remain same
    expect(result2.iterations?.node1).toBe(1);
    expect(result2.iterations?.node2).toBe(1);

    // events.jsonl should still have only two entries (no new events)
    await assertEventsHasLines(eventsPath, 2);

  } finally {
    await rmdir(runDir);
  }
});
