import { plan } from "./planner.ts";
import type { AgentNode, AutomationNode, GraphEvent, PlanAction, RunState, WorkflowGraph } from "./types.ts";
import { writeFile, rename, appendFile, mkdir } from "fs/promises";
import { existsSync, readFileSync } from "fs";

export interface NodeHandlers {
  agent(node: AgentNode, ctx: NodeContext): Promise<NodeResult>;
  automation(node: AutomationNode, ctx: NodeContext): Promise<NodeResult>;
}
export interface NodeContext {
  runDir: string;
  outputs: Record<string, unknown>;
  item?: unknown;
  feedback?: string;
  iteration: number;
}
export interface NodeResult {
  outcome: "success" | "failure" | "quota_exhausted";
  outputs: Record<string, unknown>;
}

// Atomic write helper
async function atomicWrite(path: string, data: string): Promise<void> {
  await writeFile(`${path}.tmp`, data);
  await rename(`${path}.tmp`, path);
}

export async function runGraph(
  graph: WorkflowGraph,
  runDir: string,
  handlers: NodeHandlers,
  start: GraphEvent,
): Promise<RunState> {
  // Ensure run directory exists
  await mkdir(runDir, { recursive: true });

  const statePath = `${runDir}/state.json`;
  const eventsPath = `${runDir}/events.jsonl`;

  // Load or create state (no global cache)
  let state: RunState;
  if (existsSync(statePath)) {
    const raw = readFileSync(statePath, "utf8");
    state = JSON.parse(raw) as RunState;
    // Initialise optional fields if missing
    state.iterations ??= {};
    state.outputs ??= {};
    state.hints ??= [];
  } else {
    // Determine start node based on event type
    let current_node = "";
    if (start.type === "issues.opened" || start.type === "issues.labeled") {
      const startNode = graph.nodes.find(
        (n) => n.trigger?.event?.split("|").includes(start.type),
      );
      current_node = startNode?.id ?? "";
    }
    state = {
      run_id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      current_node,
      outputs: {},
      hints: [],
      iterations: {},
    } as RunState;
    await atomicWrite(statePath, JSON.stringify(state));
  }

  let event: GraphEvent = start;
  while (true) {
    const action = plan(graph, event, state);
    if (action.type === "none") {
      await atomicWrite(statePath, JSON.stringify(state));
      return state;
    }

    if (action.type === "run") {
      // Filter out already executed nodes
      const pending = action.nodes.filter((nodeId) => !(state.iterations?.[nodeId]));
      if (pending.length === 0) {
        await atomicWrite(statePath, JSON.stringify(state));
        return state;
      }
      for (const nodeId of pending) {
        const node = graph.nodes.find((n) => n.id === nodeId)!;
        const iteration = (state.iterations?.[nodeId] ?? 0) + 1;
        const ctx: NodeContext = {
          runDir,
          outputs: state.outputs,
          iteration,
          feedback: action.feedback,
        };
        let result: NodeResult;
        if (node.kind === "agent") {
          result = await handlers.agent(node, ctx);
        } else {
          // node.kind === "automation"
          result = await handlers.automation(node as AutomationNode, ctx);
        }
        // Merge outputs and update iterations
        state.outputs = { ...state.outputs, ...result.outputs };
        state.iterations![nodeId] = iteration;
        state.current_node = nodeId;
        await atomicWrite(statePath, JSON.stringify(state));
        // Emit node.completed event for next planning step and record it
        event = {
          type: "node.completed",
          node: nodeId,
          outcome: result.outcome,
          outputs: result.outputs,
        } as GraphEvent;
        await appendFile(eventsPath, JSON.stringify(event) + "\n");
      }
      continue;
    }

    // Append other action records
    await appendFile(eventsPath, JSON.stringify(action) + "\n");

    if (action.type === "gate" || action.type === "hint" || action.type === "comment") {
      const node = (action as any).node;
      state.current_node = node;
      await atomicWrite(statePath, JSON.stringify(state));
      // Emit a dummy node.completed event to advance planning and avoid infinite loops
      event = {
        type: "node.completed",
        node: node,
        outcome: "success",
        outputs: {},
      } as GraphEvent;
      // Record the action itself as well
      await appendFile(eventsPath, JSON.stringify(action) + "\n");
      continue;
    }
  }
}
