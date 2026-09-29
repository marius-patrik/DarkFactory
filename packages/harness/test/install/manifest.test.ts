import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
	AREA_COLOURS,
	DEFAULT_AREAS,
	DEFAULT_IDENTITIES,
	loadConfigBlock,
	loadRepositoryManifest,
	MANIFEST_PATH,
	resolveManifestPath,
} from "../../src/install/manifest.ts";

// Four levels up: this suite is one directory deeper than `test/ci/`, and a test that reads
// repository content has to derive the same root the pipeline does or it asserts against the wrong
// tree.
const repoRoot = join(import.meta.dir, "..", "..", "..", "..");

const roots: string[] = [];
async function scratch(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "df-manifest-test-"));
	roots.push(dir);
	return dir;
}
afterAll(async () => {
	for (const dir of roots) await rm(dir, { recursive: true, force: true });
});

/** Writes a throwaway repository root whose `repo` block is `data`. */
async function declare(data: unknown): Promise<string> {
	const dir = await scratch();
	await writeFile(join(dir, MANIFEST_PATH), JSON.stringify({ repo: data }));
	return dir;
}

/** The repository root as a declaration-free manifest sees it. */
const NO_ENV: Record<string, string | undefined> = {};

describe("identity", () => {
	test("the real manifest identifies this repository", async () => {
		const loaded = await loadRepositoryManifest(repoRoot);
		expect(loaded.slug()).toBe("marius-patrik/DarkFactory");
		expect(loaded.homepage()).toBe("https://marius-patrik.github.io/DarkFactory/");
		expect(loaded.defaultBranch()).toBe("main");
		expect(loaded.developmentBranch()).toBe("develop");
	});

	test("identity is read from the declaration", async () => {
		const dir = await declare({ identity: { owner: "acme", repo: "widget" } });
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.slug()).toBe("acme/widget");
		expect(loaded.homepage()).toBe("https://acme.github.io/widget/");
		expect(loaded.developmentBranch()).toBe(loaded.defaultBranch());
		expect(loaded.developmentBranch()).toBe("main");
	});

	test("the agent slug defaults from the repository name", async () => {
		const dir = await declare({ identity: { owner: "acme", repo: "Widget" } });
		expect((await loadRepositoryManifest(dir)).agentSlug()).toBe("widget-agent");
	});

	test("a declared agent slug wins", async () => {
		const dir = await declare({ identity: { owner: "a", repo: "B", agent_slug: "custom-agent" } });
		expect((await loadRepositoryManifest(dir)).agentSlug()).toBe("custom-agent");
	});

	test("the project title falls back to the display name", async () => {
		const dir = await declare({ identity: { owner: "a", repo: "b", display_name: "Bee" } });
		expect((await loadRepositoryManifest(dir)).projectTitle()).toBe("Bee");
	});

	test("a missing manifest still yields a usable object", async () => {
		const dir = await scratch();
		const loaded = await loadRepositoryManifest(dir, { GITHUB_REPOSITORY: "acme/fallback" });
		expect(loaded.slug()).toBe("acme/fallback");
		expect(loaded.topics()).toEqual([]);
	});

	test("a malformed manifest fails closed", async () => {
		const dir = await scratch();
		await writeFile(join(dir, MANIFEST_PATH), "{ this is not json");
		await expect(loadRepositoryManifest(dir)).rejects.toThrow("Invalid DarkFactory configuration JSON");
	});

	test("a repo consumer does not read provider fields", async () => {
		const dir = await declare({
			identity: { owner: "repo-owner", repo: "repo-name" },
			providers: { identity: { owner: "wrong", repo: "wrong" } },
		});
		expect((await loadRepositoryManifest(dir)).slug()).toBe("repo-owner/repo-name");
	});
});

