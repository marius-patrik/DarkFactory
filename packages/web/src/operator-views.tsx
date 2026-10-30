import { useCallback, useEffect, useState, type FC, type ReactNode } from "react";
import {
	type OperatorCollection,
	type OperatorConfig,
	type OperatorItem,
	type OperatorReadSource,
	type OperatorRepository,
	type OperatorResource,
	type OperatorResourceData,
	type ResourceState,
} from "./operator-data.ts";
import {
	type AuthState,
	type BrowserLoginConfig,
	type EffectiveAuthority,
	postVerifiedIssueComment,
} from "./operator-auth.ts";
import { type QuotaDashboardState, QuotaDashboardView } from "./quota.tsx";

export const SURFACES = [
	{ path: "/", label: "Overview", resource: "repository", group: "Workspace" },
	{ path: "/requests", label: "Requests", resource: "requests", group: "Work" },
	{ path: "/planning", label: "Planning", resource: "planning", group: "Work" },
	{ path: "/approvals", label: "Approvals", resource: "approvals", group: "Work" },
	{ path: "/epics", label: "Epics & dependencies", resource: "epics", group: "Work" },
	{ path: "/pulls", label: "Pull requests & stacks", resource: "pulls", group: "Delivery" },
	{ path: "/checks", label: "Checks", resource: "checks", group: "Delivery" },
	{ path: "/runs", label: "Workflow runs", resource: "runs", group: "Delivery" },
	{ path: "/graph", label: "Graph execution", resource: "graph", group: "Execution" },
	{ path: "/recovery", label: "Recovery & blocked", resource: "recovery", group: "Execution" },
	{ path: "/projects", label: "GitHub Projects", resource: "projects", group: "Workspace" },
	{ path: "/provid¶»§q«^