import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	CHECK_SOURCES,
	DEFAULT_CHECK_SOURCE,
	relevantWorkflows,
	renderCaller,
	renderDispatchInputs,
	requiredContexts,
	WORKFLOWS,
	watchedWorkflows,
} from "../../src/install/callers.ts";
import { CONFIG_MARKER, configurationIssue } from "../../src/install/configuration-issue.ts";
import { MANIFEST_PATH, resolveManifestPath } from "../../src/install/manifest.ts";
import { declaredPythonPackageName, renderManifest } from "../../src/install/manifest-generation.ts";
import { plan, refuseSelfInstall, SelfInstall, write } from "../../src/install/plan.ts";
import { ensureSecretsPass, reconcileManifest, retarget } from "../../src/install/reinstall.ts";

/**
 * Repository root.
 *
 * Four levels up from this file, not three: this suite lives one directory deeper than
 * `test/ci/`, and a test that reads repository content has to derive the same root the pipeline
 * does or it silently asserts against the wrong tree.
 */
const repoRoot = join(import.meta.dir, "..", "..", "..", "..");

/**
 * One GitHub Actions expression, built from its body.
 *
 * Spelling the expression literally would make an assertion about a generated caller
 * indistinguishable from a template that had been interpolated.
 */
function expression(body: string): string {
	return `$\{{ ${body} }}`;
}
const workflowDir = join(repoRoot, ".github", "workflows");

const roots: string[] = [];
async function scratch(): Promise<string> {
	const dir = await mkdtemp(join(tmpdir(), "df-install-test-"));
	roots.push(dir);
	return dir;
}
afterAll(async () => {
	for (const dir of roots) await rm(dir, { recursive: true, force: true });
});

/** The `on:` mapping of a parsed workflow, whichever YAML schema wrote it. */
function triggers(document: Record<string, unknown>): Record<string, unknown> {
	const declared = (document.on ?? (document as Record<string, unknown>).true) as Record<string, unknown>;
	return declared;
}

