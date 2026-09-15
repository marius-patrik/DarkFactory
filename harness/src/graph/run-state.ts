import { promises as fs } from "node:fs";
import { join } from "node:path";
import { replaceFile } from "../storage/replace-file";
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
  } catch {
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
 *
 * Serializes the state to JSON *before* touching the filesystem, so a
 * serialization error (e.g. a circular reference) never leaves a temp file
 * behind. The temp file is then replaced into place via `replaceFile` (which
 * retries Windows lock errors). If writing or replacing fails, the temp file
 * is deleted best-effort and the original error is rethrown.
 */
export async function saveRunState(dir: string, subject: string, state: RunState): Promise<void> {
  const targetPath = join(dir, `${subject}.json`);
  const tmpPath = join(dir, `.tmp-${subject}-${Date.now()}.json`);
  // Serialize first: a circular object or other stringify error throws here,
  // before any file is created.
  const json = JSON.stringify(state, null, 2);
  try {
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(tmpPath, json, { encoding: "utf8" });
    await replaceFile(tmpPath, targetPath);
  } catch (error) {
    // Best-effort cleanup of the temp file; ignore deletion errors so the
    // original error propagates. This only runs on failure (not on success).
    try {
      await fs.rm(tmpPath, { force: true });
    } catch {
      /* ignore */
    }
    throw error;
  }
}
