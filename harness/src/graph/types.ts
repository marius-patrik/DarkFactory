export const CANONICAL_STATUSES = ["Backlog", "ToDo", "In Progress", "Blocked", "Done", "Superseded", "Dropped"] as const;
export type CanonicalStatus = typeof CANONICAL_STATUSES[number];
export type NodeKind = "agent" | "gate" | "automation" | "check-reference";
export type AuthorAssociation = "OWNER" | "MEMBER" | "COLLABORATOR" | "AUTHOR";

export interface BaseNode {
	id: string;
	kind: NodeKind;
	description?: string;
	inputs?: string[];
	outputs?: string[];
	board_status?: Partial<Record<"running" | "quota_blocked" | "blocked" | "done" | "rejected", CanonicalStatus>>;
	trigger?: { event?: string; schedule?: string };
	filter?: { label?: string; ignore_bots?: boolean };
	foreach?: { items: string; max_parallel?: number; as?: string };
}

export interface AgentNode extends BaseNode {
	kind: "agent";
	identity?: string;
	reasoning?: "standard" | "hard";
	chain?: string[];
	timeout?: string;
	iteration?: { context_file: string; safety_budget?: number };
	quota_policy?: { on_exhaustion: "checkpoint_and_block"; resume: "sweep_or_command" };
	prompt?: string;
	mode?: "read" | "write";
	workdir?: string;
	max_turns?: number;
}

export interface GateNode extends BaseNode {
	kind: "gate";
	author_associations: AuthorAssociation[];
	requester_can_approve?: boolean;
	command: string;
	allow_review_state?: ["APPROVED"];
	reminder_after_days?: number;
	on_reject?: { action: "route_to" | "revert_deviation"; target: string };
}

export interface AutomationNode extends BaseNode {
	kind: "automation";
	script: string;
	side_effects?: { close_bound_issues?: boolean; clear_checkpoints?: boolean };
}

export interface CheckReferenceNode extends BaseNode {
	kind: "check-reference";
	check: string;
	required: boolean;
}

export type GraphNode = AgentNode | GateNode | AutomationNode | CheckReferenceNode;
export type LoopKind = "self_review" | "ci_repair" | "gate_revision" | "deviation_rework";
export type EdgeOn =
	| { event: string; filter: { ignore_bots: true; label?: string }; when?: string }
	| { schedule: true; when?: string }
	| { node_outcome: "success" | "failure" | "quota_exhausted"; when?: string }
	| { gate_outcome: "approved" | "rejected"; when?: string }
	| { checks: "required_green" | "failed"; when?: string }
	| { children: "all_done" | "any_failed"; when?: string };

export interface GraphEdge {
	from: string;
	to: string;
	on: EdgeOn;
	loop?: { kind: LoopKind; safety_budget?: number };
}

export interface WorkflowGraph {
	version: 1;
	checks: { name: string; required: boolean }[];
	nodes: GraphNode[];
	edges: GraphEdge[];
}

export interface Actor { login: string; association: AuthorAssociation | "NONE"; is_bot: boolean }
export type GraphEvent =
	| { type: "issues.opened" | "issues.labeled" | "comment"; actor: Actor; body?: string; label?: string }
	| { type: "review"; state: string; actor: Actor }
	| { type: "node.completed"; node: string; outcome: "success" | "failure" | "quota_exhausted"; outputs: Record<string, unknown> }
	| { type: "checks.completed"; conclusion: "required_green" | "failed" }
	| { type: "schedule"; schedule: string; now?: string }
	| { type: "children.completed"; node: string; outcome: "all_done" | "any_failed" };

export interface RunState {
	run_id: string;
	current_node: string;
	outputs: Record<string, unknown>;
	hints: string[];
	requester?: string;
	quota_blocked?: boolean;
	blocked_since?: string;
	iterations?: Record<string, number>;
	checkpoints?: { run_id: string; node: string; eligible: boolean }[];
	children?: { run_id: string; node: string; eligible: boolean }[];
}

export type PlanAction =
	| { type: "run"; nodes: string[]; feedback?: string; revert?: "out_of_scope_commits"; resume_run_id?: string; alerts?: string[] }
	| { type: "gate"; node: string; status: "Blocked" }
	| { type: "hint"; node: string; message: string }
	| { type: "comment"; node: string; status: "Blocked"; message: string }
	| { type: "none"; reason: string };
