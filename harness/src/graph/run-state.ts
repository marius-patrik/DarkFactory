import { promises as fs } from "node:fs";
import { join } from "node:path";
import type { WorkflowGraph, RunState } from "./types";

/**
 * Load a RunState for a given subject.
 * If the state file does not exist, create a fresh state.
 */
export async function loadRunState(dir: string, subject: string, graph: WorkflowGraph): Promise<RunState> {
  const runsPath = join(dir, `${subject}.json`);
  try {
    const data = await fs.readFile(runsPath, "utf8");
    return JSON.parse(data) as RunState;
  } catch (e) {
    // If file does not exist, create a fresh state.
    // Determine the first node with a trigger event, otherwise the first node.
    const firstNode = graph.nodes.find((n) => n.trigger?.event) ?? graph.nodes[0];
    const currentNode = firstNode?.id ?? "";
    const fresh: RunState = {
      run_id: `${subject}-${Date.now()}`,
      current_node: currentNode,
      outputs: {},
      hints: [],
    };
    return fresh;
  }
}

/**
 * Atomically save a RunState to a JSON file.
 * Writes to a temporary file then renames it to the final location.
 */
export async function saveRunState(dir: string, subject: string, state: RunState): Promise<void> {
  const targetPath = join(dir, `${subject}.json`);
  const tmpPath = join(dir, `.tmp-${subject}-${Date.now()}.json`);
  const json = JSON.stringify(state, null, 2);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(tmpPath, json, { encoding: "utf8" });
  // Rename (atomic on most platforms). If rename fails, the temp file may remain; we let the caller handle errors.
  await fs.rename(tmpPath, targetPath);
}
