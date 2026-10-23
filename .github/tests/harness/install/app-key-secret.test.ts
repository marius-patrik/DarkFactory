import { describe, expect, it } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll } from "bun:test";
import { ensureSecretsPass } from "../../src/install/reinstall.ts";
import { loadRepositoryManifest } from "../../src/install/manifest.ts";

const roots: string[] = [];
afterAll(async () => {
	for (const dir of roots) await rm(dir, { recursive: true, force: true });
});

/**
 * A repository that installs with the pipeline declares the App key's name in its own configuration.
 * `ensureSecretsPass` used to write that name as a literal, which meant a repository that renamed the
 * secret kept a declaration saying one thing and a reinstaller injecting another.
 */
describe("the App key's name", () => {
	it("is read from the repository's own declaration", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(
			join(root, "repo.dfconfig"),
			JSON.stringify({ repo: { app: { private_key_secret: "ACME_APP_KEY" } } }),
		);
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(
			join(root, ".github", "workflows", "ci.yml"),
			'jobs:\n  build:\n    uses: acme/pipeline/.github/workflows/ci.yml@v1\n    with:\n      pipeline-ref: ""\n    secrets:\n',
		);

		await ensureSecretsPass(root);

		const after = await Bun.file(join(root, ".github", "workflows", "ci.yml")).text();
		expect(after).toContain("ACME_APP_KEY");
		expect(after).not.toContain("DARKFACTORY_APP_PRIVATE_KEY");
	});

	it("falls back to the pipeline's own name when the repository declares none", async () => {
		// The honest default for a repository that never declared one: it is the name every installed
		// workflow reads, so writing anything else would pass a secret the workflow does not look for.
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify({ repo: { identity: { owner: "a", repo: "b" } } }));
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(
			join(root, ".github", "workflows", "ci.yml"),
			'jobs:\n  build:\n    uses: acme/pipeline/.github/workflows/ci.yml@v1\n    with:\n      pipeline-ref: ""\n    secrets:\n',
		);

		await ensureSecretsPass(root);

		expect(await Bun.file(join(root, ".github", "workflows", "ci.yml")).text()).toContain(
			"DARKFACTORY_APP_PRIVATE_KEY",
		);
	});

	// The defect this fixes: the "already passed it?" check looked for the literal, so a caller already
	// carrying the *declared* name was not recognised and a second entry was appended for a secret that
	// does not exist. Both names present, one of them wrong.
	it("recognises the declared name and does not append a second entry", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(
			join(root, "repo.dfconfig"),
			JSON.stringify({ repo: { app: { private_key_secret: "ACME_APP_KEY" } } }),
		);
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(
			join(root, ".github", "workflows", "ci.yml"),
			[
				"jobs:",
				"  build:",
				"    uses: acme/pipeline/.github/workflows/ci.yml@v1",
				"    with:",
				'      pipeline-ref: ""',
				"    secrets:",
				// Assembled from parts, so this reads as a workflow line rather than as a template to both a
				// linter and whoever skims it next.
				["      ACME_APP_KEY: $", "{ secrets.ACME_APP_KEY }"].join(""),
				"",
			].join("\n"),
		);

		const changed = await ensureSecretsPass(root);
		const after = await Bun.file(join(root, ".github", "workflows", "ci.yml")).text();

		expect(changed, "nothing needed changing, so nothing was reported as changed").toEqual([]);
		expect(after).not.toContain("DARKFACTORY_APP_PRIVATE_KEY");
		expect(after.match(/ACME_APP_KEY:/gu)).toHaveLength(1);
	});

	it("still repairs a caller that passes nothing at all", async () => {
		// The case the repair exists for, and the one that must not regress: a hand-written caller with no
		// `secrets:` line gets `secrets: inherit`.
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify({ repo: {} }));
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(
			join(root, ".github", "workflows", "verify-pr-issue.yml"),
			'jobs:\n  check:\n    uses: acme/pipeline/.github/workflows/verify-pr-issue.yml@v1\n    with:\n      pipeline-ref: ""\n',
		);

		await ensureSecretsPass(root);

		expect(await Bun.file(join(root, ".github", "workflows", "verify-pr-issue.yml")).text()).toContain(
			"secrets: inherit",
		);
	});

	it("leaves a repository's own workflow alone", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify({ repo: {} }));
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(join(root, ".github", "workflows", "mine.yml"), "jobs:\n  build:\n    runs-on: ubuntu-latest\n");

		expect(await ensureSecretsPass(root)).toEqual([]);
	});

	it("surfaces the declared name through the manifest for other callers", async () => {
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(
			join(root, "repo.dfconfig"),
			JSON.stringify({ repo: { app: { private_key_secret: "ACME_APP_KEY" } } }),
		);

		expect((await loadRepositoryManifest(root)).appKeySecret()).toBe("ACME_APP_KEY");
	});

	it("reports no name when the repository declares none, rather than the default", async () => {
		// The accessor answers "what does this repository say", which is different from "what name should
		// be used". Folding the fallback in here would make the declaration unreadable.
		const root = await mkdtemp(join(tmpdir(), "df-key-"));
		roots.push(root);
		await writeFile(join(root, "repo.dfconfig"), JSON.stringify({ repo: { app: {} } }));

		expect((await loadRepositoryManifest(root)).appKeySecret()).toBeUndefined();
	});
});
