import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Version identifier for the DarkFactory workflow templates.
 */
export const DARKFACTORY_WORKFLOW_VERSION = "0.1.0";

/**
 * List of standard workflow template filenames provided by DarkFactory.
 */
export const STANDARD_WORKFLOW_TEMPLATES = [
	"ci.yml",
	"verify-bound-issue.yml",
	"df-dispatch.yml",
] as const;

/**
 * Union type of standard workflow template names.
 */
export type StandardWorkflowName = typeof STANDARD_WORKFLOW_TEMPLATES[number];

const BUILTIN_TEMPLATES: Record<StandardWorkflowName, string> = {
	"ci.yml": `name: CI

on:
  push:
    branches: ["main", "master", "darkfactory"]
  pull_request:
    branches: ["main", "master", "darkfactory"]
  workflow_dispatch:

jobs:
  pipeline:
    uses: {{pipeline_repo}}/.github/workflows/ci.yml@{{pipeline_ref}}
    with:
      pipeline-ref: "{{pipeline_ref}}"
      pipeline-repo: "{{pipeline_repo}}"
`,
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

/**
 * Context values used for interpolating workflow templates.
 */
export interface TemplateContext {
	/** GitHub repository (owner/repo) for the pipeline. */
	pipeline_repo?: string;
	/** Git ref (branch/tag/commit) for the pipeline. */
	pipeline_ref?: string;
	[key: string]: string | undefined;
}

/**
 * Normalizes Windows CRLF line endings to LF.
 * @param content - Raw file content.
 * @returns Content with only LF line endings.
 */
export function normalizeLineEndings(content: string): string {
	return content.replace(/\r\n/g, "\n");
}

/**
 * Computes a SHA-256 hash of the normalized content.
 * @param content - The content to hash.
 * @returns Hexadecimal hash string.
 */
export function computeContentHash(content: string): string {
	const normalized = normalizeLineEndings(content);
	return createHash("sha256").update(normalized, "utf-8").digest("hex");
}

/**
 * Retrieves the raw template content for a given workflow template name.
 * Looks in project assets first, then falls back to built-in templates.
 * @param templateName - Name of the workflow template (without .tmpl).
 * @returns The template content as a string.
 * @throws If the template cannot be found.
 */
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

	if (cleanName in BUILTIN_TEMPLATES) {
		return BUILTIN_TEMPLATES[cleanName];
	}

	throw new Error(`Workflow template not found: ${templateName}`);
}

/**
 * Replaces interpolation placeholders in a template with provided context values.
 * @param rawTemplate - Template string containing {{placeholder}} tokens.
 * @param context - Mapping of placeholder names to replacement strings.
 * @returns The template with placeholders substituted.
 */
export function interpolateTemplate(rawTemplate: string, context: TemplateContext = {}): string {
	const fullContext: Record<string, string> = {
		pipeline_repo: context.pipeline_repo || "marius-patrik/DarkFactory",
		pipeline_ref: context.pipeline_ref || "main",
		...Object.fromEntries(
			Object.entries(context).filter(([_, v]) => typeof v === "string") as [string, string][]
		),
	};

	return rawTemplate.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => fullContext[key] ?? "");
}

/**
 * Structure of the managed header comment inserted into generated workflow files.
 */
export interface ManagedHeader {
	/** Name of the workflow template used. */
	template: string;
	/** Version identifier of the template. */
	version: string;
	/** SHA-256 hash of the rendered template body. */
	hash: string;
}

const MANAGED_HEADER_REGEX = /^#\s*managed-by:\s*darkfactory\s+([^\s@]+)@([^\s]+)\s+sha256:([0-9a-f]{64})/i;


/**
 * Parses the managed header from a workflow file's content.
 * @param content - Full file content including the header.
 * @returns Parsed header information and body, or null if not managed.
 */
export function parseManagedHeader(content: string): (
  ManagedHeader & {
    /** The first line of the file containing the managed header comment. */
    headerLine: string;
    /** The workflow file content after the header line. */
    body: string;
  }
) | null {
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

/**
 * Constructs the managed header comment line for a rendered workflow.
 * @param template - Template name used.
 * @param version - Version identifier of the template.
 * @param hash - SHA-256 hash of the rendered body.
 * @returns Header line string.
 */
export function buildManagedHeader(template: string, version: string, hash: string): string {
	return `# managed-by: darkfactory ${template}@${version} sha256:${hash}\n`;
}

/**
 * Renders a workflow template with optional context and version.
 * @param templateName - Name of the template file (may include .tmpl).
 * @param context - Values for interpolation within the template.
 * @param version - Version identifier for the managed header (defaults to current workflow version).
 * @returns Complete workflow file content with managed header.
 */
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

/**
 * Result of verifying a workflow file's managed header and content hash.
 */
export interface WorkflowVerification {
	/** Verification result: "valid", "modified", or "unmanaged". */
	status: "valid" | "modified" | "unmanaged";
	/** Whether the computed hash matches the expected hash. */
	hashMatches: boolean;
	/** Parsed managed header (present when the file is managed). */
	header?: ManagedHeader;
	/** SHA-256 hash computed from the file body (present when managed). */
	computedHash?: string;
	/** Expected SHA-256 hash from the managed header (present when managed). */
	expectedHash?: string;
}

/**
 * Verifies that a workflow file's managed header hash matches its body.
 * @param content - Full workflow file content.
 * @returns Verification details indicating validity and hash match status.
 */
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
