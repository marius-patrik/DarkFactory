import { z } from "zod";
import type { AppIdentity, ManifestIdentities, ProviderIdentity } from "./types.ts";

/**
 * Error thrown when identity validation fails.
 * Contains a list of human‑readable issue strings describing each problem.
 * @property {string[]} issues - Human‑readable validation issue messages.
 */
export class IdentitiesValidationError extends Error {
	constructor(public readonly issues: string[]) {
		super(`Invalid identities declaration:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
		this.name = "IdentitiesValidationError";
	}
}

/**
 * Zod schema for validating an application identity entry.
 * Ensures required fields like `login` and `user_id` are present and correctly typed.
 */
export const appIdentitySchema = z
	.object({
		slug: z.string().optional(),
		login: z.string().min(1, "app login must not be empty"),
		user_id: z.number().int().positive("app user_id must be a positive integer"),
		commit_author_email: z.string().min(1).optional(),
		name: z.string().optional(),
	})
	.passthrough();

/**
 * Zod schema for validating a provider identity entry.
 * Validates fields such as `name`, `display_name`, `trailer`, and `verified`.
 * Includes custom refinement to enforce constraints on `name`/`display_name` and `trailer` based on verification status.
 */
export const providerIdentitySchema = z
	.object({
		name: z.string().min(1, "provider display name must not be empty").optional(),
		display_name: z.string().min(1).optional(),
		trailer: z.string().nullable().optional(),
		note: z.string().optional(),
		note_text: z.string().optional(),
		comment_note: z.string().optional(),
		account_link: z.string().nullable().optional(),
		account_url: z.string().nullable().optional(),
		verified: z.boolean(),
	})
	.passthrough()
	.superRefine((data, ctx) => {
		if (!data.name && !data.display_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "provider identity must declare name or display_name",
				path: ["name"],
			});
		}
		if (data.verified) {
			if (!data.trailer || typeof data.trailer !== "string" || !data.trailer.trim()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "verified provider must have a non-empty trailer",
					path: ["trailer"],
				});
			}
		} else {
			if (data.trailer) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "unverified provider must not emit a trailer",
					path: ["trailer"],
				});
			}
		}
	});

function formatZodPath(path: readonly PropertyKey[]): string {
	return path
		.map((part, index) => (typeof part === "number" ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`))
		.join("");
}

/**
 * Validate the `identities` section of a manifest.
 *
 * @param rawDocument - The parsed manifest object (or its `identities` sub‑object).
 * @returns A {@link ManifestIdentities} object containing the resolved app and provider identities.
 * @throws {@link IdentitiesValidationError} when required sections are missing or any validation issues are found.
 */
export function validateIdentities(rawDocument: unknown): ManifestIdentities {
	if (!rawDocument || typeof rawDocument !== "object" || Array.isArray(rawDocument)) {
		throw new IdentitiesValidationError(["identities declaration must be an object"]);
	}

	const doc = rawDocument as Record<string, unknown>;
	const identitiesRaw = "identities" in doc ? doc.identities : doc;

	if (!identitiesRaw || typeof identitiesRaw !== "object" || Array.isArray(identitiesRaw)) {
		throw new IdentitiesValidationError(["Missing or invalid 'identities' section in manifest"]);
	}

	const rawObj = identitiesRaw as Record<string, unknown>;
	const issues: string[] = [];

	// Find app identity: check app, automation, or pipeline
	const appRaw = rawObj.app ?? rawObj.automation ?? rawObj.pipeline;
	if (!appRaw) {
		issues.push("Missing app/automation identity entry in identities");
	}

	let app: AppIdentity | undefined;
	if (appRaw) {
		const parsedApp = appIdentitySchema.safeParse(appRaw);
		if (!parsedApp.success) {
			for (const issue of parsedApp.error.issues) {
				issues.push(`app.${formatZodPath(issue.path)}: ${issue.message}`);
			}
		} else {
			const d = parsedApp.data;
			app = {
				slug: d.slug ?? "darkfactory-pipeline",
				login: d.login,
				user_id: d.user_id,
				commit_author_email: d.commit_author_email ?? `${d.user_id}+${d.login}@users.noreply.github.com`,
				...(d.name ? { name: d.name } : {}),
			};
		}
	}

	// Find provider entries: either in rawObj.providers or top-level keys
	const providers: Record<string, ProviderIdentity> = {};
	let rawProvidersMap: Record<string, unknown> = {};

	if (rawObj.providers && typeof rawObj.providers === "object" && !Array.isArray(rawObj.providers)) {
		rawProvidersMap = rawObj.providers as Record<string, unknown>;
	} else {
		for (const [key, val] of Object.entries(rawObj)) {
			if (key === "app" || key === "automation" || key === "pipeline" || key.startsWith("$")) {
				continue;
			}
			rawProvidersMap[key] = val;
		}
	}

	for (const [providerKey, providerRaw] of Object.entries(rawProvidersMap)) {
		if (providerKey.startsWith("$")) continue;
		const parsedProvider = providerIdentitySchema.safeParse(providerRaw);
		if (!parsedProvider.success) {
			for (const issue of parsedProvider.error.issues) {
				issues.push(`providers[${providerKey}].${formatZodPath(issue.path)}: ${issue.message}`);
			}
		} else {
			const d = parsedProvider.data;
			const name = (d.name ?? d.display_name)!;
			const displayName = d.display_name ?? d.name;
			const trailer = d.trailer ? d.trailer.trim() : null;
			const note = d.note ?? d.note_text ?? d.comment_note ?? "Generated with {model}";
			const accountLink = d.account_link ?? d.account_url ?? null;
			providers[providerKey] = {
				name,
				...(displayName ? { display_name: displayName } : {}),
				trailer,
				note,
				account_link: accountLink,
				verified: d.verified,
			};
		}
	}

	if (issues.length > 0 || !app) {
		throw new IdentitiesValidationError(issues);
	}

	return {
		app,
		providers,
	};
}