describe("the generated callers", () => {
	test("every generated workflow is valid YAML with permissions", async () => {
		const files = await plan({ owner: "o", repo: "r", ref: "abc", root: repoRoot });
		const workflows = Object.entries(files).filter(([name]) => name.endsWith(".yml"));
		expect(workflows.length).toBeGreaterThan(0);
		for (const [name, content] of workflows) {
			const parsed = Bun.YAML.parse(content) as Record<string, unknown>;
			expect(parsed.permissions, `${name} must declare permissions`).toBeDefined();
			expect(Object.keys(parsed.jobs as object).length, `${name} must call something`).toBeGreaterThan(0);
		}
	});

	test("the reporter watches every workflow it installs", async () => {
		// The previous version of this assertion checked that a hardcoded set was a *subset* of the
		// names, which is true of any list naming real workflows and says nothing about the ones it
		// omits. It passed for as long as the reporter watched four workflows out of eleven.
		const installed = relevantWorkflows(false);
		const reporter = Bun.YAML.parse(
			renderCaller("report-failure", { pipelineRepo: "o/p", ref: "abc", installed }),
		) as Record<string, unknown>;
		const run = triggers(reporter).workflow_run as Record<string, string[] | undefined>;
		const watched = new Set(run?.workflows ?? []);
		const expected = new Set<string>(
			installed
				.filter((name) => name !== "report-failure")
				.map((name) => WORKFLOWS[name]?.name)
				.filter((name): name is string => name !== undefined),
		);
		expect([...watched].sort()).toEqual([...expected].sort());
	});

	test("the pin reaches both direct runtime checkouts", () => {
		const rendered = renderCaller("ci", { pipelineRepo: "o/p", ref: "deadbeef" });
		expect(rendered.split('ref: "deadbeef"').length - 1).toBe(2);
		expect(rendered.split('repository: "o/p"').length - 1).toBe(2);
	});

	test("submodule updating is offered only where there are submodules", async () => {
		expect(relevantWorkflows(false)).not.toContain("update-submodules");
		const withSubmodules = await scratch();
		await writeFile(join(withSubmodules, ".gitmodules"), '[submodule "x"]\n\tpath = x\n');
		expect(relevantWorkflows(true)).toContain("update-submodules");
	});

	test("an installation includes the agent", () => {
		// A repository with no agent reports on work it cannot do. This is what `mono-OdbornaPrace`
		// was: a manifest, a board, CI, releases and docs, and two issues that sat untouched because
		// no workflow on the default branch listens for them.
		const installed = relevantWorkflows(false);
		for (const name of ["agent", "open-pr", "pr-approval-automerge", "verify-pr-issue"]) {
			expect(installed, `an installation without ${name} cannot run the governed flow`).toContain(name);
		}
	});

	test("every generated caller pins a commit", async () => {
		const files = await plan({
			owner: "o",
			repo: "r",
			ref: "0123456789abcdef0123456789abcdef01234567",
			root: repoRoot,
		});
		for (const [name, content] of Object.entries(files)) {
			if (!name.endsWith(".yml")) continue;
			for (const line of content.split("\n")) {
				if (!line.includes(".yml@")) continue;
				const ref = line.split("@").at(-1)?.trim() ?? "";
				expect(ref, `${name} pins ${ref}, not a commit`).toMatch(/^[0-9a-f]{7,40}$/u);
			}
		}
	});

	test("every generated caller already passes its secrets", async () => {
		// The repair in `ensureSecretsPass` exists for callers written before this mattered, not for
		// new ones.
		const files = await plan({ owner: "o", repo: "r", ref: "abc", root: repoRoot });
		for (const [name, content] of Object.entries(files)) {
			if (!name.endsWith(".yml")) continue;
			if (name.endsWith("ci.yml") || name.endsWith("verify-pr-issue.yml")) {
				expect(content.includes("secrets: inherit"), name).toBe(false);
				continue;
			}
			expect(content.includes("secrets: inherit"), name).toBe(true);
		}
	});

	test("the agent caller can be switched off without a commit", () => {
		const caller = Bun.YAML.parse(renderCaller("agent", { pipelineRepo: "o/p", ref: "abc" })) as {
			jobs: Record<string, { with: Record<string, string> }>;
		};
		expect(caller.jobs.agent?.with["agent-enabled"]).toBe(expression("vars.AGENT_ENABLED"));
	});

	test("open-pr declares and forwards every input the called workflow declares", async () => {
		// A called workflow receives nothing from the caller's `inputs` context automatically.
		const caller = Bun.YAML.parse(renderCaller("open-pr", { pipelineRepo: "o/p", ref: "abc" })) as {
			jobs: Record<string, { with: Record<string, string> }>;
		};
		const upstreamDocument = Bun.YAML.parse(await readFile(join(workflowDir, "open-pr.yml"), "utf8")) as Record<
			string,
			unknown
		>;
		const upstream = (triggers(upstreamDocument).workflow_call as Record<string, Record<string, unknown>>)
			.inputs as Record<string, Record<string, unknown>>;
		const expected = Object.keys(upstream).filter((name) => !name.startsWith("pipeline-"));

		const declared = Object.keys(
			(triggers(caller).workflow_dispatch as Record<string, Record<string, unknown>>).inputs ?? {},
		);
		expect(declared.sort()).toEqual(expected.sort());
		for (const name of expected) {
			expect(caller.jobs["open-pr"]?.with?.[name]).toBe(expression(`inputs.${name}`));
		}
	});

	const callable = Object.keys(WORKFLOWS)
		.filter((name) => name !== "ci" && name !== "verify-pr-issue")
		.sort();

	test.each(callable)("every caller targets a callable pipeline workflow: %s", async (name) => {
		// A caller pointing at a workflow that does not accept calls fails only at run time.
		const upstreamDocument = Bun.YAML.parse(await readFile(join(workflowDir, `${name}.yml`), "utf8")) as Record<
			string,
			unknown
		>;
		expect(Object.keys(triggers(upstreamDocument)), `${name} does not accept being called`).toContain("workflow_call");

		const caller = Bun.YAML.parse(renderCaller(name, { pipelineRepo: "o/p", ref: "abc" })) as {
			jobs: Record<string, { uses: string }>;
		};
		const job = Object.values(caller.jobs ?? {})[0];
		expect(job?.uses.endsWith(`.github/workflows/${name}.yml@abc`)).toBe(true);
	});

	test.each(callable)("every forwarded value is an input the workflow declares: %s", async (name) => {
		// Passing an undeclared input is an error; omitting a required one is a failure at run time.
		const upstreamDocument = Bun.YAML.parse(await readFile(join(workflowDir, `${name}.yml`), "utf8")) as Record<
			string,
			unknown
		>;
		const upstream =
			((triggers(upstreamDocument).workflow_call as Record<string, unknown>).inputs as
				| Record<string, Record<string, unknown>>
				| undefined) ?? {};
		const caller = Bun.YAML.parse(renderCaller(name, { pipelineRepo: "o/p", ref: "abc" })) as {
			jobs: Record<string, { with?: Record<string, string> }>;
		};
		const passed = Object.values(caller.jobs ?? {})[0]?.with ?? {};

		expect(Object.keys(passed).sort(), `${name} is passed inputs it does not declare`).toEqual(
			Object.keys(passed)
				.filter((key) => key in upstream)
				.sort(),
		);
		const required = Object.entries(upstream)
			.filter(([, spec]) => spec?.required)
			.map(([key]) => key);
		for (const key of required) {
			expect(Object.keys(passed), `${name} is not given inputs it requires`).toContain(key);
		}
	});

	test("every watched name is a workflow that exists", async () => {
		// The pipeline's own reporter watches by display name too, and had one that matched nothing.
		const names = new Set<string>();
		const watchers: Array<[string, string[]]> = [];
		for (const entry of (await readdir(workflowDir)).sort()) {
			if (!entry.endsWith(".yml")) continue;
			const document = Bun.YAML.parse(await readFile(join(workflowDir, entry), "utf8")) as Record<string, unknown>;
			names.add(document.name as string);
			const run = triggers(document).workflow_run as { workflows?: string[] } | undefined;
			if (run?.workflows) watchers.push([entry, run.workflows]);
		}
		expect(watchers.length, "the pipeline must watch something").toBeGreaterThan(0);
		for (const [path, watched] of watchers) {
			expect(
				watched.filter((name) => !names.has(name)),
				`${path} watches workflows that do not exist`,
			).toEqual([]);
		}
	});
});