describe("areas", () => {
	test("may be plain descriptions", async () => {
		const dir = await declare({ areas: { core: "The core", ui: "The surface" } });
		expect((await loadRepositoryManifest(dir)).areas()).toEqual({ core: "The core", ui: "The surface" });
	});

	test("may carry keywords", async () => {
		const dir = await declare({ areas: { core: { description: "The core", keywords: ["kernel", "bus"] } } });
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.areas().core).toBe("The core");
		expect(loaded.areaKeywords().core).toEqual(["kernel", "bus"]);
	});

	test("an area without keywords matches its own name", async () => {
		const dir = await declare({ areas: { telemetry: "Metrics" } });
		expect((await loadRepositoryManifest(dir)).areaKeywords().telemetry).toEqual(["telemetry"]);
	});

	test("labels are prefixed and coloured", async () => {
		const dir = await declare({ areas: { core: "The core" } });
		const labels = (await loadRepositoryManifest(dir)).areaLabels();
		expect(labels[0]?.name).toBe("area:core");
		expect(labels[0]?.colour).toMatch(/^[0-9a-f]{6}$/u);
	});

	test("every area gets a distinct colour from the declared palette", async () => {
		const palette = ["111111", "222222", "333333", "444444", "555555", "666666", "777777", "888888", "999999"];
		const dir = await declare({
			labels: { area_colours: palette },
			areas: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`a${i}`, String(i)])),
		});
		const labels = (await loadRepositoryManifest(dir)).areaLabels();
		expect(new Set(labels.map((label) => label.colour)).size).toBe(9);
	});

	test("colours cycle once the declared palette runs out", async () => {
		// The palette is configuration, so the test declares one and asserts against it.
		const palette = ["111111", "222222", "333333"];
		const dir = await declare({
			labels: { area_colours: palette },
			areas: Object.fromEntries(Array.from({ length: palette.length + 2 }, (_, i) => [`a${i}`, String(i)])),
		});
		const labels = (await loadRepositoryManifest(dir)).areaLabels();
		expect(labels[palette.length]?.colour).toBe(palette[0]);
	});

	test("with no declared palette areas cycle the default colours", async () => {
		// Distinct colours, so the areas stay tellable apart on the board. One neutral for all of them
		// said only that nothing was configured.
		const dir = await declare({ areas: { one: "One", two: "Two" } });
		const labels = (await loadRepositoryManifest(dir)).areaLabels();
		expect(labels.map((label) => label.colour)).toEqual(AREA_COLOURS.slice(0, 2));
	});

	test("scopes match the areas", async () => {
		const dir = await declare({ areas: { b: "B", a: "A" } });
		expect((await loadRepositoryManifest(dir)).areaScopes()).toEqual(["a", "b"]);
	});

	test("a declared default area is used", async () => {
		const dir = await declare({ areas: { $default: "ops", ops: "Ops", app: "App" } });
		expect((await loadRepositoryManifest(dir)).defaultArea()).toBe("ops");
	});

	test("an undeclared default falls back to the last area in declaration order", async () => {
		// Declaration order is match order, so the last entry is the most general one.
		const dir = await declare({ areas: { first: "First", last: "Last" } });
		expect((await loadRepositoryManifest(dir)).defaultArea()).toBe("last");
	});

	test("comment keys are not areas", async () => {
		const dir = await declare({ areas: { $comment: "note", app: "App" } });
		expect(Object.keys((await loadRepositoryManifest(dir)).areas())).toEqual(["app"]);
	});

	test("a repository declaring no areas gets the pipeline's own", async () => {
		// A declaration is an override, not a requirement. A consumer that installs the pipeline has
		// not described its areas, and the routing and Conventional Commit scopes it inherits were
		// written against this taxonomy; declaring them replaces it.
		const dir = await declare({});
		expect((await loadRepositoryManifest(dir)).areas()).toEqual(DEFAULT_AREAS);
	});
});

describe("pages", () => {
	test("the actions source is declared", async () => {
		expect((await loadRepositoryManifest(repoRoot)).pagesPayload()).toEqual({ build_type: "workflow" });
	});

	test("an undeclared source defaults to the actions build", async () => {
		const dir = await declare({});
		expect((await loadRepositoryManifest(dir)).pagesPayload()).toEqual({ build_type: "workflow" });
	});

	test("a legacy source carries its branch and path", async () => {
		const dir = await declare({ pages: { build_type: "legacy", branch: "docs", path: "/site" } });
		expect((await loadRepositoryManifest(dir)).pagesPayload()).toEqual({
			build_type: "legacy",
			source: { branch: "docs", path: "/site" },
		});
	});

	test("a legacy source without a branch or path gets the defaults", async () => {
		const dir = await declare({ pages: { build_type: "legacy" } });
		expect((await loadRepositoryManifest(dir)).pagesPayload()).toEqual({
			build_type: "legacy",
			source: { branch: "gh-pages", path: "/" },
		});
	});
});

