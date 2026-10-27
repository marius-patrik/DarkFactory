/**
 * Classification of a failed agent attempt.
 *
 * Every rung of the attempt ladder is a decision made from text a subprocess produced, and the
 * decisions are deliberately kept in one place. The ladder is: quota exhaustion and a rejected
 * credential both *rotate* to the next account, a genuine error returns immediately, and an exit 0
 * with no usable text is a failed attempt rather than a perfect answer. Splitting any of these
 * across the ladder's own branches is what let an answer discussing rate limits be read as
 * exhaustion, and the run stayed green with the issue waiting forever.
 *
 * Everything here is a pure function of its arguments. Nothing reaches for the environment, a
 * process, or the network, so each rule is testable on its own and the same rule applies to a
 * string whether it came from stdout, stderr, or an exit code already translated.
 */

/** Prefix the ladder returns in place of an answer when the whole chain is out of quota. */
export const QUOTA_EXHAUSTED_NOTICE = "[DarkFactory Agent Execution Error]: Quota exhausted";

/** Prefix the ladder returns in place of an answer when the whole chain failed to authenticate. */
export const AUTH_FAILED_NOTICE = "[DarkFactory Agent Execution Error]: Authentication failed";

/** Prefix of every non-answer the ladder returns, and of every notice it posts. */
export const AGENT_ERROR_PREFIX = "[DarkFactory Agent Execution Error]";

/**
 * Maximum length of an exit-0 stdout treated as a failure report rather than an answer.
 *
 * CLI error reports are terse single lines; agent answers run long. A short report carrying quota
 * or auth wording rotates instead of being posted as the agent's reply, and the single-line limit
 * is what keeps this from catching real answers - a Request about quota handling always discusses
 * quotas at length, and that discussion must still pass through untouched.
 */
export const SHORT_REPORT_LIMIT = 300;

/**
 * Wording that means a provider is out of quota.
 *
 * The list is long because providers report the same condition in wildly different words, and a
 * missed phrasing means the run fails instead of escalating to the next account. The last two
 * entries exist because a provider that says "daily limit reached" without the words *quota* or
 * *rate limit* was not detected as exhausted, which is the most common way a limit is reported.
 */
const QUOTA_EXHAUSTION_PATTERNS: readonly RegExp[] = [
	/(?:status[_\s]*(?:code)?|http|error|code)\s*[:=]?\s*429\b/iu,
	/\b429\s*[:=-]?\s*(?:too\s*many\s*requests|resource[_\s]*exhausted|quota|rate\s*limit)/iu,
	/\bresource[_\s]*exhausted\b/iu,
	/\bquota\b(?:\s+\S+){0,6}\s+\b(?:exceeded|exhausted|exhaustion|reached|hit)\b/iu,
	/\b(?:exceeded|exhausted|exhaustion|reached|hit)\b(?:\s+\S+){0,6}\s+\bquota\b/iu,
	/\binsufficient\s*quota\b/iu,
	/\bout\s*of\s*quota\b/iu,
	/\brate\s*[-_]?limit\b(?:\s+\S+){0,6}\s+\b(?:exceeded|exhausted|exhaustion|reached|hit)\b/iu,
	/\b(?:exceeded|exhausted|exhaustion|reached|hit)\b(?:\s+\S+){0,6}\s+\brate\s*[-_]?limit\b/iu,
	/\btoo\s*many\s*requests\b/iu,
	/\b(?:daily|weekly|monthly|hourly|usage|credit|token|message)\s*limits?\b/iu,
	/\blimits?\b(?:\s+\S+){0,3}\s+\b(?:reached|exceeded|hit|exhausted)\b/iu,
	/\bout\s*of\s*credits?\b/iu,
	/\binsufficient\s*credits?\b/iu,
	/\bupgrade\s*(?:your\s*)?plan\b/iu,
	/\b(?:model|service|endpoint)\s*(?:is\s*)?unavailable\b/iu,
	/\b(?:model|server|service)\s*(?:is\s*)?overloaded\b/iu,
];

