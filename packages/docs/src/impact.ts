import type { RepositoryEvidence } from "@darkfactory/core/repository-evidence";

/** High-level kinds of change that can require canonical documentation updates. */
export type DocumentationImpactKind = "public-api" | "product" | "governance";

/** Deterministic documentation-impact classification for one computed change set. */
export interface DocumentationImpactClassification {
	changedFiles: readonly string[];
	documentationFiles: readonly string[];
	impactKinds: readonly DocumentationImpactKind[];
	requiresDocumentation: boolean;
	permitsDocsNone: boolean;
}

/** Parsed form of an explicit `Docs: none (<reason>)` PR annotation. */
export interface DocsNoneAnnotation {
	present: boolean;
	valid: boolean;
	reason?: string;
}

/** One deterministic docs-impact policy violation. */
export interface DocumentationImpactFinding {
	code: "diff-unavailable" | "docs-required" | "docs-none-missing" | "docs-none-invalid" | "docs-none-not-permitted";
	message: string;
}

/** Complete deterministic result of evaluating documentation impact for one proposed change. */
export interface DocumentationImpactEvaluation {
	classification: DocumentationImpactClassification;
	docsNone: DocsNoneAnnotation;
	findings: readonly DocumentationImpactFinding[];
}

function normalizePath(path: string): string {
	return path.trim().replaceAll("\\", "/").replace(/^\.\//u, "");
}

function isDocumentationFile(path: string): boolean {
	return (
		path === "README.md" ||
		path === "PRD.md" ||
		path === "PLAN.md" ||
		path === "AGENTS.md" ||
		path.startsWith("docs/") ||
		path.startsWith(".agents/rules/") ||
		path.startsWith(".agents/notes/adr/")
	);
}

function isProductContractFile(path: string): boolean {
	return (
		path === "repo.df" ||
		path === "config.df" ||
		path === "docs.df" ||
		path === ".darkfactory/repo.df" ||
		path === ".darkfactory/config.df" ||
		path === ".darkfactory/docs.df" ||
		path === "package.json" ||
		/^packages\/[^/]+\/package\.json$/u.test(path) ||
		/^capabilities\/[^/]+\/capability\.(?:ts|js|mjs)$/u.test(path)
	);
}

function isGovernanceFile(path: string): boolean {
	return (
		path === "AGENTS.md" ||
		path.startsWith(".agents/rules/") ||
		path.startsWith(".agents/notes/adr/") ||
		path.startsWith(".github/workflows/") ||
		path.startsWith("harness/assets/workflows/")
	);
}

function publicApiEntryPoints(evidence: RepositoryEvidence): ReadonlySet<string> {
	return new Set(
		evidence.packages
			.flatMap((pkg) => pkg.apiEntryPoints)
			.map(normalizePath),
	);
}

/**
 * Classifies a successfully computed change set using the canonical repository evidence from #341.
 *
 * This function does not discover packages or languages itself. Public API impact is derived from
 * detected package API entry points, while product/governance contracts use stable repository paths.
 */
export function classifyDocumentationImpact(
	changedFiles: readonly string[],
	evidence: RepositoryEvidence,
): DocumentationImpactClassification {
	const files = [...new Set(changedFiles.map(normalizePath).filter(Boolean))].sort((a, b) => a.localeCompare(b));
	const documentationFiles = files.filter(isDocumentationFile);
	const apiEntries = publicApiEntryPoints(evidence);
	const impactKinds = new Set<DocumentationImpactKind>();

	for (const path of files) {
		if (apiEntries.has(path)) impactKinds.add("public-api");
		if (isProductContractFile(path) || path === "PRD.md" || path === "docs/home.md") impactKinds.add("product");
		if (isGovernanceFile(path)) impactKinds.add("governance");
	}

	const kinds = [...impactKinds].sort();
	return {
		changedFiles: files,
		documentationFiles,
		impactKinds: kinds,
		requiresDocumentation: kinds.length > 0,
		permitsDocsNone: kinds.length === 0,
	};
}

/** Parses an explicit `Docs: none (<reason>)` annotation from PR text. */
export function parseDocsNoneAnnotation(text: string | undefined): DocsNoneAnnotation {
	if (!text) return { present: false, valid: false };
	const present = /(?:^|\n)[ \t]*Docs:[ \t]*none\b/imu.test(text);
	if (!present) return { present: false, valid: false };
	const match = text.match(/(?:^|\n)[ \t]*Docs:[ \t]*none[ \t]*\(([^)\r\n]*)\)[ \t]*(?:\r?\n|$)/imu);
	const reason = match?.[1]?.trim();
	return reason ? { present: true, valid: true, reason } : { present: true, valid: false };
}

/**
 * Evaluates the docs-impact policy for one already-computed PR/base diff.
 *
 * Passing `undefined` means diff computation failed and therefore fails closed. An empty array is
 * a valid successfully computed empty diff.
 */
export function evaluateDocumentationImpact(
	changedFiles: readonly string[] | undefined,
	evidence: RepositoryEvidence,
	prText?: string,
): DocumentationImpactEvaluation {
	if (changedFiles === undefined) {
		throw new Error("Documentation impact diff was not computed.");
	}

	const classification = classifyDocumentationImpact(changedFiles, evidence);
	const docsNone = parseDocsNoneAnnotation(prText);
	const findings: DocumentationImpactFinding[] = [];

	if (docsNone.present && !docsNone.valid) {
		findings.push({
			code: "docs-none-invalid",
			message: "Docs: none requires a non-empty reason in parentheses.",
		});
	}

	if (docsNone.valid && !classification.permitsDocsNone) {
		findings.push({
			code: "docs-none-not-permitted",
			message: "Docs: none is not permitted for public API, product, or governance changes.",
		});
	}

	if (classification.changedFiles.length === 0) {
		return { classification, docsNone, findings };
	}

	if (classification.requiresDocumentation && classification.documentationFiles.length === 0) {
		findings.push({
			code: "docs-required",
			message: "This change affects public API, product, or governance contracts and requires a documentation update.",
		});
	} else if (
		!classification.requiresDocumentation &&
		classification.documentationFiles.length === 0 &&
		!docsNone.present
	) {
		findings.push({
			code: "docs-none-missing",
			message: "A non-documentation change with no classified docs impact must include Docs: none (<reason>).",
		});
	}

	return { classification, docsNone, findings };
}
