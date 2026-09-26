import { z } from "zod";

/** Schema for GitHub author-association values. */
export const associationSchema = z.string();
/** GitHub author association represented by browser-safe contracts. */
export type AuthorAssociation = z.infer<typeof associationSchema>;
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
		state: z.string(),
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
		state: z.string(),
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
		state: z.string(),
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
export interface PageInfo {
	hasNextPage: boolean;
	endCursor: string | null;
}
/** Generic GraphQL connection with pagination metadata. */
export interface GraphQLConnection<T> {
	nodes: T[];
	pageInfo: PageInfo;
}