/**
 * Wording that means a credential was rejected or has expired.
 *
 * One stale secret must not stop a healthy chain, so a 401/403, an expired token, or a rejected key
 * rotates exactly like quota: an unused credential is always a better answer than failing. Matched
 * against the same subprocess output as quota, never against an agent's answer text.
 */
const AUTH_FAILURE_PATTERNS: readonly RegExp[] = [
	/(?:status[_\s]*(?:code)?|http|error|code)\s*[:=]?\s*40[123]\b/iu,
	/\b401\s*[:=-]?\s*(?:unauthorized|invalid|expired)/iu,
	/\bunauthorized\b/iu,
	/\binvalid[_\s-]*(?:api[_\s-]*key|token|oauth|grant|credentials?)\b/iu,
	/\bexpired[_\s-]*token\b/iu,
	/\binvalid_grant\b/iu,
	/\bauthentication\s*(?:failed|expired|required)\b/iu,
	/\b(?:token|credential|api[_\s-]*key)\s*(?:expired|invalid|revoked)\b/iu,
];

/**
 * Print-mode timeout wording from the harness CLIs.
 *
 * A harness reached for `--print-timeout` because a coding agent sitting on a TTY will keep a turn
 * alive forever; the timeout is what makes `--print` usable in CI. The CLIs that honour it do so
 * by exiting 0 once the budget is spent, which is invisible to an exit-status check, so the wording
 * is the only thing separating a silent truncation from a real reply.
 */
const PRINT_TIMEOUT_PATTERNS: readonly RegExp[] = [
	/\bprint[_\s-]?timeout\b/iu,
	/\btimed?\s*out\b[^\n]{0,60}\b(?:print|output|response|result)\b/iu,
	/\bprint\b[^\n]{0,40}\btimed?\s*out\b/iu,
];

/**
 * Report whether text indicates quota or rate-limit exhaustion.
 *
 * @param text - Subprocess stderr/stdout, or a runner-authored failure detail.
 * @returns `true` when the text carries exhaustion wording.
 */