describe("the workflow registry", () => {
	test("required contexts follow the installed direct checks", () => {
		expect(requiredContexts(["ci"])).toEqual(["quality"]);
		expect(requiredContexts(["verify-pr-issue"])).toEqual(["verify-bound-issue"]);
		expect(requiredContexts(["ci", "verify-pr-issue"])).toEqual(["quality", "verify-bound-issue"]);
		expect(requiredContexts([])).toEqual([]);
	});

	test("the reporter never watches itself", () => {
		expect(watchedWorkflows(["report-failure", "ci"])).toEqual(["CI"]);
		expect(watchedWorkflows(["not-a-workflow"])).toEqual([]);
	});

	test("the check source table and its default agree with the callers", () => {
		expect(CHECK_SOURCES["verify-bound-issue"]).toBe("verify-pr-issue");
		expect(DEFAULT_CHECK_SOURCE).toBe("ci");
	});

	test("a dispatch default is quoted for a string and bare for a boolean", () => {
		// A quoted boolean default is read back as a string, so a branch called `true` or `2.0` would
		// be something other than a branch.
		const block = renderDispatchInputs(WORKFLOWS["open-pr"] as never, "trunk");
		expect(block).toContain("        default: 'trunk'");
		expect(block).toContain("        default: true");
		expect(block).not.toContain("default: 'true'");
	});

	test("a workflow taking no inputs renders no input block", () => {
		expect(renderDispatchInputs(WORKFLOWS.ci as never, "main")).toBe("");
	});

	test("a description containing a quote survives the round trip", () => {
		const block = renderDispatchInputs(
			{
				name: "x",
				on: "workflow_dispatch:",
				permissions: "contents: read",
				inputs: { a: { description: "it's here", type: "string", required: false } },
			},
			"main",
		);
		// YAML doubles the quote inside a single-quoted scalar; a backslash escape produces a
		// document no parser accepts, which would take the whole caller down over a description.
		expect(block).toContain("description: 'it''s here'");
		// The point of the escaping: the block has to remain parseable YAML, not merely contain the
		// right characters.
		const parsed = Bun.YAML.parse(`on:\n  workflow_dispatch:\n${block}`) as {
			on: { workflow_dispatch: { inputs: Record<string, { description: string }> } };
		};
		expect(parsed.on.workflow_dispatch.inputs.a?.description).toBe("it's here");
	});

	test("an unknown workflow is refused rather than rendered empty", () => {
		expect(() => renderCaller("nope", { pipelineRepo: "o/p", ref: "abc" })).toThrow(
			"no workflow specification for nope",
		);
	});
});

