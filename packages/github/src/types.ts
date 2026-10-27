import { z } from "zod";

/** The author-association values GitHub documents. */
const AUTHOR_ASSOCIATIONS = [
	"NONE",
	"CONTRIBUTOR",
	"FIRST_TIMER",
	"FIRST_TIME_CONTRIBUTOR",
	"MANNEQUIN",
	"MEMBER",
	"OWNER",
	"COLLABORATOR",
] as const;

/**
 * The eight documented values, degrading an unrecognised one to `undefined` rather than rejecting
 * the payload.
 *
 * Degrading rather than rejecting is the whole design. A closed enum rejects the enclosing object on
 * any unfamiliar value, and these schemas wrap single payloads *and* arrays — `listReviews` parses
 * every review on a pull request — so one new value GitHub introduces would fail a whole call that
 * used to succeed. Degrading means an unknown association reaches the approval gates as `undefined`,
 * which their allow-lists already deny: a payload parsed is a payload whose authority was refused,
 * rather than no payload at all.
 *
 * The gates are what make this safe, so the property is pinned rather than assumed: `OWNER` in an
 * unknown position never approves through `isAllowedApprover` or `isAuthorizedAssociation`, and only
 * a review whose `state` is exactly `APPROVED` counts. Tracked in #1233.
 */
export const associationSchema = documented(AUTHOR_ASSOCIATIONS);
/** GitHub author association represented by browser-safe contracts. */
export type AuthorAssociation = z.infer<typeof associationSchema>;

/** The issue and pull-request states GitHub documents. `merged` appears on pull requests only. */
const ISSUE_STATES = ["open", "closed"] as const;
const PULL_REQUEST_STATES = ["open", "closed", "merged"] as const;
/** The review states GitHub documents. */
const REVIEW_STATES = ["APPROVED", "CHANGES_REQUESTED", "COMMENTED", "DISMISSED", "PENDING"] as const;

/**
 * Enumerates a documented value set, degrading an unrecognised one to `undefined`.
 *
 * The same trade-off as {@link associationSchema}, and the same reason: an unfamiliar value must not
 * take down a payload — or an array of payloads — that would otherwise parse. Every consumer of these
 * fields treats `undefined` as "not the value it is looking for", which is the safe direction:
 * `state === "APPROVED"` is false, and `issue.state ?? ""` is neither `open` nor `closed`.
 *
 * Written as a transform rather than `z.enum(...).catch(undefined)` so the fallback is part of the
 * inferred type instead of a cast around it.
 */
function documented<const T extends readonly [string, ...string[]]>(values: T) {
	const allowed = new Set<string>(values);
	return z
		.string()
		.transform((value): T[number] | undefined => (allowed.has(value) ? (value as T[number]) : undefined));
}
const userSchema = z.object({ login: z.string() }).passthrough();
const labelSchema = z.union([z.string(), z.object({ name: z.string() }).passthrough()]);

/** Schema for GitHub issue payloads used by DarkFactory. */
export const issueSchema = z
	.object({
		number: z.number(),
		id: z.number(),
		node_id: z.string(),
		title: z.string(),
		body: z.string().nullable(),
		state: documented(ISSUE_STATES),
		labels: z.array(labelSchema),
		user: userSchema,
		author_association: associationSchema,
		html_url: z.string(),
	})
	.passthrough();
/** Validated GitHub issue payload. */
export type GitHubIssue = z.infer<typeof issueSchema>;
/** Schema for GitHub issue/PR comments. */
export const commentSchema = z
	.object({
		id: z.number(),
		body: z.string().nullable().default(null),
		user: userSchema,
		author_association: associationSchema,
	})
	.passthrough();
/** Validated GitHub comment payload. */
export type GitHubComment = z.infer<typeof commentSchema>;
/** Schema for GitHub pull requests. */
export const pullRequestSchema = z
	.object({
		number: z.number(),
		id: z.number(),
		node_id: z.string(),
		title: z.string(),
		body: z.string().nullable(),
		state: documented(PULL_REQUEST_STATES),
		draft: z.boolean(),
		html_url: z.string(),
		head: z.object({ ref: z.string() }).passthrough(),
		base: z.object({ ref: z.string() }).passthrough(),
		user: userSchema,
		author_association: associationSchema,
	})
	.passthrough();
/** Validated GitHub pull-request payload. */
export type GitHubPullRequest = z.infer<typeof pullRequestSchema>;
/** Schema for GitHub pull-request reviews. */
export const reviewSchema = z
	.object({
		id: z.number(),
		state: documented(REVIEW_STATES),
		body: z.string().nullable().optional(),
		user: userSchema,
		author_association: associationSchema,
	})
	.passthrough();
/** Validated GitHub review payload. */
export type GitHubReview = z.infer<typeof reviewSchema>;
/** Schema for GitHub Actions repository variables. */
export const variableSchema = z
	.object({ name: z.string(), value: z.string(), created_at: z.string().optional(), updated_at: z.string().optional() })
	.passthrough();
/** Validated GitHub Actions variable payload. */
export type GitHubVariable = z.infer<typeof variableSchema>;

/** Normalized GitHub API rate-limit state. */
export interface RateLimitSnapshot {
	resource: string;
	limit?: number;
	remaining: number;
	resetAt: Date;
	cost?: number;
}
/** GraphQL pagination metadata. */
interface PageInfo {
	hasNextPage: boolean;
	endCursor: string | null;
}
/** Generic GraphQL connection with pagination metadata. */
export interface GraphQLConnection<T> {
	nodes: T[];
	pageInfo: PageInfo;
}
