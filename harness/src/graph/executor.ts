import { plan } from "./planner.ts";
import type { AgentNode, AutomationNode, GraphEvent, GraphNode, PlanAction, RunState, WorkflowGraph } from "./types.ts";
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

async function handleForeachNode(
  node: GraphNode,
  action: PlanAction,
  state: RunState,
  runDir: string,
  handlers: NodeHandlers,
  eventsPath: string,
  statePath: string
): Promise<GraphEvent> {
  const foreach = node.foreach!;
  const { items, max_parallel, as } = foreach;
  // Get the items array from state.outputs[items]
  const itemsArray = state.outputs[items] as unknown[];
  if (!Array.isArray(itemsArray)) {
    throw new Error(`foreach.items must be an array, got ${typeof itemsArray}`);
  }
  // We'll run the children sequentially for now (respecting max_parallel by running max_parallel at a time, but we'll do sequential if max_parallel is 1, parallel otherwise simplified)
  // We'll implement a simple queue: we'll run up to max_parallel children at a time.
  const maxConcurrent = max_parallel ?? itemsArray.length;
  const childrenOutcomes: ("success" | "failure" | "quota_exhausted")[] = [];
  const childrenInfo: { run_id: string; node: string; eligible: boolean }[] = [];

  // We'll process items in batches of maxConcurrent
  for (let i = 0; i < itemsArray.length; i += maxConcurrent) {
    const batch = itemsArray.slice(i, i + maxConcurrent);
    const batchPromises = batch.map(async (item, offset) => {
      const index = i + offset;
      const childRunDir = `${runDir}/children/${index}`;
      await mkdir(childRunDir, { recursive: true });
      // Initialize child state: inherit parent's outputs, but not iterations, hints, etc.
      const childState: RunState = {
        run_id: `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        current_node: node.id,
        outputs: { ...state.outputs }, // inherit parent's outputs
        hints: [],
        iterations: {},
        checkpoints: [],
        children: undefined,
      };
      // Write initial state
      await atomicWrite(`${childRunDir}/state.json`, JSON.stringify(childState));
      // Set up context for the node
      const iteration = 1; // first iteration in child run
      const ctx: NodeContext = {
        runDir: childRunDir,
        outputs: childState.outputs,
        item: item, // set the item from the foreach
        feedback: (action as Extract<PlanAction, { type: "run" }>).feedback,
        iteration,
      };
      let result: NodeResult;
      if (node.kind === "agent") {
        result = await handlers.agent(node as AgentNode, ctx);
      } else if (node.kind === "automation") {
        result = await handlers.automation(node as AutomationNode, ctx);
      } else {
        throw new Error(`Unexpected node kind ${node.kind} in foreach`);
      }
      // Update child state
      childState.outputs = { ...childState.outputs, ...result.outputs };
      childState.iterations![node.id] = iteration;
      childState.current_node = node.id;
      await atomicWrite(`${childRunDir}/state.json`, JSON.stringify(childState));
      // Emit node.completed event for the child run
      const childEvent = {
        type: "node.completed",
        node: node.id,
        outcome: result.outcome,
        outputs: result.outputs,
      } as GraphEvent;
      await appendFile(`${childRunDir}/events.jsonl`, JSON.stringify(childEvent) + "\n");
      // For the purpose of the foreach, we consider the child run's outcome as the outcome of the foreach node
      return { outcome: result.outcome, runId: childState.run_id, index };
    });
    const batchResults = await Promise.all(batchPromises);
    for (const result of batchResults) {
      childrenOutcomes.push(result.outcome);
      childrenInfo.push({
        run_id: result.runId,
        node: node.id,
        eligible: true, // we set eligible to true for simplicity
      });
    }
  }

  // Update parent state with children information
  state.children = (state.children ?? []).concat(childrenInfo);
  state.current_node = node.id; // set current node to the foreach node
  await atomicWrite(statePath, JSON.stringify(state));

  // Determine the parent's outcome for the children.completed event
  const allSucceeded = childrenOutcomes.every((outcome) => outcome === "success");
  const anyFailed = childrenOutcomes.some((outcome) => outcome === "failure" || outcome === "quota_exhausted");
  let parentOutcome: "all_done" | "any_failed";
  if (allSucceeded) {
    parentOutcome = "all_done";
  } else if (anyFailed) {
    parentOutcome = "any_failed";
  } else {
    // This case should not happen because each outcome is either success, failure, or quota_exhausted
    // If we get here, treat as any_failed? We'll default to all_done? We'll choose all_done arbitrarily.
    parentOutcome = "all_done";
  }

  // Emit children.completed event for the parent node
  const childrenEvent = {
    type: "children.completed",
    node: node.id,
    outcome: parentOutcome,
  } as GraphEvent;
  await appendFile(eventsPath, JSON.stringify(childrenEvent) + "\n");
  return childrenEvent;
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
        if (node.foreach) {
          // Handle foreach node
          const childrenEvent = await handleForeachNode(node, action, state, runDir, handlers, eventsPath, statePath);
          event = childrenEvent;
          break; // break out of the for loop, then continue the while loop
        } else {
          // Original handling for non-foreach node
          const iteration = (state.iterations?.[nodeId] ?? 0) + 1;
          const runAction = action as Extract<PlanAction, { type: "run" }>;
          const ctx: NodeContext = {
            runDir,
            outputs: state.outputs,
            iteration,
            feedback: runAction.feedback,
          };
          let result: NodeResult;
          if (node.kind === "agent") {
            result = await handlers.agent(node as AgentNode, ctx);
          } else if (node.kind === "automation") {
            result = await handlers.automation(node as AutomationNode, ctx);
          } else {
            throw new Error(`Unexpected node kind ${node.kind} in run action`);
          }
          // Merge outputs and update iterations
          state.outputs = { ...state.outputs, ...result.outputs };
          state.iterations![nodeId] = iteration;
          state.current_node = nodeId;
          await atomicWrite(statePath, JSON.stringify(state));
          // Emit node.completed event for next planning step and record it
          const nodeCompletedEvent = {
            type: "node.completed",
            node: nodeId,
            outcome: result.outcome,
            outputs: result.outputs,
          } as GraphEvent;
          await appendFile(eventsPath, JSON.stringify(nodeCompletedEvent) + "\n");
          event = nodeCompletedEvent;
          // we do not break here; we continue to the next pending node
        }
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