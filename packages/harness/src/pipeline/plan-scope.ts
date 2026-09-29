/**
 * The deterministic scope gate.
 *
 * Owner decision 9a: a change is in scope when the approved plan named it, and the gate runs
 * before any model sees the diff. That ordering is the point - a review that is asked "is this in
 * scope?" will sometimes agree, and a gate whose answer can be argued with is not a gate.
 *
 * Two rules keep the gate from doing damage:
 *
 * - Tests are never out of scope. Tests accompany every change (DF-RULE-001), so a plan that named
 *   `tests/test_commands.py` and an implementation that added `tests/test_footers.py` are both
 *   in scope.
 * - A plan that names no files defines no scope. Reverting everything against a behavioral plan
 *   would undo the whole change, which is a worse failure than a loose gate.
 *
 * The file allowlist is opt-in through a dedicated heading, because a behavioral plan legitimately
 * cites package names, config files, and current owners as architectural context. Those references
 * are context, not permission to mutate.
 */

/** Headings under which a plan may declare an exact file allowlist. */
const FILE_SCOPE_HEADING_RE = /(?:^|\n)#{2,6}\s*(?:File Scope|Allowed Files|Files to Change|File Allowlist)[ \t]*\n/iu;

/** The next heading of any level, which ends a file-scope section. */
const NEXT_HEADING_RE = /(?:^|\n)#{1,6}\s+/u;

/** File extensions that make a bare token a path even without a directory separator. */
const KNOWN_EXTENSIONS = [
	".py",
	".ts",
	".tsx",
	".js",
	".jsx",
	".json",
	".yml",
	".yaml",
	".toml",
	".md",
	".rs",
	".sh",
	".txt",
	".html",
	".css",
	".sql",
	".cfg",
	".ini",
	".lock",
	".dockerignore",
	".gitignore",
] as const;

/** Characters that mean a token is a command or a code snippet rather than a path. */
const NOT_A_PATH_CHARS = [" ", "\t", "\n", ";", "|", "&", ">", "<", "$", "{", "}", "*"] as const;

/** A GitHub blob link, whose last path segment is a repository path. */
const BLOB_LINK_RE = /https:\/\/github\.com\/[^/\s'"]+\/[^/\s'"]+\/blob\/[^/\s'"]+\/([^\s#)'"]+)/gu;

/** A markdown link, whose text and target are each a candidate. */
const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/gu;

/** A backtick code span, the most common way a plan cites a path. */
const CODE_SPAN_RE = /`([^`\n]+)`/gu;

/** A list item marker, the other common way. */
const LIST_ITEM_RE = /(?:^|\n)\s*[-*]\s+([^\s`]+)/gu;

/** Longest token that can still plausibly be a path rather than a sentence. */
const MAX_PATH_TOKEN = 250;

/** Directory names that mark a file as a test wherever it sits. */
const TEST_DIRECTORIES = ["tests", "test", "__tests__"] as const;

/** Filename shapes that mark a file as a test. */
const TEST_FILENAMES = ["conftest.py"] as const;

/** Suffix patterns that mark a file as a test. */
const TEST_SUFFIXES = ["_test.py", ".test.ts", ".test.tsx", ".test.js", ".spec.ts", ".test.ts"] as const;

/** Marker naming the comment that carries an implementation plan. */
export const PLAN_MARKER = "<!-- darkfactory-plan -->";

/** Heading a plan carries, both when the marker predates it and when the marker is absent. */
const PLAN_HEADING = "### Implementation Plan";

/**
 * Report whether a comment body carries an implementation plan.
 *
 * The marker is the reliable signal, but it was introduced when the two approval gates were merged
 * onto one issue. Plans posted before that carry only the heading, and an issue whose plan predates
 * the marker would otherwise be planned a second time on approval - which is what happened to the
 * first issue to run through the merged flow.
 *
 * @param body - The comment body.
 * @returns `true` when the comment is a plan.
 */
export function isPlanComment(body: string): boolean {
	if (body.includes(PLAN_MARKER)) return true;
	return body.includes(PLAN_HEADING) || body.replace(/^\s+/, "").startsWith("## Implementation Plan");
}

/**
 * Normalise a candidate path, preserving leading dots in directory names like `.github`.
 *
 * @param token - The raw token.
 * @returns The normalised, repository-relative form.
 */