describe("the generated configuration document", () => {
	test("areas are offered rather than asserted", async () => {
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root: repoRoot })) as {
			repo: { areas: Record<string, unknown> };
		};
		expect(config.repo.areas.$comment, "the starter set must say it is a starting point").toBeDefined();
	});

	test("makes the licence a visible choice", async () => {
		// An absent licence block reads as an oversight; NONE reads as a decision.
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root: repoRoot }));
		expect(Object.keys(config).sort()).toEqual(["docs", "providers", "repo"]);
		expect(config.repo.license.spdx).toBe("NONE");
		expect(config.repo.license.$comment, "it must say what NONE means").toBeDefined();
		expect(config.docs.home).toBe(".agents/PRD.md");
		expect(config.providers).toEqual({});
	});

	test("requires the stable direct contexts", async () => {
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root: repoRoot }));
		expect(config.repo.required_checks).toEqual(["quality", "verify-bound-issue"]);
	});

	test("a tooling-only pyproject is declared as packaging nothing", async () => {
		// The failure that took three repositories down is pre-empted at install time.
		const root = await scratch();
		await writeFile(join(root, "pyproject.toml"), "[tool.black]\nline-length = 100\n");
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment.release.python.enabled).toBe(false);
	});

	test("a real package is left to release normally", async () => {
		// Declaring nothing is only right when there is nothing to package.
		const root = await scratch();
		await writeFile(join(root, "pyproject.toml"), '[project]\nname = "thing"\nversion = "1.0.0"\n');
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment).toBeUndefined();
	});

	test("a poetry name is a package identity", async () => {
		const root = await scratch();
		await writeFile(join(root, "pyproject.toml"), '[tool.poetry]\nname = "poetry-thing"\n');
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment).toBeUndefined();
	});

	test("a name under an unrelated table is not a package identity", async () => {
		// `[tool.foo] name` is somebody else's setting; reading it as identity would enable a
		// release for a repository that has nothing to publish.
		const root = await scratch();
		await writeFile(join(root, "pyproject.toml"), '[tool.foo]\nname = "not-a-package"\n');
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment.release.python.enabled).toBe(false);
	});

	test("a setup.cfg carries no identity, because its contents are not read", async () => {
		const root = await scratch();
		await writeFile(join(root, "setup.cfg"), "[metadata]\nname = cfg\n");
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment.release.python.enabled).toBe(false);
	});

	test("a name declared in the configuration document counts as an identity", async () => {
		// This repository declares its Python package that way, and reading the pyproject.toml alone
		// would disable its own release.
		const root = await scratch();
		await writeFile(join(root, "pyproject.toml"), "[tool.pytest.ini_options]\nminversion = '7.0'\n");
		await writeFile(
			join(root, MANIFEST_PATH),
			JSON.stringify({ repo: { environment: { packages: [{ path: ".", ecosystem: "python", name: "declared" }] } } }),
		);
		const config = JSON.parse(await renderManifest({ owner: "o", repo: "r", ref: "abc", root }));
		expect(config.repo.environment).toBeUndefined();
	});

	test.each([
		["a pyproject project name", '[project]\nname = "a"\n', "a"],
		["a pyproject poetry name", '[tool.poetry]\nname = "p"\n', "p"],
		["a single-quoted name", "[project]\nname = 'a'\n", "a"],
		["a name with a trailing comment", '[project]\nname = "a"  # the name\n', "a"],
		["a commented-out name is not a name", '# name = "no"\n[project]\nname="yes"\n', "yes"],
		["project wins over poetry", '[project]\nname = "a"\n[tool.poetry]\nname = "b"\n', "a"],
	])("%s", (_label, source, expected) => {
		expect(declaredPythonPackageName(source)).toBe(expected);
	});

	test.each([
		["no name at all", "[tool.black]\nline-length = 100\n"],
		["an empty document", ""],
		["a dependency table", '[project]\nversion = "1.0"\n'],
	])("declares no package identity: %s", (_label, source) => {
		expect(declaredPythonPackageName(source)).toBeUndefined();
	});
});

