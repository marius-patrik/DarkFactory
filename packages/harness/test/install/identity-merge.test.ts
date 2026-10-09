import { describe, expect, it } from "bun:test";
import { RepositoryManifest } from "../../src/install/manifest.ts";

/**
 * `identities()` returned the declaration *or* the defaults. The consequence was invisible in the common
 * case and severe in the rest: a repository declaring `identities.app` with its own bot login kept that
 * login but lost every provider identity the pipeline had defaults for, so `identityFor("claude")`
 * returned undefined and a Claude commit carried no `Co-authored-by` trailer.
 *
 * A commit attributed to nobody, or to a stranger, is the failure this block's own comment warns about.
 */
describe("declared identities", () => {
	const manifest = (data: Record<string, unknown>) => new RepositoryManifest(".", data);

	it("keeps the provider identities a repository did not mention", () => {
		const m = manifest({ identities: { app: { login: "acme[bot]" } } });

		// The defect: before the merge this returned `{app}` and every provider was gone.
		expect(Object.keys(m.identities())).toEqual(
			expect.arrayContaining(["app", "claude", "codex", "google", "antigravity"]),
		);
	});

	it("uses the declared app identity in preference to the default", () => {
		const m = manifest({
			identities: {
				app: { login: "acme[bot]", user_id: 999, commit_author_email: "999+acme[bot]@users.noreply.github.com" },
			},
		});

		expect(m.botCommitAuthor()).toBe("acme[bot] <999+acme[bot]@users.noreply.github.com>");
	});

	it("does not inherit the default login into a partially declared app identity", () => {
		// Merged per identity rather than per field on purpose. A field-level merge would give a repository
		// that declared only `login` the default `commit_author_email` - which names a different bot - and
		// the resulting commit would be attributed to the pipeline's App rather than the declared one.
		const m = manifest({ identities: { app: { login: "acme[bot]" } } });

		const app = m.identities().app as Record<string, unknown>;
		expect(app.login).toBe("acme[bot]");
		expect(app.commit_author_email).toBeUndefined();
	});

	it("returns the defaults when nothing is declared", () => {
		const m = manifest({ identities: {} });

		expect(m.identities().app).toMatchObject({ login: "darkfactory-pipeline[bot]" });
	});

	it("lets a repository declare one provider without losing the others", () => {
		const m = manifest({
			identities: { claude: { name: "Claude Opus", trailer: "Co-authored-by: Opus <ops@acme.dev>" } },
		});

		expect(m.identityFor("claude")).toMatchObject({ name: "Claude Opus" });
		expect(m.identityFor("google"), "google was declared nowhere and must survive").toMatchObject({
			display_name: "Gemini",
		});
	});

	it("hands out a copy, so a caller cannot mutate the defaults for the next reader", () => {
		const m = manifest({ identities: {} });
		const first = m.identities();
		(first.app as Record<string, unknown>).login = "mutated";

		expect((m.identities().app as Record<string, unknown>).login).toBe("darkfactory-pipeline[bot]");
	});
});
