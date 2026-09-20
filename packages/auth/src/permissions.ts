/** @packageDocumentation
 * Intersection of authenticated-user authority and GitHub App installation/repository authority.
 */

/** Repository permissions reported for the authenticated GitHub user. */
export interface RepositoryPermissions {
	admin: boolean;
	push: boolean;
	pull: boolean;
}

/** Effective repository authority available to the installed DarkFactory GitHub App. */
export interface AppRepositoryAuthority {
	installed: boolean;
	repositorySelected: boolean;
	canRead: boolean;
	canWrite: boolean;
	canAdminister?: boolean;
}

/** Browser-visible authority after intersecting user and App authority. */
export interface ProjectedAuthority {
	canRead: boolean;
	canMutate: boolean;
	isAdmin: boolean;
	userId: string;
}

/** Projects effective authority and fails closed whenever either the user or App lacks the required access. */
export function projectAuthority(
	userPermissions: RepositoryPermissions,
	appAuthority: AppRepositoryAuthority,
	userId: string,
): ProjectedAuthority {
	const available = appAuthority.installed && appAuthority.repositorySelected;
	return {
		canRead: available && appAuthority.canRead && userPermissions.pull,
		canMutate: available && appAuthority.canWrite && (userPermissions.push || userPermissions.admin),
		isAdmin: available && appAuthority.canAdminister === true && userPermissions.admin,
		userId,
	};
}

/** Human-attributed mutation intent forwarded to the privileged App/df execution path. */
export interface MutationIntent {
	action: string;
	actor: string;
	timestamp: string;
	payload: Readonly<Record<string, unknown>>;
}

/** Creates a typed human-attributed mutation intent without granting execution authority by itself. */
export function createMutationIntent(
	action: string,
	actor: string,
	payload: Readonly<Record<string, unknown>>,
): MutationIntent {
	if (!action.trim()) throw new Error("Mutation intent action must not be empty");
	if (!actor.trim()) throw new Error("Mutation intent actor must not be empty");
	return { action, actor, timestamp: new Date().toISOString(), payload };
}
