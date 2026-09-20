import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const DARKFACTORY_WORKFLOW_VERSION = "0.2.0";

export const STANDARD_WORKFLOW_TEMPLATES = ["ci.yml", "verify-bound-issue.yml", "df-dispatch.yml"] as const;

export type StandardWorkflowName = (typeof STANDARD_WORKFLOW_TEMPLATES)[number];

const BUILTIN_TEMPLATES: Partial<Record<StandardWorkflowName, string>> = {
	"verify-bound-issue.yml": `name: Verify Bound Issue

on:
  pull_request:
    types: [opened, edited, synchronize, reopened]
  workflow_dispatch:

jobs:
  verify-bound-issue:
    uses: {{pipeline_repo}}/.github/workflows/verify-pr-issue.yml@{{pipeline_ref}}
    with:
      pipeline-ref: "{{pipeline_ref}}"
      pipeline-repo: "{{pipeline_repo}}"
`,
	"df-dispatch.yml": `name: DarkFactory Dispatch

on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]
  pull_request_review_comment:
    types: [created]
  repository_dispatch:
    types: [agent-dispatch]
  workflow_dispatch:
    inputs:
      target-repo:
        description: "Target repository to run against"
        required: false
        type: string
        default: ""
      event-name:
        description: "Event name"
        required: false
        type: string
        default: ""

jobs:
  dispatch:
    uses: {{pipeline_repo}}/.github/workflows/agent.yml@{{pipeline_ref}}
    with:
      pipeline-ref: "{{pipeline_ref}}"
      pipeline-repo: "{{pipeline_repo}}"
    secrets: inherit
`,
};

export interface TemplateContext {
	pipeline_repo?: string;
	pipeline_ref?: string;
	[key: string]: string | undefined;
}

export function normalizeLineEndings(content: string): string {
	return content.replace(/\r\n/g, "\n");
}

export function computeContentHash(content: string): string {
	const normalized = normalizeLineEndings(content);
	return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

export function getWorkflowTemplateContent(templateName: string): string {
	const cleanName = templateName.replace(/\.tmpl$/, "") as StandardWorkflowName;
	const candidatePaths = [
		join(import.meta.dir, "../../assets/workflows", `${cleanName}.tmpl`),
		join(process.cwd(), "assets/workflows", `${cleanName}.tmpl`),
		join(dirname(process.execPath), "assets/workflows", `${cleanName}.tmpl`),
	];

	for (const candidate of candidatePaths) {
		if (existsSync(candidate)) {
			try {
				return readFileSync(candidate, "utf-8");
			} catch {
				// fallback to next
			}
		}
	}

	const builtin = BUILTIN_TEMPLATES[cleanName];
	if (builtin !== undefined) return builtin;

	throw new Error(`Workflow template not found: ${templateName}`);
}

export function interpolateTemplate(rawTemplate: string, context: TemplateContext = {}): string {
	const fullContext: Record<string, string> = {
		pipeline_repo: context.pipeline_repo || "marius-patrik/DarkFactory",
		pipeline_ref: context.pipeline_ref || "darkfactory",
		...Object.fromEntries(Object.entries(context).filter(([_, v]) => typeof v === "string") as [string, string][]),
	};

	return rawTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => fullContext[key] ?? "");
}

export interface ManagedHeader {
	template: string;
	version: string;
	hash: string;
}

const MANAGED_HEADER_REGEX = /^#\s*managed-by:\s*darkfactory\s+([^\s@]+)@([^\s]+)\s+sha256:([0-9a-f]{64})/i;

export function parseManagedHeader(content: string): (ManagedHeader & { headerLine: string; body: string }) | null {
	const normalized = normalizeLineEndings(content);
	const firstNewline = normalized.indexOf("\n");
	const firstLine = firstNewline === -1 ? normalized.trim() : normalized.slice(0, firstNewline).trim();

	const match = firstLine.match(MANAGED_HEADER_REGEX);
	if (!match) {
		return null;
	}

	const body = firstNewline === -1 ? "" : normalized.slice(firstNewline + 1);
	return {
		template: match[1]!,
		version: match[2]!,
		hash: match[3]!.toLowerCase(),
		headerLine: firstLine,
		body,
	};
}

export function buildManagedHeader(template: string, version: string, hash: string): string {
	return `# managed-by: darkfactory ${template}@${version} sha256:${hash}\n`;
}

export function renderWorkflowTemplate(
	templateName: string,
	context: TemplateContext = {},
	version = DARKFACTORY_WORKFLOW_VERSION,
): string {
	const cleanName = templateName.replace(/\.tmpl$/, "");
	const raw = getWorkflowTemplateContent(cleanName);
	const renderedBody = normalizeLineEndings(interpolateTemplate(raw, context));
	const hash = computeContentHash(renderedBody);
	const header = buildManagedHeader(cleanName, version, hash);
	return `${header}${renderedBody}`;
}

export interface WorkflowVerification {
	status: "valid" | "modified" | "unmanaged";
	hashMatches: boolean;
	header?: ManagedHeader;
	computedHash?: string;
	expectedHash?: string;
}

export function verifyWorkflowHash(content: string): WorkflowVerification {
	const parsed = parseManagedHeader(content);
	if (!parsed) {
		return {
			status: "unmanaged",
			hashMatches: false,
		};
	}

	const computedHash = computeContentHash(parsed.body);
	const hashMatches = computedHash.toLowerCase() === parsed.hash.toLowerCase();

	return {
		status: hashMatches ? "valid" : "modified",
		hashMatches,
		header: {
			template: parsed.template,
			version: parsed.version,
			hash: parsed.hash,
		},
		computedHash,
		expectedHash: parsed.hash,
	};
}