describe("writing never overwrites what is already there", () => {
	test("a customised caller survives a reinstall", async () => {
		// A reinstall must not discard a caller someone deliberately customised.
		const root = await scratch();
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: mine\n");
		const files = await plan({ owner: "o", repo: "r", ref: "abc", root });
		await write(files, root);
		expect(await readFile(join(root, ".github", "workflows", "ci.yml"), "utf8")).toBe("name: mine\n");
		expect(await readFile(join(root, MANIFEST_PATH), "utf8")).toBeTruthy();
	});

	test.each(["config.dfconfig", ".dfconfig"])(
		"an existing root configuration alias is not duplicated: %s",
		async (filename) => {
			// The accepted alias remains the single selected document during installation.
			const root = await scratch();
			await writeFile(join(root, filename), JSON.stringify({ repo: { identity: { owner: "chosen" } } }));
			const files = await plan({ owner: "o", repo: "r", ref: "abc", root });
			await write(files, root);
			expect(await Bun.file(join(root, MANIFEST_PATH)).exists()).toBe(false);
			const alias = JSON.parse(await readFile(join(root, filename), "utf8"));
			expect(alias.repo.identity.owner).toBe("chosen");
		},
	);

	test("the legacy manifest path is not selected", async () => {
		const root = await scratch();
		await writeFile(join(root, "repo.df"), JSON.stringify({ repo: { identity: { owner: "legacy" } } }));
		const files = await plan({ owner: "o", repo: "r", ref: "abc", root });
		await write(files, root);
		const written = JSON.parse(await readFile(join(root, MANIFEST_PATH), "utf8"));
		expect(written.repo.identity.owner).toBe("o");
	});

	test("an existing custom folder configuration is not duplicated", async () => {
		// A configured fallback document remains authoritative during installation.
		const root = await scratch();
		await mkdir(join(root, "configuration"), { recursive: true });
		await writeFile(
			join(root, "configuration", "repo.dfconfig"),
			JSON.stringify({ repo: { identity: { owner: "chosen" } } }),
		);
		process.env.DF_CONFIG_DIR = "configuration";
		try {
			const files = await plan({ owner: "o", repo: "r", ref: "abc", root });
			await write(files, root);
			expect(await Bun.file(join(root, MANIFEST_PATH)).exists()).toBe(false);
			const alias = JSON.parse(await readFile(join(root, "configuration", "repo.dfconfig"), "utf8"));
			expect(alias.repo.identity.owner).toBe("chosen");
		} finally {
			delete process.env.DF_CONFIG_DIR;
		}
	});

	test("the manifest path resolves to the default location when none exists", () => {
		expect(resolveManifestPath(repoRoot, {})).toBe(join(repoRoot, MANIFEST_PATH));
	});
});

