/**
 * One shared command grammar for issue gates and pull request approvals.
 *
 * The issue gates and the merge gate each used to own their own approval regex, so a command the
 * owner decided (`/df approve`) worked on neither. Everything approval-shaped is parsed here, so
 * there is one grammar rather than two that can drift.
 *
 * Strict commands (case-insensitive):
 *
 *     /df approve | /df reject | /df revise | /df resume
 *     /approve    | /reject    | /revise    | /resume
 *
 * `revise` is an alias of `reject` and parses as `"reject"`.
 *
 * Approvals and resumes must stand alone as the whole comment: a decision stays distinguishable
 * from a discussion. A rejection instead routes the stage back with the comment as feedback, so it
 * accepts trailing text — `/df reject use bun, not npm` — which {@link commandFeedback} returns;
 * {@link parseCommand} still reports `"reject"`.
 *
 * Legacy bare words keep working so nothing in use breaks. On issues: `approve`, `/approve`,
 * `lgtm`, `good` count as approval and `resume`, `/resume` as resume. On pull requests: `approve`,
 * `/approve`, `merge`, `/merge`, `lgtm` count as approval. Anything else — including a sentence
 * that merely contains one of these words (`I do not approve yet`) — parses as `null`;
 * {@link isCommandHint} reports those mentions so the caller can post a one-time hint instead of
 * acting.
 */

/** The pipeline decisions a comment can carry. */
export type PipelineCommand = "approve" | "reject" | "resume";

/** Which comment surface a command was written on. */
export type CommandSurface = "issue" | "pr";

/** Strict `/df <verb>` or `/<verb>` command standing alone as the whole comment. */
const STRICT_COMMAND = /^\s*(?:\/df\s+|\/)(approve|reject|revise|resume)\s*$/iu;

/**
 * Strict rejection with trailing feedback (`/df reject use bun, not npm`).
 *
 * Approvals and resumes never take trailing text; a rejection routes the stage back, so the reason
 * rides along. The word boundary keeps prose like "rejected" or "/revision" from matching.
 */
const STRICT_REJECT_WITH_FEEDBACK = /^\s*(?:\/df\s+|\/)(?:reject|revise)\b\s*(.*?)\s*$/iu;

/** Legacy whole-comment approvals that predate the strict grammar, per surface. */
export const LEGACY_ISSUE_COMMANDS: Readonly<Record<string, PipelineCommand | undefined>> = {
	approve: "approve",
	"/approve": "approve",
	lgtm: "approve",
	good: "approve",
	resume: "resume",
	"/resume": "resume",
};

/** Legacy whole-comment approvals that predate the strict grammar, per surface. */
export const LEGACY_PR_COMMANDS: Readonly<Record<string, PipelineCommand | undefined>> = {
	approve: "approve",
	"/approve": "approve",
	merge: "approve",
	"/merge": "approve",
	lgtm: "approve",
};

/** The strict grammar's verbs, with `revise` normalised to the command it aliases. */
const VERB_ALIASES: Readonly<Record<string, PipelineCommand | undefined>> = {
	approve: "approve",
	reject: "reject",
	revise: "reject",
	resume: "resume",
};

/**
 * Whole-comment approval matcher for issues (strict grammar plus legacy words).
 *
 * Exported because a caller may want to test a comment against the issue gate without also
 * decoding which command it was.
 */
export const ISSUE_COMMAND_RE =
	/^\s*(?:\/df\s+approve|\/approve|approve|lgtm|good|\/df\s+resume|\/resume|resume)\s*$/iu;

/** Whole-comment approval matcher for pull requests (strict grammar plus legacy words). */
export const PR_COMMAND_RE = /^\s*(?:\/df\s+approve|\/approve|approve|merge|\/merge|lgtm)\s*$/iu;

/** Words whose mere mention (outside a command) earns at most a one-time hint. */
const HINT_WORDS = /\b(approve(?:d)?|lgtm|merge|resume|revise|reject)\b/iu;

/** Marker left on the hint comment so it is posted at most once per issue. */
export const HINT_MARKER = "<!-- darkfactory-command-hint -->";

/** Associations allowed to approve: the Request author or a privileged role, never a bot. */
export const ALLOWED_ASSOCIATIONS: ReadonlySet<string> = new Set(["OWNER", "MEMBER", "COLLABORATOR"]);

/** Footer for the interpretation comment on a Request issue. */
export const INTERPRETATION_FOOTER = "Reply with `/df approve` to continue or `/df reject <feedback>` to revise";

/** Footer for the implementation plan comment on a Plan issue. */
export const PLAN_FOOTER =
	"Reply with `/df approve` to start implementation or `/df reject <feedback>` to revise the plan";

