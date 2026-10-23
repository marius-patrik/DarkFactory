import { describe, expect, test } from "bun:test";
import { createMutationIntent, projectAuthority } from "../src/permissions.ts";

describe("@darkfactory/auth authority projection", () => {
	test("authority is the intersection of user and App repository authority", () => {
		const full = projectAuthority(
			{ admin: true, push: true, pull: true },
			{ installed: true, repositorySelected: true, canRead: true, canWrite: true, canAdminister: true },
			"octocat",
		);
		expect(full).toEqual({ canRead: true, canMutate: true, isAdmin: true, userId: "octocat" });

		const appReadOnly = projectAuthority(
			{ admin: true, push: true, pull: true },
			{ installed: true, repositorySelected: true, canRead: true, canWrite: false },
			"octocat",
		);
		expect(appReadOnly.canRead).toBe(true);
		expect(appReadOnly.canMutate).toBe(false);
		expect(appReadOnly.isAdmin).toBe(false);
	});

	test("missing installation or repository selection fails closed", () => {
		for (const app of [
			{ installed: false, repositorySelected: true, canRead: true, canWrite: true },
			{ installed: true, repositorySelected: false, canRead: true, canWrite: true },
		]) {
			const authority = projectAuthority({ admin: true, push: true, pull: true }, app, "octocat");
			expect(authority.canRead).toBe(false);
			expect(authority.canMutate).toBe(false);
		}
	});

	test("mutation intents preserve human attribution with unknown-safe payloads", () => {
		const intent = createMutationIntent("create_request", "octocat", { title: "Feature", nested: { value: 1 } });
		expect(intent.actor).toBe("octocat");
		expect(intent.payload.title).toBe("Feature");
	});
});