describe("the configuration issue", () => {
	test("the marker makes a reinstall find it rather than duplicate it", () => {
		// Identity lives in the body so a retitled issue is still recognised.
		expect(configurationIssue("o/r", "o/p")).toContain(CONFIG_MARKER);
	});

	test("it asks for exactly what cannot be derived", () => {
		// Areas, credentials, publishing and lock-down: the four human decisions.
		const body = configurationIssue("o/r", "o/p");
		for (const topic of ["Areas", "GH_PROJECT_TOKEN", "Pages", "Branch protection"]) {
			expect(body, `the issue must cover ${topic}`).toContain(topic);
		}
	});

	test("submodules are mentioned only when there are some", () => {
		// A repository without submodules should not be told to check its .gitmodules.
		expect(configurationIssue("o/r", "o/p")).not.toContain("update-submodules");
		expect(configurationIssue("o/r", "o/p", true)).toContain("update-submodules");
	});

	test("it explains why protection is left off", () => {
		// Turning it on too early blocks every merge on a context nothing reports.
		const body = configurationIssue("o/r", "o/p");
		expect(body).toContain("green");
		expect(body).toContain("blocks every merge");
	});

	test("it names the repository it is filed against", () => {
		expect(configurationIssue("o/r", "o/p")).toContain("r adopts an update");
		expect(configurationIssue("o/sub/r", "o/p")).toContain("sub/r adopts an update");
	});
});

describe("the pipeline is not its own consumer", () => {
	test("installing into the pipeline is refused", async () => {
		// Both generated values are wrong for the pipeline repository, in different ways.
		await expect(
			plan({ owner: "marius-patrik", repo: "DarkFactory", ref: "abc", root: repoRoot }),
		).rejects.toBeInstanceOf(SelfInstall);
	});

	test("the comparison ignores case", () => {
		// Repository names are case-insensitive on GitHub, and a refusal must be too.
		expect(() => refuseSelfInstall("MARIUS-PATRIK", "darkfactory", "marius-patrik/DarkFactory")).toThrow(SelfInstall);
	});

	test("a real consumer is unaffected", async () => {
		const files = await plan({ owner: "marius-patrik", repo: "ChessWithQuests", ref: "abc", root: repoRoot });
		expect(Object.keys(files).length).toBeGreaterThan(0);
	});

	test("a different pipeline can install into DarkFactory", async () => {
		// The name is not what is refused; being one's own upstream is.
		const files = await plan({
			owner: "marius-patrik",
			repo: "DarkFactory",
			ref: "abc",
			root: repoRoot,
			pipelineRepo: "someone/Other",
		});
		expect(Object.keys(files).length).toBeGreaterThan(0);
	});

	test("a refusal is an Error, so a caller need not know the class", () => {
		expect(new SelfInstall("x")).toBeInstanceOf(Error);
	});
});

