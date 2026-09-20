/** @packageDocumentation
 * Permission projection and human-attribution intent interfaces.
 *
 * This component allows combining authenticated user authority (e.g. GitHub roles)
 * with the GitHub App installation/repository authority to project final UI capabilities.
 */

import { z } from "zod";

/**
 * User permission types on a repository.
 */
export const RepositoryPermissionsSchema = z.object({
  admin: z.boolean(),
  push: z.boolean(),
  pull: z.boolean(),
});

export type RepositoryPermissions = z.infer<typeof RepositoryPermissionsSchema>;

/**
 * Projected authority that combines the user permissions and App installation permissions.
 */
export interface ProjectedAuthority {
  /** True if the user has read access. */
  canRead: boolean;
  /** True if the user can trigger mutations (writes) */
  canMutate: boolean;
  /** True if the user is a repository administrator */
  isAdmin: boolean;
  /** The specific user attribution (e.g. GitHub handle) */
  userId: string;
}

/**
 * Projects the authority by combining user permissions with the app installation's capabilities.
 *
 * @param userPermissions - The repository permissions for the authenticated user.
 * @param userId - The GitHub login/handle of the authenticated user.
 * @returns The final UI and execution authority projection.
 */
export function projectAuthority(
  userPermissions: RepositoryPermissions,
  userId: string
): ProjectedAuthority {
  return {
    canRead: userPermissions.pull,
    canMutate: userPermissions.push,
    isAdmin: userPermissions.admin,
    userId,
  };
}

/**
 * Schema for a human-attributed mutation intent.
 * Every action triggered by a human must carry this attribution.
 */
export const MutationIntentSchema = z.object({
  action: z.string(),
  actor: z.string(),
  timestamp: z.string(),
  payload: z.record(z.string(), z.any()),
});

export type MutationIntent = z.infer<typeof MutationIntentSchema>;

/**
 * Creates a validated mutation intent with explicit human attribution.
 */
export function createMutationIntent(
  action: string,
  actor: string,
  payload: Record<string, any>
): MutationIntent {
  return MutationIntentSchema.parse({
    action,
    actor,
    timestamp: new Date().toISOString(),
    payload,
  });
}
