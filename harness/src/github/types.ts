import { z } from "zod";

/**
 * Schema for the author association string.
 */
export const associationSchema = z.string();
/**
 * Type representing the author association extracted from the schema.
 */
export type AuthorAssociation = z.infer<typeof associationSchema>;

/**
 * User reference schema with login and passthrough fields.
 */
const userSchema = z.object({
  /** The user's login handle. */
  login: z.string(),
}).passthrough();

/**
 * Label type - either a string label or an object with a name field.
 */
const labelSchema = z.union([
  z.string(),
  z.object({
    /** The label name. */
    name: z.string(),
  }).passthrough(),
]);

/**
 * Schema for a GitHub issue object.
 */
export const issueSchema = z.object({
  /** The issue number. */
  number: z.number(),
  /** The numeric issue ID. */
  id: z.number(),
  /** The GraphQL node ID of the issue. */
  node_id: z.string(),
  /** The title of the issue. */
  title: z.string(),
  /** The body content of the issue, or null if none. */
  body: z.string().nullable(),
  /** The state of the issue (open or closed). */
  state: z.string(),
  /** The labels attached to the issue. */
  labels: z.array(labelSchema),
  /** The user who created the issue. */
  user: userSchema,
  /** The author association with the repository. */
  author_association: associationSchema,
  /** The HTML URL of the issue. */
  html_url: z.string(),
}).passthrough();

/**
 * Type representing a GitHub issue.
 */
export type GitHubIssue = z.infer<typeof issueSchema>;

/**
 * Schema for a GitHub comment.
 */
export const commentSchema = z.object({
  /** The comment ID. */
  id: z.number(),
  /** The comment body text, or null if none. */
  body: z.string().nullable().default(null),
  /** The user who wrote the comment. */
  user: userSchema,
  /** The author association with the repository. */
  author_association: associationSchema,
}).passthrough();

/**
 * Type representing a GitHub comment.
 */
export type GitHubComment = z.infer<typeof commentSchema>;

/**
 * Schema for a GitHub pull request.
 */
export const pullRequestSchema = z.object({
  /** The pull request number. */
  number: z.number(),
  /** The numeric pull request ID. */
  id: z.number(),
  /** The GraphQL node ID of the pull request. */
  node_id: z.string(),
  /** The title of the pull request. */
  title: z.string(),
  /** The body content of the pull request, or null if none. */
  body: z.string().nullable(),
  /** The state of the pull request (open or closed). */
  state: z.string(),
  /** Whether the pull request is a draft. */
  draft: z.boolean(),
  /** The HTML URL of the pull request. */
  html_url: z.string(),
  /** The head branch reference. */
  head: z.object({
    /** The branch name of the head ref. */
    ref: z.string(),
  }).passthrough(),
  /** The base branch reference. */
  base: z.object({
    /** The branch name of the base ref. */
    ref: z.string(),
  }).passthrough(),
  /** The user who created the pull request. */
  user: userSchema,
  /** The author association with the repository. */
  author_association: associationSchema,
}).passthrough();

/**
 * Type representing a GitHub pull request.
 */
export type GitHubPullRequest = z.infer<typeof pullRequestSchema>;

/**
 * Schema for a GitHub review.
 */
export const reviewSchema = z.object({
  /** The review ID. */
  id: z.number(),
  /** The review state (approved, changes_requested, etc.). */
  state: z.string(),
  /** The review body text, or null/undefined if none. */
  body: z.string().nullable().optional(),
  /** The user who wrote the review. */
  user: userSchema,
  /** The author association with the repository. */
  author_association: associationSchema,
}).passthrough();

/**
 * Type representing a GitHub review.
 */
export type GitHubReview = z.infer<typeof reviewSchema>;

/**
 * Schema for a GitHub variable.
 */
export const variableSchema = z.object({
  /** The variable name. */
  name: z.string(),
  /** The variable value. */
  value: z.string(),
  /** The timestamp when the variable was created, if available. */
  created_at: z.string().optional(),
  /** The timestamp when the variable was last updated, if available. */
  updated_at: z.string().optional(),
}).passthrough();

/**
 * Type representing a GitHub variable.
 */
export type GitHubVariable = z.infer<typeof variableSchema>;

/**
 * Snapshot of rate limit information for a specific resource.
 */
export interface RateLimitSnapshot {
  /** Name of the resource (e.g., core, search). */
  resource: string;
  /** Maximum number of requests allowed per hour (if provided). */
  limit?: number;
  /** Remaining number of requests in the current window. */
  remaining: number;
  /** Time when the rate limit resets. */
  resetAt: Date;
  /** Cost of the request (if applicable). */
  cost?: number;
}

/**
 * Pagination information for GraphQL connections.
 */
export interface PageInfo {
  /** Indicates if there is another page after the current one. */
  hasNextPage: boolean;
  /** Cursor for the last item in the current page, used for fetching the next page. */
  endCursor: string | null;
}

/**
 * Generic GraphQL connection containing nodes and pagination info.
 */
export interface GraphQLConnection<T> {
  /** Array of items in the connection. */
  nodes: T[];
  /** Pagination information for the connection. */
  pageInfo: PageInfo;
}