describe("reinstalling adopts the update", () => {
	async function installed(ref = "aaaaaaa"): Promise<string> {
		const root = await scratch();
		const files = await plan({ owner: "o", repo: "r", ref, root });
		await write(files, root);
		return root;
	}

	test("the pin moves", async () => {
		// Adopting a pipeline release is the one thing a reinstall most needs to do.
		const root = await installed();
		expect(await retarget(root, "bbbbbbb")).not.toEqual([]);
		const content = await readFile(join(root, ".github", "workflows", "ci.yml"), "utf8");
		expect(content).not.toContain("aaaaaaa");
		expect(content.split("bbbbbbb").length - 1).toBe(2);
	});

	test("nothing else in a customised caller is touched", async () => {
		// The rule that made reinstalling safe must survive the change that made it useful.
		const root = await installed();
		const path = join(root, ".github", "workflows", "ci.yml");
		const content = await readFile(path, "utf8");
		const customised = content.replace("permissions:", "# a local edit\npermissions:");
		await writeFile(path, customised);

		await retarget(root, "bbbbbbb");
		const after = await readFile(path, "utf8");
		expect(after).toContain("# a local edit");
		expect(after).toBe(customised.replaceAll("aaaaaaa", "bbbbbbb"));
	});

	test("a caller pinned to a branch is repinned to the commit", async () => {
		// A branch is not a pin: it follows whatever lands there, so the bump diff never exists.
		// Several callers were generated this way, and a repin that matched only commit SHAs left
		// exactly those alone - the case that most needed fixing.
		const root = await installed();
		const path = join(root, ".github", "workflows", "ci.yml");
		await writeFile(path, (await readFile(path, "utf8")).replace("ci.yml@aaaaaaa", "ci.yml@darkfactory"));

		await retarget(root, "bbbbbbb");
		const after = await readFile(path, "utf8");
		expect(after).not.toContain("@darkfactory");
		expect(after.split("bbbbbbb").length - 1).toBe(2);
	});

	test("an unquoted pipeline ref is repinned and stays unquoted", async () => {
		// A hand-written caller need not quote its inputs, and omnis's did not. Its `pipeline-ref:`
		// therefore kept a commit sixteen versions older than the `uses:` line above it, and the
		// pipeline's own drift test failed on the repository the repin had just "updated" - which is
		// worse than not repinning at all, because it looks done.
		const root = await scratch();
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		const path = join(root, ".github", "workflows", "ci.yml");
		await writeFile(
			path,
			"jobs:\n  ci:\n    uses: o/p/.github/workflows/ci.yml@aaaaaaa\n    with:\n      pipeline-ref: aaaaaaa\n",
		);

		await retarget(root, "bbbbbbb");
		const after = await readFile(path, "utf8");
		expect(after).not.toContain("aaaaaaa");
		expect(after.split("bbbbbbb").length - 1).toBe(2);
		expect(after).toContain("pipeline-ref: bbbbbbb");
	});

	test("a quoted pipeline ref keeps its quotes", async () => {
		// Rewriting the style as well as the value would put churn in every consumer's diff.
		const root = await scratch();
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		const path = join(root, ".github", "workflows", "ci.yml");
		await writeFile(path, '    uses: o/p/.github/workflows/ci.yml@aaaaaaa\n    pipeline-ref: "aaaaaaa"\n');
		await retarget(root, "bbbbbbb");
		expect(await readFile(path, "utf8")).toContain('pipeline-ref: "bbbbbbb"');
	});

	test("an empty ref changes nothing", async () => {
		const root = await installed();
		expect(await retarget(root, "")).toEqual([]);
	});

	test("a missing workflow directory is not an error", async () => {
		expect(await retarget(await scratch(), "bbbbbbb")).toEqual([]);
	});

	test("a missing manifest key is filled in and a choice is not overwritten", async () => {
		// An installation written before `required_checks` existed protects against nothing.
		const root = await installed();
		const path = join(root, MANIFEST_PATH);
		const config = JSON.parse(await readFile(path, "utf8"));
		delete config.repo.required_checks;
		config.repo.identity.display_name = "Chosen By Hand";
		await writeFile(path, JSON.stringify(config));

		const planned = await renderManifest({ owner: "o", repo: "r", ref: "bbbbbbb", root });
		expect(await reconcileManifest(root, "bbbbbbb", planned)).toBe(true);

		const after = JSON.parse(await readFile(path, "utf8"));
		expect(after.repo.required_checks, "the missing key is filled in").toBeTruthy();
		expect(after.repo.identity.display_name, "choices are not overwritten").toBe("Chosen By Hand");
		expect(after.repo.upstream.ref, "the pin is what a reinstall exists to move").toBe("bbbbbbb");
		expect(after.docs, "other blocks are preserved").toBeTruthy();
		expect(after.providers).toEqual({});
	});

	test("an up-to-date manifest is left alone", async () => {
		// A reinstall that changes nothing must produce no diff to review.
		const root = await installed("bbbbbbb");
		const planned = await renderManifest({ owner: "o", repo: "r", ref: "bbbbbbb", root });
		expect(await reconcileManifest(root, "bbbbbbb", planned)).toBe(false);
	});

	test("a manifest with no repo block fails closed", async () => {
		const root = await scratch();
		await writeFile(join(root, MANIFEST_PATH), JSON.stringify({ docs: {} }));
		await expect(reconcileManifest(root, "abc", '{"repo":{}}')).rejects.toThrow("missing the repo block");
	});

	test("a document that is not an object fails closed", async () => {
		const root = await scratch();
		await writeFile(join(root, MANIFEST_PATH), "[1, 2]");
		await expect(reconcileManifest(root, "abc", '{"repo":{}}')).rejects.toThrow("must contain an object");
	});

	test("no manifest means nothing to reconcile", async () => {
		expect(await reconcileManifest(await scratch(), "abc", '{"repo":{}}')).toBe(false);
	});
});

