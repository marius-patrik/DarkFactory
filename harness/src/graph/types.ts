/** List of canonical statuses used throughout the workflow. */
export const CANONICAL_STATUSES = ["Backlog", "ToDo", "In Progress", "Blocked", "Done", "Superseded", "Dropped"] as const;
/** A single canonical status value. */
export type CanonicalStatus = typeof CANONICAL_STATUSES[number];

/** The kind of node in the workflow graph. */
export type NodeKind = "agent" | "gate" | "automation" | "check-reference";

/** Author association types for GitHub users. */
export type AuthorAssociation = "OWNER" | "MEMBER" | "COLLABORATOR" | "AUTHOR";

/** Base properties shared by all node types. */
export interface BaseNode {
	/** Unique identifier for the node. */
	id: string;
	/** The kind of node (agent, gate, etc.). */
	kind: NodeKind;
	/** Optional human‑readable description of the node. */
	description?: string;
	/** Names of input ports for the node. */
	inputs?: string[];
	/** Names of output ports for the node. */
	outputs?: string[];
	/** Status mapping for the node on the board. */
	board_status?: Partial<Record<"running" | "quota_blocked" | "blocked" | "done" | "rejected", CanonicalStatus>>;
	/** Optional trigger configuration for events or schedules. */
	trigger?: {
        /** Event name triggering this node. */
        event?: string;
        /** Schedule cron expression for this node. */
        schedule?: string
    };
	/** Optional filter configuration for events. */
	filter?: {
        /** Label to filter events. */
        label?: string;
        /** Whether to ignore events from bots. */
        ignore_bots?: boolean
    };
}

/** Node representing an AI agent. */
export interface AgentNode extends BaseNode {
	/** Fixed kind for AgentNode. */
	kind: "agent";
	/** Identity of the agent (e.g., model name). */
	identity?: string;
	/** Reasoning mode for the agent. */
	reasoning?: "standard" | "hard";
	/** Optional chain of prompts or steps. */
	chain?: string[];
	/** Timeout duration for the agent execution (e.g., "10m"). */
	timeout?: string;
	/** Iteration configuration for the agent. */
	iteration?: {
        /** Context file path for iterations. */
        context_file: string;
        /** Safety budget for iterations. */
        safety_budget?: number
    };
	/** Quota policy when the agent runs out of budget. */
	quota_policy?: {
        /** Action to take when quota is exhausted. */
        on_exhaustion: "checkpoint_and_block";
        /** Resume policy after exhaustion. */
        resume: "sweep_or_command"
    };
}

/** Node representing a gate that requires approval. */
export interface GateNode extends BaseNode {
	/** Fixed kind for GateNode. */
	kind: "gate";
	/** Author associations allowed to approve. */
	author_associations: AuthorAssociation[];
	/** Whether the requester can approve the gate. */
	requester_can_approve?: boolean;
	/** Command to execute when the gate is opened. */
	command: string;
	/** Allowed review state for the gate. */
	allow_review_state?: ["APPROVED"];
	/** Days after which a reminder is sent if not approved. */
	reminder_after_days?: number;
	/** Action to take when the gate is rejected. */
	on_reject?: {
        /** Action type when rejected. */
        action: "route_to" | "revert_deviation";
        /** Target for the rejection action. */
        target: string
    };
}

/** Node that runs an automation script. */
export interface AutomationNode extends BaseNode {
	/** Fixed kind for AutomationNode. */
	kind: "automation";
	/** Script content or path to execute. */
	script: string;
	/** Optional side‑effects of the automation. */
	side_effects?: {
        /** Whether to close bound issues. */
        close_bound_issues?: boolean;
        /** Whether to clear checkpoints. */
        clear_checkpoints?: boolean
    };
}

/** Node that references an external check. */
export interface CheckReferenceNode extends BaseNode {
	/** Fixed kind for CheckReferenceNode. */
	kind: "check-reference";
	/** Identifier of the referenced check. */
	check: string;
	/** Whether the check is required for the workflow to continue. */
	required: boolean;
}

/** Union of all possible node types in the graph. */
export type GraphNode = AgentNode | GateNode | AutomationNode | CheckReferenceNode;
/** Types of loops that can be attached to edges. */
export type LoopKind = "self_review" | "ci_repair" | "gate_revision" | "deviation_rework";
/** Conditions that trigger an edge transition. */
export type EdgeOn =
	| { 
        /** Trigger event name. */
        event: string; 
        /** Filter configuration. */
        filter: { 
            /** Whether to ignore events from bots. */
            ignore_bots: true; 
            /** Optional label to filter. */
            label?: string 
        }; 
        /** Optional condition string. */
        when?: string 
    }
	| { 
        /** Schedule trigger. */
        schedule: true; 
        /** Optional condition string. */
        when?: string 
    }
	| { 
        /** Triggered by node outcome. */
        node_outcome: "success" | "failure" | "quota_exhausted"; 
        /** Optional condition string. */
        when?: string 
    }
	| { 
        /** Triggered by gate outcome. */
        gate_outcome: "approved" | "rejected"; 
        /** Optional condition string. */
        when?: string 
    }
	| { 
        /** Triggered by check completion. */
        checks: "required_green" | "failed"; 
        /** Optional condition string. */
        when?: string 
    };

