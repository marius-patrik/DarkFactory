import { z } from "zod";

export const associationSchema = z.string();
export type AuthorAssociation = z.infer<typeof associationSchema>;
const userSchema = z.object({ login: z.string() }).passthrough();
const labelSchema = z.union([z.string(), z.object({ name: z.string() }).passthrough()]);

export const issueSchema = z.object({ number: z.number(), id: z.number(), node_id: z.string(), title: z.string(), body: z.string().nullable(), state: z.string(), labels: z.array(labelSchema), user: userSchema, author_association: associationSchema, html_url: z.string() }).passthrough();
export type GitHubIssue = z.infer<typeof issueSchema>;
export const commentSchema = z.object({ id: z.number(), body: z.string().nullable().default(null), user: userSchema, author_association: associationSchema }).passthrough();
export type GitHubComment = z.infer<typeof commentSchema>;
export const pullRequestSchema = z.object({ number: z.number(), id: z.number(), node_id: z.string(), title: z.string(), body: z.string().nullable(), state: z.string(), draft: z.boolean(), html_url: z.string(), head: z.object({ ref: z.string() }).passthrough(), base: z.object({ ref: z.string() }).passthrough(), user: userSchema, author_association: associationSchema }).passthrough();
export type GitHubPullRequest = z.infer<typeof pullRequestSchema>;
export const reviewSchema = z.object({ id: z.number(), state: z.string(), body: z.string().nullable().optional(), user: userSchema, author_association: associationSchema }).passthrough();
export type GitHubReview = z.infer<typeof reviewSchema>;
export const variableSchema = z.object({ name: z.string(), value: z.string(), created_at: z.string().optional(), updated_at: z.string().optional() }).passthrough();
export type GitHubVariable = z.infer<typeof variableSchema>;

export interface RateLimitSnapshot { resource: string; limit?: number; remaining: number; resetAt: Date; cost?: number; }
export interface PageInfo { hasNextPage: boolean; endCursor: string | null; }
export interface GraphQLConnection<T> { nodes: T[]; pageInfo: PageInfo; }