describe("a caller must pass its secrets", () => {
	// A called workflow sees none of its caller's secrets unless they are passed, which is why
	// formatting commits were once pushed with GITHUB_TOKEN and checked nothing.
	async function caller(body: string): Promise<{ root: string; path: string }> {
		const root = await scratch();
		await mkdir(join(root, ".github", "workflows"), { recursive: true });
		const path = join(root, ".github", "workflows", "agent.yml");
		await writeFile(path, body);
		return { root, path };
	}

	test("a caller passing nothing is repaired, inside the job", async () => {
		const { root, path } = await caller(
			"jobs:\n  run:\n    uses: o/p/.github/workflows/agent.yml@aaaaaaa\n    with:\n      pipeline-repo: o/p\n      pipeline-ref: aaaaaaa\n",
		);
		expect(await ensureSecretsPass(root)).toEqual([".github/workflows/agent.yml"]);
		const after = await readFile(path, "utf8");
		expect(after).toContain("    secrets: inherit\n");
		expect(after.indexOf("secrets: inherit")).toBeGreaterThan(after.indexOf("pipeline-ref:"));
	});

	test("an explicit secrets list gains the App key", async () => {
		// The App key is not a preference but the difference between a workflow that can mint an
		// installation token and one that silently falls back to a person's quota.
		const { root, path } = await caller(
			`jobs:\n  run:\n    uses: o/p/.github/workflows/agent.yml@aaaaaaa\n    with:\n      pipeline-ref: aaaaaaa\n    secrets:\n      GH_PROJECT_TOKEN: ${expression("secrets.GH_PROJECT_TOKEN")}\n`,
		);
		expect(await ensureSecretsPass(root)).toEqual([".github/workflows/agent.yml"]);
		expect(await readFile(path, "utf8")).toContain(
			`DARKFACTORY_APP_PRIVATE_KEY: ${expression("secrets.DARKFACTORY_APP_PRIVATE_KEY")}`,
		);
	});

	test("a caller that already passes is untouched", async () => {
		// Repeating the line would be churn, and a caller already carrying the App key is untouched.
		const body = `jobs:\n  run:\n    uses: o/p/.github/workflows/agent.yml@aaaaaaa\n    with:\n      pipeline-ref: aaaaaaa\n    secrets:\n      DARKFACTORY_APP_PRIVATE_KEY: ${expression("secrets.DARKFACTORY_APP_PRIVATE_KEY")}\n      GH_PROJECT_TOKEN: ${expression("secrets.GH_PROJECT_TOKEN")}\n`;
		const { root, path } = await caller(body);
		expect(await ensureSecretsPass(root)).toEqual([]);
		expect(await readFile(path, "utf8")).toBe(body);
	});

	test("a file that is not a caller is ignored", async () => {
		// A repository's own workflow is not the pipeline's to edit.
		const { root } = await caller("jobs:\n  build:\n    runs-on: ubuntu-latest\n");
		expect(await ensureSecretsPass(root)).toEqual([]);
	});

	test("a missing workflow directory is not an error", async () => {
		expect(await ensureSecretsPass(await scratch())).toEqual([]);
	});
});