/** Edge connecting two nodes in the workflow graph. */
export interface GraphEdge {
	/** Source node identifier. */
	from: string;
	/** Destination node identifier. */
	to: string;
	/** Condition that activates the edge. */
	on: EdgeOn;
	/** Optional loop configuration for the edge. */
	loop?: {
        /** Loop kind. */
        kind: LoopKind;
        /** Safety budget for the loop. */
        safety_budget?: number
    };
}

/** Root object describing a complete workflow graph. */
export interface WorkflowGraph {
	/** Schema version. */
	version: 1;
	/** List of checks required for the workflow. */
	checks: { 
        /** Check name. */
        name: string; 
        /** Whether the check is required. */
        required: boolean 
    }[];
	/** All nodes in the graph. */
	nodes: GraphNode[];
	/** All edges connecting the nodes. */
	edges: GraphEdge[];
}

/** Actor performing an event in the workflow. */
export interface Actor { 
    /** Actor login. */
    login: string; 
    /** Author association. */
    association: AuthorAssociation | "NONE"; 
    /** Whether the actor is a bot. */
    is_bot: boolean 
}
/** Event types that can occur during a workflow run. */
export type GraphEvent =
	| { 
        /** Event type. */
        type: "issues.opened" | "issues.labeled" | "comment"; 
        /** Actor who performed the event. */
        actor: Actor; 
        /** Optional body text of the event. */
        body?: string; 
        /** Optional label associated with the event. */
        label?: string 
    }
	| { 
        /** Event type. */
        type: "review"; 
        /** Review state. */
        state: string; 
        /** Actor who performed the review. */
        actor: Actor 
    }
	| { 
        /** Event type. */
        type: "node.completed"; 
        /** Node ID. */
        node: string; 
        /** Node completion outcome. */
        outcome: "success" | "failure" | "quota_exhausted"; 
        /** Outputs produced by the node. */
        outputs: Record<string, unknown> 
    }
	| { 
        /** Event type. */
        type: "checks.completed"; 
        /** Conclusion of the checks. */
        conclusion: "required_green" | "failed" 
    }
	| { 
        /** Event type. */
        type: "schedule"; 
        /** Schedule identifier. */
        schedule: string; 
        /** Timestamp of the event. */
        now?: string 
    };

/** Mutable state of a workflow run. */
export interface RunState {
	/** Identifier of the run. */
	run_id: string;
	/** Identifier of the node currently being executed. */
	current_node: string;
	/** Outputs produced by the workflow so far. */
	outputs: Record<string, unknown>;
	/** Hints or suggestions for the next steps. */
	hints: string[];
	/** Optional identifier of the user who requested the run. */
	requester?: string;
	/** Whether the run is currently blocked due to quota. */
	quota_blocked?: boolean;
	/** Timestamp when the run became quota‑blocked. */
	blocked_since?: string;
	/** Count of iterations per node. */
	iterations?: Record<string, number>;
	/** Checkpoints saved during the run. */
	checkpoints?: { 
        /** ID of the run. */
        run_id: string; 
        /** Node ID. */
        node: string; 
        /** Whether the checkpoint is eligible. */
        eligible: boolean 
    }[];
}

/** Actions that the planner can emit to control the workflow. */
export type PlanAction =
	| { 
        /** Action type. */
        type: "run"; 
        /** List of nodes to run. */
        nodes: string[]; 
        /** Feedback. */
        feedback?: string; 
        /** Revert type. */
        revert?: "out_of_scope_commits"; 
        /** Resume run ID. */
        resume_run_id?: string; 
        /** Alerts. */
        alerts?: string[] 
    }
	| { 
        /** Action type. */
        type: "gate"; 
        /** Node ID. */
        node: string; 
        /** Status. */
        status: "Blocked" 
    }
	| { 
        /** Action type. */
        type: "hint"; 
        /** Node ID. */
        node: string; 
        /** Message. */
        message: string 
    }
	| { 
        /** Action type. */
        type: "comment"; 
        /** Node ID. */
        node: string; 
        /** Status. */
        status: "Blocked"; 
        /** Message. */
        message: string 
    }
	| { 
        /** Action type. */
        type: "none"; 
        /** Reason for no action. */
        reason: string 
    };
