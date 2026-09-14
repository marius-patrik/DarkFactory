import { describe, expect, test } from "bun:test";
import graphJson from "../../assets/graph.darkfactory.json";
import { plan, validateGraph, type GraphEvent, type PlanAction, type RunState } from "../../src/graph/index.ts";

const graph = validateGraph(graphJson);
const state = (node: string, extra: Partial<RunState> = {}): RunState => ({ run_id: "r1", current_node: node, outputs: {}, hints: [], ...extra });

describe("pure DarkFactory planner", () => {
	const cases: [string, GraphEvent, RunState, PlanAction][] = [
		["issue opened", { type: "issues.opened", actor: { login: "patrik", association: "OWNER", is_bot: false } }, state("request-intake"), { type: "run", nodes: ["request-intake"] }],
		["intake completes", { type: "node.completed", node: "request-intake", outcome: "success", outputs: { request_issue: 68 } }, state("request-intake"), { type: "run", nodes: ["interpret-plan"] }],
		["plan waits", { type: "node.completed", node: "interpret-plan", outcome: "success", outputs: { plan_comment: "p" } }, state("interpret-plan"), { type: "gate", node: "plan-gate", status: "Blocked" }],
		["plan approved", { type: "comment", body: "/df approve", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("plan-gate"), { type: "run", nodes: ["implement"] }],
		["plan revised", { type: "comment", body: "/revise", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("plan-gate"), { type: "run", nodes: ["interpret-plan"], feedback: "/revise" }],
		["free text hint", { type: "comment", body: "looks good", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("plan-gate"), { type: "hint", node: "plan-gate", message: "Use /df approve, /df reject, or /df revise." }],
		["PR review approval", { type: "review", state: "APPROVED", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("merge-gate"), { type: "run", nodes: ["merge"] }],
		["review findings loop", { type: "node.completed", node: "self-review", outcome: "success", outputs: { review_clean: false, deviation_detected: false } }, state("self-review"), { type: "run", nodes: ["self-review"] }],
		["deviation", { type: "node.completed", node: "self-review", outcome: "success", outputs: { review_clean: false, deviation_detected: true } }, state("self-review"), { type: "gate", node: "deviation-gate", status: "Blocked" }],
		["deviation rejected", { type: "comment", body: "/reject", actor: { login: "requester", association: "NONE", is_bot: false } }, state("deviation-gate", { requester: "requester" }), { type: "run", nodes: ["implement"], feedback: "/reject", revert: "out_of_scope_commits" }],
		["CI red repairs", { type: "checks.completed", conclusion: "failed" }, state("plan-alignment"), { type: "run", nodes: ["implement"] }],
		["CI green", { type: "checks.completed", conclusion: "required_green" }, state("plan-alignment", { outputs: { aligned: true } }), { type: "gate", node: "merge-gate", status: "Blocked" }],
		["quota blocks", { type: "node.completed", node: "implement", outcome: "quota_exhausted", outputs: {} }, state("implement"), { type: "comment", node: "implement", status: "Blocked", message: "Quota exhausted; run checkpointed. Use /df resume after quota resets." }],
		["manual resume", { type: "comment", body: "/resume", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("implement", { quota_blocked: true }), { type: "run", nodes: ["implement"], resume_run_id: "r1" }],
		["scheduled resume", { type: "schedule", schedule: "*/15 * * * *" }, state("resume-sweep", { checkpoints: [{ run_id: "r2", node: "self-review", eligible: true }] }), { type: "run", nodes: ["self-review"], resume_run_id: "r2" }],
	];
	test.each(cases)("%s", (_name, event, run, expected) => expect(plan(graph, event, run)).toEqual(expected));

	test("bots never cross ingress", () => expect(plan(graph, { type: "issues.opened", actor: { login: "x[bot]", association: "OWNER", is_bot: true } }, state("request-intake"))).toEqual({ type: "none", reason: "bot ingress ignored" }));
	test("unrelated labels do not enter request intake", () => expect(plan(graph, { type: "issues.labeled", label: "bug", actor: { login: "x", association: "OWNER", is_bot: false } }, state("request-intake"))).toEqual({ type: "none", reason: "event filter did not match" }));
	test("gate authorization rejects outsiders", () => expect(plan(graph, { type: "comment", body: "/approve", actor: { login: "x", association: "NONE", is_bot: false } }, state("plan-gate"))).toEqual({ type: "none", reason: "actor is not authorized" }));
	test("free text hints only once", () => expect(plan(graph, { type: "comment", body: "approve please", actor: { login: "owner", association: "OWNER", is_bot: false } }, state("plan-gate", { hints: ["plan-gate"] }))).toEqual({ type: "none", reason: "gate command not recognized" }));
	test("safety budget alerts but never caps loops", () => expect(plan(graph, { type: "node.completed", node: "self-review", outcome: "success", outputs: { review_clean: false, deviation_detected: false } }, state("self-review", { iterations: { "self-review": 5 } }))).toEqual({ type: "run", nodes: ["self-review"], alerts: ["self-review exceeded safety budget 5"] }));
	test("deviation gate stays blocked and reminds at seven days", () => expect(plan(graph, { type: "schedule", schedule: "0 0 * * *", now: "2026-09-14T00:00:00Z" }, state("deviation-gate", { blocked_since: "2026-09-07T00:00:00Z" }))).toEqual({ type: "comment", node: "deviation-gate", status: "Blocked", message: "Reminder: the plan deviation is awaiting approval or rejection." }));
});