export function isQuotaExhausted(text: string): boolean {
	if (!text) return false;
	return QUOTA_EXHAUSTION_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Report whether text indicates a rejected or expired credential.
 *
 * @param text - Subprocess stderr/stdout, or a runner-authored failure detail.
 * @returns `true` when the text carries authentication-failure wording.
 */
export function isAuthFailure(text: string): boolean {
	if (!text) return false;
	return AUTH_FAILURE_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Report whether a harness invocation hit its print-mode time budget.
 *
 * @param text - The attempt's stderr. Timeout wording is trusted only from stderr: an agent's real
 *   answer may legitimately discuss timeouts, and a Request about timeout handling always does.
 * @returns `true` when the text carries print-mode timeout wording.
 */
export function isPrintTimeout(text: string): boolean {
	if (!text) return false;
	return PRINT_TIMEOUT_PATTERNS.some((pattern) => pattern.test(text));
}

/**
 * Report whether a result is the ladder's own out-of-quota notice.
 *
 * Callers test for this notice and never for quota wording. A notice has already checkpointed the
 * work and marked the item Blocked, so there is nothing left for the caller to post; an answer that
 * merely discusses quotas has not been handled at all and must be posted.
 *
 * @param result - What the attempt ladder returned.
 * @returns `true` only for the exhaustion notice.
 */
export function isQuotaExhaustionNotice(result: string): boolean {
	return result.length > 0 && result.startsWith(QUOTA_EXHAUSTED_NOTICE);
}

/**
 * Report whether a result is an error report rather than an agent's answer.
 *
 * @param result - What the attempt ladder returned.
 * @returns `true` for the quota notice, the auth notice, or any other error prefix.
 */
export function isAgentErrorNotice(result: string): boolean {
	return result.startsWith(AGENT_ERROR_PREFIX);
}

/**
 * Cut a log tail down to a bounded size, keeping the most recent end.
 *
 * @param text - The text to truncate.
 * @param limit - Maximum number of characters to keep.
 * @returns The tail, marked where it was truncated.
 */
export function boundedTail(text: string, limit = 2000): string {
	if (!text) return "";
	const compact = text.trim();
	if (compact.length <= limit) return compact;
	return `...[${compact.length - limit} characters omitted]...\n${compact.slice(-limit)}`;
}

/**
 * Classify a terse exit-0 report.
 *
 * A harness that reports exhaustion or an auth failure instead of an answer exits 0 with the report
 * on stdout. Rotating past it beats posting the error text as the agent's reply, and the
 * single-line limit is what keeps a real answer - which may run to many paragraphs about quotas or
 * credentials - from being caught by the same rule.
 *
 * @param output - The attempt's stdout.
 * @returns `true` when the output is short, single-line, and carries rotation wording.
 */
export function isShortFailureReport(output: string): boolean {
	if (!output) return false;
	if (output.includes("\n") || output.length > SHORT_REPORT_LIMIT) return false;
	return isQuotaExhausted(output) || isAuthFailure(output);
}

/**
 * Report whether a git failure was a refusal to touch a workflow file.
 *
 * Writing under `.github/workflows/` is gated on `workflows: write`, and the refusal is otherwise
 * indistinguishable from a bad push. The caller turns it into a resolution rather than a raw
 * git error.
 *
 * @param message - Git stderr or stdout.
 * @returns `true` when the push was rejected for missing workflow permission.
 */
export function isWorkflowPermissionError(message: string): boolean {
	if (!message) return false;
	const lower = message.toLowerCase();
	return (
		lower.includes("without workflows permission") ||
		lower.includes("refusing to allow a github app to create or update workflow")
	);
}

/**
 * Detect whether a comment originated from automation or from the agent itself.
 *
 * Acting on the agent's own comment is how a conversational CI agent enters a self-reply loop, so
 * both the login and the body's branding are checked. The `omnis` variants are a predecessor's
 * branding that predates the rename and still appears in issues posted before it.
 *
 * @param userLogin - The comment author's login.
 * @param body - The comment body.
 * @returns `true` when the comment is the pipeline's own.
 */
export function isBotOrAgentComment(userLogin: string, body: string): boolean {
	if (userLogin.endsWith("[bot]") || userLogin === "app/github-actions" || userLogin === "github-actions") {
		return true;
	}
	const lower = body.trim().toLowerCase();
	return (
		lower.startsWith("### darkfactory agent") ||
		lower.startsWith("### omnis agent") ||
		lower.startsWith("### implementation plan") ||
		lower.startsWith("### implementation review") ||
		lower.includes("[darkfactory agent") ||
		lower.includes("[omnis agent") ||
		lower.includes("autogenerated by the darkfactory agent") ||
		lower.includes("autogenerated by the omnis agent") ||
		lower.includes("<!-- darkfactory-agent -->") ||
		lower.includes("<!-- omnis-agent -->")
	);
}

/** Names the runner always redacts, whatever else is registered. */
const ALWAYS_REDACTED = ["GH_TOKEN", "GH_PROJECT_TOKEN", "GITHUB_TOKEN"] as const;

/** Credential values shorter than this are too likely to appear by chance to be worth replacing. */
const MIN_REDACTABLE_LENGTH = 8;

/**
 * Replace known credential values in a log or error line before it is written.
 *
 * Harness credentials live in the environment and may legitimately appear in a CLI's stderr; the
 * account being run is named in the job log, its credential never is. The names are supplied
 * rather than looked up, so this module stays free of the harness registry and every registered
 * provider can contribute to the set.
 *
 * @param text - Text that may embed credential values.
 * @param secretNames - Every environment variable holding a credential, from any source.
 * @param env - The environment those names are read from; defaults to `process.env`.
 * @returns The text with every known credential value replaced by `***`.
 */
export function redactSecrets(
	text: string,
	secretNames: readonly string[],
	env: Readonly<Record<string, string | undefined>> = process.env,
): string {
	if (!text) return text;
	// Ordered by *value* length, not name length, and de-duplicated by value: a secret that is a
	// prefix of another has to be replaced as part of the longer one, or the longer one is left
	// with a dangling tail of itself in the log.
	const values = [
		...new Set(
			[...secretNames, ...ALWAYS_REDACTED]
				.map((name) => env[name] ?? "")
				.filter((value) => value.length >= MIN_REDACTABLE_LENGTH),
		),
	].sort((a, b) => b.length - a.length);
	let redacted = text;
	for (const value of values) {
		redacted = redacted.replaceAll(value, "***");
	}
	return redacted;
}

/** Matches a `file://` URL in agent output. */
const FILE_URL_RE = /file:\/\/([^\s)'"<>]+)/gu;

/** Leading path fragments an agent image or a checkout puts in front of the repository root. */
const WORKSPACE_PREFIXES = ["home/agent/", "home/runner/work/", "github/workspace/", "workspace/"] as const;

/** Path fragments that identify the repository root inside an absolute container path. */
const REPO_ROOT_MARKERS: readonly string[] = [".github/", ".agents/", "src/", "tests/", "docs/", "bin/"];

/**
 * Strip an `owner/repo/` prefix that sits directly in front of a repository-root marker.
 *
 * Only exactly three leading segments are considered, and only when the fourth is a marker, so a
 * path whose fourth segment is an ordinary directory is left whole rather than guessed at. A path
 * that does not match this shape keeps the prefix it came with: a wrong repository-relative path
 * produces a link that 404s, which is worse than one that is merely verbose.
 *
 * @param path - The path with any workspace prefix already removed.
 * @returns The repository-relative path.
 */
function stripRepositoryRoot(path: string): string {
	const segments = path.split("/");
	if (segments.length < 5) return path;
	const fourth = segments[3] as string;
	if (!REPO_ROOT_MARKERS.includes(`${fourth}/`)) return path;
	return segments.slice(3).join("/");
}

/** Roots whose contents are machine configuration rather than repository content. */
const NON_REPOSITORY_ROOTS = ["usr/", "opt/", "etc/", "tmp/", "var/", "proc/"] as const;

/**
 * Reduce a `file://` URL to the repository-relative path it refers to.
 *
 * @param raw - The URL's path component, as written.
 * @returns The repository-relative path, or an empty string when none can be derived.
 */
function repositoryPathFrom(raw: string): string {
	let path = raw.replace(/^\/+/, "");
	for (const prefix of WORKSPACE_PREFIXES) {
		if (path.startsWith(prefix)) {
			path = path.slice(prefix.length);
			break;
		}
	}
	path = path.replace(/^home\/[^/]+\//u, "");
	path = stripRepositoryRoot(path);
	return path;
}

/**
 * Rewrite `file://` URLs in agent output into repository links or plain paths.
 *
 * Coding-agent CLIs cite local paths this way, which is a broken link on GitHub: it points at the
 * reader's own machine rather than the repository. Text that is not a `file://` URL is returned
 * verbatim.
 *
 * @param text - Agent output that may contain `file://` URLs.
 * @param repo - Repository slug (`owner/name`) used to build blob links when known.
 * @param branch - Branch the blob link points at.
 * @returns The text with every `file://` URL replaced.
 */
export function rewriteFileLinks(text: string, repo = "", branch = ""): string {
	if (!text.includes("file://")) return text;
	return text.replace(FILE_URL_RE, (match, raw: string) => {
		const trimmed = raw.trim();
		// Trailing sentence punctuation belongs to the sentence, not the path. `FILE_URL_RE` stops at
		// whitespace or a bracket, so a citation at the end of a sentence captured the full stop and
		// produced a link to `respond.ts.` — a path that does not exist, and a link that 404s for
		// anyone who follows it. Strip it here and put it back after the rewritten form.
		const trailing = /[.,;:]+$/u.exec(trimmed)?.[0] ?? "";
		const path = repositoryPathFrom(trailing ? trimmed.slice(0, -trailing.length) : trimmed);
		if (!path) return match;
		if (NON_REPOSITORY_ROOTS.some((root) => path.startsWith(root))) {
			const name = trimmed.replace(/\/+$/u, "").split("/").pop();
			return `\`${name || trimmed}\`${trailing}`;
		}
		if (repo && branch) return `[${path}](https://github.com/${repo}/blob/${branch}/${path})${trailing}`;
		return `\`${path}\`${trailing}`;
	});
}