describe("upstream", () => {
	test("DarkFactory is its own upstream", async () => {
		expect((await loadRepositoryManifest(repoRoot)).isUpstream()).toBe(true);
	});

	test("a consumer pins a ref", async () => {
		const dir = await declare({ upstream: { repo: "marius-patrik/DarkFactory", ref: "abc123" } });
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.isUpstream()).toBe(false);
		expect(loaded.upstream()).toEqual({ repo: "marius-patrik/DarkFactory", ref: "abc123" });
	});

	test("a documentation key is not an upstream", async () => {
		const dir = await declare({ upstream: { $comment: "self", repo: null, ref: null } });
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.isUpstream()).toBe(true);
		expect(loaded.upstream()).toEqual({ repo: null, ref: null });
	});
});

describe("boards", () => {
	test("the repository's own board is always linked", async () => {
		const dir = await declare({ identity: { owner: "a", repo: "b", project_title: "Bee" }, board: {} });
		expect((await loadRepositoryManifest(dir)).boards()).toContain("Bee");
	});

	test("every declared board is read, and there is no limit on how many", async () => {
		const dir = await declare({
			identity: { owner: "a", repo: "b", project_title: "Bee" },
			board: { boards: ["Global", "Omnis", "ChessWithQuests", "Extra", "Sixth", "Seventh"] },
		});
		const boards = (await loadRepositoryManifest(dir)).boards();
		// Six declared, and the repository's own added because it is not among them. There is no
		// privileged board here and no ceiling on the count — "Global" is one of six, not a separate
		// thing with its own field.
		expect(boards).toEqual(["Global", "Omnis", "ChessWithQuests", "Extra", "Sixth", "Seventh", "Bee"]);
	});

	test("the global board is named by reference into the declared list", async () => {
		expect((await loadRepositoryManifest(repoRoot)).globalBoard()).toBe("Global");
	});

	test("a global board this repository does not declare is not one", async () => {
		// It would otherwise be created and linked to nothing, which is a board in the account that no
		// repository claims.
		const dir = await declare({ board: { global: "Elsewhere", boards: ["Bee"] } });
		expect((await loadRepositoryManifest(dir)).globalBoard()).toBeUndefined();
	});

	test("no global board is used when none is declared", async () => {
		const dir = await declare({});
		expect((await loadRepositoryManifest(dir)).globalBoard()).toBeUndefined();
	});
});

describe("required checks", () => {
	test("this repository uses the bare names", async () => {
		const checks = (await loadRepositoryManifest(repoRoot)).requiredChecks();
		expect(checks).toContain("quality");
		expect(checks).toContain("verify-bound-issue");
	});

	test("a consumer can still override them", async () => {
		const dir = await declare({ required_checks: ["pipeline / pipeline (3.12)", "pipeline / docs"] });
		expect((await loadRepositoryManifest(dir)).requiredChecks()).toEqual([
			"pipeline / pipeline (3.12)",
			"pipeline / docs",
		]);
	});

	test("declaring none derives them from the protection lanes", async () => {
		// There is no longer a default list in the code. A repository that declares no
		// `required_checks` gets the union of whatever its protection lanes require, so the manifest
		// and the reconcile cannot disagree about which checks gate a merge — which is the whole
		// point of having one declaration.
		const dir = await declare({
			protection: {
				lanes: [
					{ branch: "develop", required_checks: ["quality"], approvals: 1 },
					{ branch: "main", required_checks: ["quality", "main-source"], approvals: 0 },
				],
			},
		});
		expect((await loadRepositoryManifest(dir)).requiredChecks()).toEqual(["quality", "main-source"]);
	});

	test("a repository declaring neither has no required checks", async () => {
		const dir = await declare({});
		expect((await loadRepositoryManifest(dir)).requiredChecks()).toEqual([]);
	});
});

describe("the pipeline App", () => {
	test("its identity is recorded", async () => {
		const app = (await loadRepositoryManifest(repoRoot)).app();
		expect(app.slug).toBe("darkfactory-pipeline");
		expect(typeof app.app_id).toBe("number");
	});

	test("the private key is named but never stored", async () => {
		const app = (await loadRepositoryManifest(repoRoot)).app();
		expect(app.private_key_secret).toBe("DARKFACTORY_APP_PRIVATE_KEY");
		const serialised = JSON.stringify(app);
		expect(serialised).not.toContain("BEGIN RSA PRIVATE KEY");
		expect(serialised).not.toContain("BEGIN PRIVATE KEY");
	});

	test("a repository without an App is fine", async () => {
		const dir = await declare({});
		expect((await loadRepositoryManifest(dir)).app()).toEqual({});
	});
});