export function cleanPath(token: string): string {
	let cleaned = token.replace(/^[`'",:;()[\]{}]+/, "").replace(/[`'",:;()[\]{}]+$/, "");
	cleaned = cleaned.replace(/\\/g, "/");
	if (cleaned.startsWith("./")) cleaned = cleaned.slice(2);
	else if (cleaned.startsWith("/")) cleaned = cleaned.slice(1);
	return cleaned;
}

/**
 * Heuristically decide whether a token is a file path rather than code or a command.
 *
 * @param token - The raw token.
 * @returns `true` when the token looks like a repository path.
 */
export function looksLikeFilePath(token: string): boolean {
	const cleaned = token.replace(/^[`'",:;()[\]{}]+/, "").replace(/[`'",:;()[\]{}]+$/, "");
	if (!cleaned || cleaned.length > MAX_PATH_TOKEN) return false;
	if (/^(?:https?|file):\/\//u.test(cleaned)) return false;
	if (NOT_A_PATH_CHARS.some((char) => cleaned.includes(char))) return false;
	const lower = cleaned.toLowerCase();
	if (KNOWN_EXTENSIONS.some((extension) => lower.endsWith(extension))) return true;
	if (cleaned.includes("/")) {
		const parts = cleaned.split("/");
		if (parts.every((part) => part.length > 0) && !cleaned.startsWith("-")) return true;
	}
	return false;
}

/**
 * Extract every repository path a plan names.
 *
 * Four citation shapes are read, because plans use all of them: blob links, markdown links,
 * backtick spans, and list items. Every one is a heuristic - a plan may name a package rather than
 * a file - which is why the result is only ever narrowed by {@link parseExplicitPlanFiles} before
 * it is allowed to decide anything.
 *
 * @param planText - The plan's markdown.
 * @returns The paths the plan named.
 */
export function parsePlanFiles(planText: string): Set<string> {
	if (!planText) return new Set();
	const found = new Set<string>();
	const add = (candidate: string): void => {
		const token = cleanPath(candidate).split("#")[0]?.trim() ?? "";
		if (token && looksLikeFilePath(token)) found.add(token);
	};

	for (const match of planText.matchAll(BLOB_LINK_RE)) add(match[1] ?? "");
	for (const match of planText.matchAll(MARKDOWN_LINK_RE)) {
		for (const candidate of [match[1] ?? "", match[2] ?? ""]) {
			const cleaned = cleanPath(candidate.trim());
			const isUrl = cleaned.startsWith("http://") || cleaned.startsWith("https://");
			if (!isUrl && (cleaned.includes("/") || cleaned.includes("."))) add(cleaned);
		}
	}
	for (const match of planText.matchAll(CODE_SPAN_RE)) add(match[1]?.trim() ?? "");
	for (const match of planText.matchAll(LIST_ITEM_RE)) add(match[1] ?? "");

	return found;
}

/**
 * Extract an exact file allowlist, but only when a plan declares one under a dedicated heading.
 *
 * Behavioral planning cites package names, config files, and example paths as architectural
 * context, and those references must not become mutation permissions. Exact file scope is opt-in,
 * and the section ends at the next heading of any level.
 *
 * @param planText - The approved plan's markdown.
 * @returns The declared paths, or an empty set when the plan declared no file scope.
 */
export function parseExplicitPlanFiles(planText: string): Set<string> {
	if (!planText) return new Set();
	const heading = FILE_SCOPE_HEADING_RE.exec(planText);
	if (!heading) return new Set();
	const tail = planText.slice(heading.index + heading[0].length);
	const next = NEXT_HEADING_RE.exec(tail);
	return parsePlanFiles(next ? tail.slice(0, next.index) : tail);
}

/**
 * Report whether a changed file matches a path a plan named.
 *
 * Matched by exact path, by basename, or by one path being a suffix of the other, so a plan that
 * says `commands.py` matches a change to `.github/scripts/commands.py` without the plan having to
 * spell out the directory.
 *
 * @param filePath - The changed file's path.
 * @param planFiles - The paths the plan named.
 * @returns `true` when the change is covered by the plan.
 */
export function isFileInPlan(filePath: string, planFiles: ReadonlySet<string>): boolean {
	const norm = cleanPath(filePath);
	const basename = norm.split("/").pop() ?? norm;
	for (const planFile of planFiles) {
		const planNorm = cleanPath(planFile);
		if (norm === planNorm) return true;
		if (norm.endsWith(`/${planNorm}`)) return true;
		if (planNorm.endsWith(`/${norm}`)) return true;
		if (basename === planNorm || basename === (planNorm.split("/").pop() ?? planNorm)) return true;
	}
	return false;
}

/**
 * Report whether a path is a test.
 *
 * @param filePath - The repository-relative path.
 * @returns `true` for files under a test directory or named like a test.
 */
export function isTestFile(filePath: string): boolean {
	const norm = cleanPath(filePath);
	const parts = norm.split("/");
	const name = parts[parts.length - 1] ?? norm;
	const inTestDirectory = parts.slice(0, -1).some((part) => (TEST_DIRECTORIES as readonly string[]).includes(part));
	return (
		inTestDirectory ||
		name.startsWith("test_") ||
		TEST_SUFFIXES.some((suffix) => name.endsWith(suffix)) ||
		(TEST_FILENAMES as readonly string[]).includes(name)
	);
}

/** How a change sorted against the approved plan. */
interface ScopeSplit {
	/** Changed files the plan covers, or that are tests. */
	inScope: string[];
	/** Changed files the plan neither covers nor excuses. */
	outOfScope: string[];
}

/**
 * Separate changed files into in-scope and out-of-scope relative to the approved plan.
 *
 * @param changedFiles - Files changed in the pull request.
 * @param planFiles - Paths the plan declared; empty means the plan declared no file scope.
 * @returns The two partitions. An empty {@link ScopeSplit.outOfScope} when the plan named nothing,
 *   because a plan that names no files cannot define scope and reverting everything would undo the
 *   work.
 */
export function checkScope(changedFiles: readonly string[], planFiles: ReadonlySet<string>): ScopeSplit {
	const inScope: string[] = [];
	const outOfScope: string[] = [];
	if (planFiles.size === 0) return { inScope: [...changedFiles], outOfScope };
	for (const file of changedFiles) {
		if (isTestFile(file) || isFileInPlan(file, planFiles)) inScope.push(file);
		else outOfScope.push(file);
	}
	return { inScope, outOfScope };
}
