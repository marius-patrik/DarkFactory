import { describe, expect, test } from "bun:test";
import graph from "../../assets/graph.darkfactory.json";
import { GraphValidationError, validateGraph } from "../../src/graph/index.ts";

function invalid(change: (value: any) => void): string[] {
	const value = structuredClone(graph) as any;
	change(value);
	try { validateGraph(value); } catch (error) {
		expect(error).toBeInstanceOf(GraphValidationError);
		return (error as GraphValidationError).issues;
	}
	throw new Error("expected validation failure");
}

describe("workflow graph validation", () => {
	test("the bundled DarkFactory graph is valid", () => expect(validateGraph(graph).version).toBe(1));
	test("reports unknown node references precisely", () => expect(invalid((g) => { g.edges[0].to = "missing"; })).toContain("edges[0].to: unknown node \"missing\""));
	test("reports unknown gate rejection targets", () => expect(invalid((g) => { g.nodes.find((n: any) => n.id === "plan-gate").on_reject.target = "missing"; })).toContain("nodes[plan-gate].on_reject.target: unknown node \"missing\""));
	test("reports unreachable nodes", () => expect(invalid((g) => { g.nodes.push({ id: "orphan", kind: "automation", script: "noop" }); })).toContain("nodes[orphan]: unreachable from an event trigger or schedule"));
	test("permits only explicitly declared loops", () => expect(invalid((g) => { g.edges.push({ from: "merge", to: "implement", on: { node_outcome: "success" } }); })).toContain("edges: cycle merge -> implement -> self-review -> plan-alignment -> merge-gate -> merge is not declared as a loop"));
	test("validates declared I/O", () => expect(invalid((g) => { g.nodes.find((n: any) => n.id === "implement").inputs.push("ghost"); })).toContain("nodes[implement].inputs[2]: \"ghost\" is not produced by an upstream node"));
	test("validates guard outputs", () => expect(invalid((g) => { g.edges[5].on.when = "unknown == true"; })).toContain("edges[5].on.when: \"unknown\" is not a declared output of self-review"));
	test("rejects loose gate grammar", () => expect(invalid((g) => { g.nodes.find((n: any) => n.id === "plan-gate").command = "approve"; })).toContain("nodes[plan-gate].command: must accept only /df approve|reject|revise and /approve|reject|revise"));
	test("rejects noncanonical board statuses", () => expect(invalid((g) => { g.nodes[0].board_status.done = "Todo"; })).toContain("nodes[request-intake].board_status.done: unknown canonical status \"Todo\""));
	test("requires bot filters on event ingress", () => expect(invalid((g) => { delete g.edges[0].on.filter.ignore_bots; })).toContain("edges[0].on.filter.ignore_bots: event ingress must explicitly be true"));
});
	test("accepts agent node with min_tier", () => {
		const g = structuredClone(graph) as any;
		const agent = g.nodes.find((n:any) => n.kind === "agent");
		if (agent) agent.min_tier = "light";
		expect(validateGraph(g).nodes.some((n:any) => n.min_tier === "light")).toBe(true);
	});
	test("graph with min_tier on agent nodes passes validation", () => {
		const g = structuredClone(graph) as any;
		for (const node of g.nodes) {
			if (node.kind === "agent") node.min_tier = "light";
		}
		expect(() => validateGraph(g)).not.toThrow();
	});