/** Instructions for resuming execution after quota exhaustion. */
export const RESUME_INSTRUCTIONS = [
	"When quota limits reset or additional quota is provisioned:",
	"1. Verify that quota is available on at least one configured harness.",
	"2. Comment `/df resume` on this issue/PR to resume execution.",
	"3. The agent resumes from the checkpoint on whichever harness is available.",
].join("\n");

/** The automation logins that are never a person, beyond the `[bot]` suffix. */
const AUTOMATION_LOGINS: ReadonlySet<string> = new Set(["github-actions", "app/github-actions", "dependabot"]);

/** Parses the strict `/df <verb>` / `/<verb>` grammar. */
function strictVerb(body: string): PipelineCommand | null {
	const text = body.trim();
	const verb = STRICT_COMMAND.exec(text)?.[1]?.toLowerCase();
	if (verb) return VERB_ALIASES[verb] ?? null;
	return STRICT_REJECT_WITH_FEEDBACK.test(text) ? "reject" : null;
}

/** The legacy word table for one surface. */
function legacyCommands(surface: CommandSurface): Readonly<Record<string, PipelineCommand | undefined>> {
	return surface === "pr" ? LEGACY_PR_COMMANDS : LEGACY_ISSUE_COMMANDS;
}

/**
 * Extracts the trailing reason from a rejection command.
 *
 * @param body - Comment body.
 * @returns The feedback text (`""` for a bare `/df reject` or a non-rejection).
 */
export function commandFeedback(body: string): string {
	const text = (body ?? "").trim();
	const match = STRICT_REJECT_WITH_FEEDBACK.exec(text);
	if (!match || parseCommand(text) !== "reject") return "";
	return (match[1] ?? "").replace(/^[:.-]+/u, "").trim();
}

/**
 * Parses one comment into a pipeline command.
 *
 * @param body - Comment body.
 * @param surface - `"issue"` for Request/Plan gates, `"pr"` for pull requests.
 * @returns `"approve"`, `"reject"`, `"resume"`, or `null` when the body is not a command —
 * including free text that merely mentions a command word.
 */
export function parseCommand(body: string, surface: CommandSurface = "issue"): PipelineCommand | null {
	const text = (body ?? "").trim();
	if (!text) return null;
	return strictVerb(text) ?? legacyCommands(surface)[text.toLowerCase()] ?? null;
}

/** Parses a comment on a Request/Plan issue into a pipeline command. */
export function parseIssueCommand(body: string): PipelineCommand | null {
	return parseCommand(body, "issue");
}

/**
 * Parses a comment on a pull request into a pipeline command.
 *
 * @returns `"approve"` for an approval (strict or legacy `merge`/`lgtm`), `"reject"`, `"resume"`,
 * or `null`.
 */
export function parsePrCommand(body: string): PipelineCommand | null {
	return parseCommand(body, "pr");
}

/**
 * Reports whether a non-command body mentions a command word.
 *
 * Such bodies trigger at most a one-time hint comment — never a gate transition.
 *
 * @returns `true` when the body is not a command on either surface but mentions one of the
 * command words.
 */
export function isCommandHint(body: string): boolean {
	const text = (body ?? "").trim();
	if (!text) return false;
	if (parseIssueCommand(text) !== null || parsePrCommand(text) !== null) return false;
	return HINT_WORDS.test(text);
}

/**
 * Reports whether a login belongs to automation rather than a person.
 *
 * @returns `true` for `[bot]` accounts and the well-known automation logins, and for an empty
 * login, because an unidentified actor is not a decision-maker.
 */
export function isBotLogin(login: string): boolean {
	if (!login) return true;
	const lowered = login.toLowerCase();
	return lowered.endsWith("[bot]") || AUTOMATION_LOGINS.has(lowered);
}

/** Everything the workflow knows about the commenter, beyond their login. */
export interface ApproverContext {
	/** Their `author_association` on the commented item. */
	authorAssociation?: string;
	/** Login of the Request author (issue/PR author for the gate). */
	issueAuthor?: string;
	/** GitHub `user.type` (`"Bot"` never passes). */
	userType?: string;
}

/**
 * Reports whether a commenter may approve, reject, or resume.
 *
 * Owner decision 9c: the Request author or an OWNER/MEMBER/COLLABORATOR (`author_association`),
 * never a bot account.
 *
 * @param actor - Login of the commenter or reviewer.
 * @param context - Their association, the Request author's login, and their GitHub user type.
 * @returns `true` when the actor's command counts as a gate decision.
 */
export function isAllowedApprover(actor: string, context: ApproverContext = {}): boolean {
	if (!actor || isBotLogin(actor)) return false;
	if ((context.userType ?? "").toLowerCase() === "bot") return false;
	if (ALLOWED_ASSOCIATIONS.has((context.authorAssociation ?? "").toUpperCase())) return true;
	const author = context.issueAuthor ?? "";
	return Boolean(author) && actor.toLowerCase() === author.toLowerCase();
}