describe("identities", () => {
	test("the real manifest declares them", async () => {
		const loaded = await loadRepositoryManifest(repoRoot);
		const identities = loaded.identities();
		expect(Object.keys(identities)).toContain("app");
		expect(Object.keys(identities)).toContain("google");
		expect(Object.keys(identities)).toContain("claude");
		expect(loaded.botCommitAuthor()).toBe(
			"darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>",
		);
		expect(loaded.identityFor("google")?.name).toBe("Gemini");
		expect(loaded.identityFor("google")?.verified).toBe(true);
		expect(loaded.identityFor("claude")?.trailer).toBe("Co-authored-by: Claude <noreply@anthropic.com>");
	});

	test("a repository declaring no identities gets the pipeline's own", async () => {
		// A consumer that installs the pipeline has this pipeline's App — it is what opens the pull
		// requests and pushes the branches — so the default author is the thing actually doing its
		// work, not a stranger. Declaring identities replaces it.
		const dir = await declare({});
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.identities()).toEqual(DEFAULT_IDENTITIES);
		expect(loaded.identityFor("app")?.login).toBe("darkfactory-pipeline[bot]");
	});

	test("custom declared identities win", async () => {
		const dir = await declare({
			identities: {
				app: { login: "custom-bot[bot]", user_id: 999999, commit_author_email: "custom-bot@example.com" },
				"custom-provider": {
					name: "Custom Provider",
					trailer: "Co-authored-by: Custom <custom@example.com>",
					verified: true,
				},
			},
		});
		const loaded = await loadRepositoryManifest(dir);
		expect(loaded.botCommitAuthor()).toBe("custom-bot[bot] <custom-bot@example.com>");
		expect(loaded.identityFor("custom-provider")?.name).toBe("Custom Provider");
		expect(loaded.identityFor("custom-provider")?.verified).toBe(true);
		expect(loaded.identityFor("nonexistent")).toBeUndefined();
	});

	test("a documentation key alone does not count as a declaration", async () => {
		// The block is empty once comments are stripped, so this is the undeclared case: the default
		// applies, and the comment is not mistaken for a declared identity.
		const dir = await declare({ identities: { $comment: "none" } });
		expect((await loadRepositoryManifest(dir)).identities()).toEqual(DEFAULT_IDENTITIES);
	});

	test("a providers sub-block wins over a top-level key of the same name", async () => {
		const dir = await declare({ identities: { providers: { google: { name: "Nested" } } } });
		expect((await loadRepositoryManifest(dir)).identityFor("google")?.name).toBe("Nested");
	});

	test("what one caller read is not shared with the next", async () => {
		// It used to guard the *defaults*, which were cloned per read because a module-level constant
		// is shared by every repository in the process. There are no defaults now, so the invariant it
		// was protecting is re-derived against a declared identity: a caller mutating what it read must
		// not be visible to a later read of a different document.
		const first = await declare({ identities: { claude: { name: "Original" } } });
		const loaded = await loadRepositoryManifest(first);
		(loaded.identities() as Record<string, unknown>).claude = { name: "tampered" };
		const second = await declare({ identities: { claude: { name: "Original" } } });
		expect((await loadRepositoryManifest(second)).identityFor("claude")?.name).toBe("Original");
	});
});

describe("no foreign identity leaks", () => {
	// Every one of these strings was found hardcoded in this repository's pipeline: omnis's areas in
	// the label list and the classifier, omnis's ADRs in the notes, and omnis's name in a docstring
	// and a CLI description. They belong to a different project and must come from the declaration.
	const FOREIGN = ["omnis", "substrate bus", "microkernel", "cell-grid", "pglite", "omnisd"];

	test("the real area taxonomy is not another project's", async () => {
		const areas = new Set(Object.keys((await loadRepositoryManifest(repoRoot)).areas()));
		for (const area of areas) expect(FOREIGN).not.toContain(area);
	});

	test("this repository's own identities name no other project", async () => {
		// The same claim, re-derived against the document rather than against a constant that used to
		// hold this repository's identity as a default.
		const serialised = JSON.stringify((await loadRepositoryManifest(repoRoot)).identities()).toLowerCase();
		for (const token of FOREIGN) expect(serialised).not.toContain(token);
	});
});

