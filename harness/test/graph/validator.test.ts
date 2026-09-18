import { describe, expect, test } from "bun:test";
import graph from "../../assets/graph.darkfactory.json";
import { GraphValidationError, validateGraph } from "../../src/graph/index.ts";

function invalid(change: (value: any) => void): string[] {
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

describe("workflow graph validation", () => {
	test("the bundled DarkFactory graph is valid", () => expect(validateGraph(graph).version).toBe(1));
	test("reports unknown node references precisely", () =>
		expect(
			invalid((g) => {
				g.edges[0].to = "missing";
			}),
		).toContain('edges[0].to: unknown node "missing"'));
	test("reports unknown gate rejection targets", () =>
		expect(
			invalid((g) => {
				g.nodes.find((n: any) => n.id === "planning-gate").on_reject.target = "missing";
			}),
		).toContain('nodes[planning-gate].on_reject.target: unknown node "missing"'));
	test("reports unreachable nodes", () =>
		expect(
			invalid((g) => {
				g.nodes.push({ id: "orphan", kind: "automation", script: "noop" });
			}),
		).toContain("nodes[orphan]: unreachable from an event trigger or schedule"));
	test("permits only explicitly declared loops", () =>
		expect(
			invalid((g) => {
				g.edges.push({ from: "merge", to: "implement", on: { node_outcome: "success" } });
			}),
		).toContain(
			"edges: cycle merge -> implement -> self-review -> plan-alignment -> merge-gate -> merge is not declared as a loop",
		));
	test("validates declared I/O", () =>
		expect(
			invalid((g) => {
				g.nodes.find((n: any) => n.id === "implement").inputs.push("ghost");
			}),
		).toContain('nodes[implement].inputs[2]: "ghost" is not produced by an upstream node'));
	test("validates guard outputs", () =>
		expect(
			invalid((g) => {
				g.edges[6].on.when = "unknown == true";
			}),
		).toContain('edges[6].on.when: "unknown" is not a declared output of planning-gate'));
	test("rejects loose gate grammar", () =>
		expect(
			invalid((g) => {
				g.nodes.find((n: any) => n.id === "planning-gate").command = "approve";
			}),
		).toContain("nodes[planning-gate].command: must accept only /df approve|reject|revise and /approve|reject|revise"));
	test("rejects noncanonical board statuses", () =>
		expect(
			invalid((g) => {
				g.nodes[0].board_status.done = "Todo";
			}),
		).toContain('nodes[request-intake].board_status.done: unknown canonical status "Todo"'));
	test("requires bot filters on event ingress", () =>
		expect(
			invalid((g) => {
				delete g.edges[0].on.filter.ignore_bots;
			}),
		).toContain("edges[0].on.filter.ignore_bots: event ingress must explicitly be true"));
	test("validates foreach.items references upstream output", () => {
		const issues = invalid((g) => {
			// Add a node with foreach that references an output that doesn't exist upstream
			g.nodes.push({
				id: "foreach-node",
				kind: "automation",
				script: "echo",
				foreach: { items: "nonexistent" },
			});
			g.edges.push({ from: "request-intake", to: "foreach-node", on: { node_outcome: "success" } });
		});
		expect(issues.some((i) => i.includes("foreach.items") && i.includes("not produced by an upstream node"))).toBe(
			true,
		);
	});
	test("rejects children edges from nodes without foreach", () => {
		const issues = invalid((g) => {
			// Add an edge with children trigger from a node that doesn't have foreach
			g.edges.push({ from: "request-intake", to: "implement", on: { children: "all_done" } });
		});
		expect(
			issues.some((i) => i.includes("on.children") && i.includes("must originate from a node with a foreach field")),
		).toBe(true);
	});
});