describe("configuration document discovery", () => {
	test("the canonical root document is selected", async () => {
		const dir = await declare({ identity: { owner: "acme", repo: "widget" } });
		expect(resolveManifestPath(dir, NO_ENV)).toBe(join(dir, MANIFEST_PATH));
	});

	test.each(["config.dfconfig", ".dfconfig"])("the root alias is selected: %s", async (filename) => {
		const dir = await scratch();
		await writeFile(join(dir, filename), JSON.stringify({ repo: { identity: { owner: "acme", repo: "alias" } } }));
		expect(resolveManifestPath(dir, NO_ENV)).toBe(join(dir, filename));
		expect((await loadRepositoryManifest(dir, NO_ENV)).repo()).toBe("alias");
	});

	test("a custom configuration directory is selected", async () => {
		const dir = await scratch();
		await mkdir(join(dir, "configuration"), { recursive: true });
		await writeFile(
			join(dir, "configuration", MANIFEST_PATH),
			JSON.stringify({ repo: { identity: { owner: "acme", repo: "custom" } } }),
		);
		const env = { DF_CONFIG_DIR: "configuration" };
		expect(resolveManifestPath(dir, env)).toBe(join(dir, "configuration", MANIFEST_PATH));
		expect((await loadRepositoryManifest(dir, env)).repo(env)).toBe("custom");
	});

	test("the default fallback directory is supported", async () => {
		const dir = await scratch();
		await mkdir(join(dir, ".darkfactory"), { recursive: true });
		await writeFile(
			join(dir, ".darkfactory", "config.dfconfig"),
			JSON.stringify({ repo: { identity: { owner: "acme", repo: "fallback" } } }),
		);
		expect((await loadRepositoryManifest(dir, NO_ENV)).repo()).toBe("fallback");
	});

	test("no document resolves to the default location", () => {
		const dir = scratch();
		return dir.then(async (root) => {
			expect(relative(root, resolveManifestPath(root, NO_ENV))).toBe(join(".darkfactory", MANIFEST_PATH));
		});
	});

	test("duplicate aliases in one scope are rejected", async () => {
		const dir = await scratch();
		for (const filename of [MANIFEST_PATH, "config.dfconfig", ".dfconfig"]) {
			await writeFile(join(dir, filename), JSON.stringify({ repo: {} }));
		}
		expect(() => resolveManifestPath(dir, NO_ENV)).toThrow("Ambiguous DarkFactory configuration aliases");
	});

	test("root and folder candidates are rejected together", async () => {
		const dir = await scratch();
		await writeFile(join(dir, MANIFEST_PATH), JSON.stringify({ repo: {} }));
		await mkdir(join(dir, ".darkfactory"), { recursive: true });
		await writeFile(join(dir, ".darkfactory", "config.dfconfig"), JSON.stringify({ repo: {} }));
		expect(() => resolveManifestPath(dir, NO_ENV)).toThrow("candidates exist in both the repository root");
	});

	test.each(["repo.df", "config.df"])("the legacy path is not used: %s", async (filename) => {
		const dir = await scratch();
		await writeFile(join(dir, filename), JSON.stringify({ repo: { areas: { legacy: "Legacy declaration" } } }));
		expect(resolveManifestPath(dir, NO_ENV)).toBe(join(dir, ".darkfactory", MANIFEST_PATH));
		// The defaults, and emphatically not the legacy `areas` beside them: the undeclared case is
		// now filled in, so "not the legacy declaration" is a sharper assertion than "not {}" was.
		expect((await loadRepositoryManifest(dir, NO_ENV)).areas()).toEqual(DEFAULT_AREAS);
	});

	test.each([MANIFEST_PATH, "config.dfconfig", ".dfconfig"])(
		"every supported name selects the same combined document: %s",
		async (filename) => {
			const dir = await scratch();
			const document = {
				repo: { identity: { owner: "acme", repo: filename } },
				docs: { version: 1, home: ".agents/PRD.md" },
				providers: { defaultChain: "example/model@default" },
			};
			await writeFile(join(dir, filename), JSON.stringify(document));
			expect(resolveManifestPath(dir, NO_ENV)).toBe(join(dir, filename));
			expect((await loadRepositoryManifest(dir, NO_ENV)).repo()).toBe(filename);
			expect(await loadConfigBlock(dir, "docs", NO_ENV)).toEqual(document.docs);
			expect(await loadConfigBlock(dir, "providers", NO_ENV)).toEqual(document.providers);
		},
	);

	test("an absent document is an empty block, not a failure", async () => {
		const dir = await scratch();
		expect(await loadConfigBlock(dir, "repo", NO_ENV)).toBeUndefined();
	});

	test("a block that is not an object fails closed", async () => {
		const dir = await scratch();
		await writeFile(join(dir, MANIFEST_PATH), JSON.stringify({ repo: [] }));
		await expect(loadRepositoryManifest(dir, NO_ENV)).rejects.toThrow("must contain an object");
	});
});
