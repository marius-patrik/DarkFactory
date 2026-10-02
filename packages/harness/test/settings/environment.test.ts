import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { configure, type EnvironmentData } from "../../src/env/environment.ts";

/** The repository root, derived from this file rather than from the working directory. */
const REPO_ROOT = join(import.meta.dir, "..", "..", "..", "..");

/** Writes one file into a scratch repository, creating the parent directories it needs. */
async function write(root: string, relative: string, content: string): Promise<void> {
	const path = join(root, relative);
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, content, "utf8");
}

/** Writes the canonical root `repo.dfconfig` carrying a repository environment block. */
async function declare(root: string, block: Record<string, unknown>): Promise<void> {
	await write(root, "repo.dfconfig", JSON.stringify({ repo: { environment: block } }));
}

/**
 * Builds a scratch repository, hands it to the body, and removes it afterwards.
 *
 * Each case gets its own tree because detection is a filesystem walk: a case that asserted against
 * a shared tree would be asserting against whatever the previous case left behind.
 */
async function inRepository(
	build: (root: string) => Promise<void>,
	body: (root: string) => void | Promise<void>,
): Promise<void> {
	const root = await mkdtemp(join(tmpdir(), "df-environment-"));
	try {
		await build(root);
		await body(root);
	} finally {
		await rm(root, { recursive: true, force: true });
	}
}

/** A repository that is a Bun workspace and a Cargo workspace at once. */
async function buildPolyglot(root: string): Promise<void> {
	await write(root, "package.json", JSON.stringify({ name: "acme", version: "1.4.0", workspaces: ["packages/*"] }));
	await write(root, "bun.lock", "");
	await write(root, "packages/web/package.json", JSON.stringify({ name: "@acme/web", version: "1.4.0" }));
	await write(root, "packages/cli/package.json", JSON.stringify({ name: "@acme/cli", version: "1.3.9" }));
	await write(root, "Cargo.toml", '[workspace]\nmembers = ["crates/*"]\n');
	await write(root, "Cargo.lock", "");
	await write(root, "crates/core/Cargo.toml", '[package]\nname = "acme-core"\nversion = "1.4.0"\n');
}

/** The package paths a configured environment found, in discovery order. */
function pathsOf(environment: { packages: { path: string }[] }): string[] {
	return environment.packages.map((entry) => entry.path);
}

/**
 * The distinct package paths, for the claims about which directories were and were not found.
 *
 * Distinct because the root can hold several manifests and is then several packages: the claim is
 * which directories were reached, not how many manifests each one carries.
 */
function distinctPathsOf(environment: { packages: { path: string }[] }): string[] {
	return [...new Set(pathsOf(environment))].sort();
}

describe("detection", () => {
	it("finds a single Python repository", async () => {
		await inRepository(
			async (root) => write(root, "pyproject.toml", '[project]\nname = "thing"\nversion = "2.1.0"\n'),
			(root) => {
				const environment = configure(root);
				expect([...environment.ecosystems]).toEqual(["python"]);
				expect(environment.isMonorepo).toBe(false);
				expect(environment.packages[0]?.name).toBe("thing");
				expect(environment.packages[0]?.version).toBe("2.1.0");
			},
		);
	});

	it("finds nothing in a repository with no manifests at all", async () => {
		await inRepository(
			async (root) => write(root, "README.md", "# nothing to build"),
			(root) => {
				const environment = configure(root);
				expect([...environment.ecosystems]).toEqual([]);
				expect(environment.packages).toEqual([]);
				expect(environment.isMonorepo).toBe(false);
			},
		);
	});

	it("finds every ecosystem in a polyglot repository", async () => {
		await inRepository(buildPolyglot, (root) => {
			const environment = configure(root);
			expect([...environment.ecosystems].sort()).toEqual(["node", "rust"]);
			expect(environment.has("rust")).toBe(true);
			expect(environment.has("node")).toBe(true);
			expect(environment.has("go")).toBe(false);
		});
	});

	it("treats workspace members as making it a monorepo", async () => {
		await inRepository(buildPolyglot, (root) => {
			const environment = configure(root);
			expect(environment.isMonorepo).toBe(true);
			expect(distinctPathsOf(environment)).toEqual([".", "crates/core", "packages/cli", "packages/web"]);
		});
	});

	it("flags workspace roots with their globs", async () => {
		await inRepository(buildPolyglot, (root) => {
			const roots: Record<string, string[]> = {};
			for (const entry of configure(root).packages) {
				if (entry.isWorkspaceRoot) roots[entry.ecosystem] = entry.members;
			}
			expect(roots).toEqual({ node: ["packages/*"], rust: ["crates/*"] });
		});
	});

	it("identifies Go modules by their module path", async () => {
		await inRepository(
			async (root) => write(root, "go.mod", "module github.com/acme/tool\n\ngo 1.22\n"),
			(root) => {
				const environment = configure(root);
				expect(environment.packages[0]?.ecosystem).toBe("go");
				expect(environment.packages[0]?.name).toBe("github.com/acme/tool");
			},
		);
	});

	it("does not scan build output directories", async () => {
		await inRepository(
			async (root) => {
				await write(root, "package.json", JSON.stringify({ name: "app", version: "1.0.0" }));
				await write(root, "node_modules/dep/package.json", JSON.stringify({ name: "dep" }));
				await write(root, "target/pkg/Cargo.toml", '[package]\nname = "junk"\nversion = "0.0.0"\n');
			},
			(root) => {
				expect(configure(root).packages.map((entry) => entry.name)).toEqual(["app"]);
			},
		);
	});

	it("skips a Cargo.toml that declares nothing", async () => {
		await inRepository(
			async (root) => write(root, "Cargo.toml", '[dependencies]\nserde = "1"\n'),
			(root) => {
				expect(configure(root).packages).toEqual([]);
			},
		);
	});
});

describe("package managers", () => {
	it("identifies Bun from its lockfile", async () => {
		await inRepository(buildPolyglot, (root) => {
			expect(configure(root).packageManager("node")).toBe("bun");
		});
	});

	it("does not let a lockfile leak across ecosystems", async () => {
		// The Cargo workspace root sits beside bun.lock; it is still Cargo.
		await inRepository(buildPolyglot, (root) => {
			expect(configure(root).packageManager("rust")).toBe("cargo");
		});
	});

	it.each([
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
	])("recognises %s as %s", async (lockfile, expected) => {
		await inRepository(
			async (root) => {
				await write(root, "package.json", JSON.stringify({ name: "app", version: "1.0.0" }));
				await write(root, lockfile, "");
			},
			(root) => {
				expect(configure(root).packageManager("node")).toBe(expected);
			},
		);
	});

	it("recognises uv for Python", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n');
				await write(root, "uv.lock", "");
			},
			(root) => {
				expect(configure(root).packageManager("python")).toBe("uv");
			},
		);
	});

	it("claims nothing when no lockfile identifies a manager", async () => {
		await inRepository(
			async (root) => write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n'),
			(root) => {
				expect(configure(root).packageManager("python")).toBeNull();
			},
		);
	});

	it("lets a declaration override the lockfile", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, { package_managers: { node: "npm" } });
			},
			(root) => {
				expect(configure(root).packageManager("node")).toBe("npm");
			},
		);
	});
});

describe("pnpm workspaces", () => {
	it("reads members from pnpm-workspace.yaml", async () => {
		await inRepository(
			async (root) => {
				await write(root, "package.json", JSON.stringify({ name: "root", version: "1.0.0" }));
				await write(root, "pnpm-workspace.yaml", "packages:\n  - 'apps/*'\n  - 'libs/*'\n");
				await write(root, "pnpm-lock.yaml", "");
			},
			(root) => {
				const environment = configure(root);
				const root0 = environment.packages.find((entry) => entry.path === ".");
				expect(root0?.isWorkspaceRoot).toBe(true);
				expect(root0?.members).toEqual(["apps/*", "libs/*"]);
				expect(environment.isMonorepo).toBe(true);
			},
		);
	});
});

describe("declared configuration", () => {
	it("drops an ignored path", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, { ignore: ["packages/cli"] });
			},
			(root) => {
				const paths = distinctPathsOf(configure(root));
				expect(paths).not.toContain("packages/cli");
				expect(paths).toContain("packages/web");
			},
		);
	});

	it("honours glob patterns when ignoring", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, { ignore: ["packages/*"] });
			},
			(root) => {
				expect(distinctPathsOf(configure(root)).some((path) => path.startsWith("packages/"))).toBe(false);
			},
		);
	});

	it("adds a declared package", async () => {
		await inRepository(
			async (root) => {
				await write(root, "README.md", "no manifests here");
				await declare(root, {
					packages: [{ path: "weird", ecosystem: "make", manifest: "weird/Makefile", name: "weird" }],
				});
			},
			(root) => {
				expect(configure(root).packages.map((entry) => [entry.path, entry.ecosystem, entry.name])).toEqual([
					["weird", "make", "weird"],
				]);
			},
		);
	});

	it("lets a declaration correct a detected package", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", "[tool.black]\nline-length = 100\n");
				await declare(root, {
					packages: [{ path: ".", ecosystem: "python", name: "darkfactory", version: "0.1.0" }],
				});
			},
			(root) => {
				const environment = configure(root);
				expect(environment.packages[0]?.name).toBe("darkfactory");
				expect(environment.packages[0]?.version).toBe("0.1.0");
			},
		);
	});

	it("leaves detection untouched when nothing is declared", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, {});
			},
			(root) => {
				// Five, not four: the root holds both a node and a rust manifest, so it is two packages.
				expect(configure(root).packages).toHaveLength(5);
			},
		);
	});
});

describe("serialisation", () => {
	it("survives the JSON round trip a workflow step makes", async () => {
		await inRepository(buildPolyglot, (root) => {
			const payload: EnvironmentData = configure(root).toJSON();
			expect(JSON.parse(JSON.stringify(payload))).toEqual(payload);
			expect(payload.is_monorepo).toBe(true);
			expect(payload.ecosystems).toEqual(["node", "rust"]);
		});
	});
});

describe("plans", () => {
	it("gives each ecosystem its own test command", async () => {
		await inRepository(buildPolyglot, (root) => {
			const plan = configure(root).testPlan();
			expect(plan.node?.command).toBe("bun test");
			expect(plan.rust?.command).toBe("cargo test --all-features --workspace");
		});
	});

	it("covers every ecosystem in a polyglot plan", async () => {
		await inRepository(buildPolyglot, (root) => {
			const environment = configure(root);
			expect(Object.keys(environment.testPlan()).sort()).toEqual(["node", "rust"]);
			expect(Object.keys(environment.formatPlan()).sort()).toEqual(["node", "rust"]);
		});
	});

	it("lets the package manager pick the command", async () => {
		await inRepository(
			async (root) => {
				await write(root, "package.json", JSON.stringify({ name: "a", version: "1.0.0" }));
				await write(root, "pnpm-lock.yaml", "");
			},
			(root) => {
				expect(configure(root).testPlan().node?.command).toBe("pnpm test");
			},
		);
	});

	it("gives Python a version matrix and the others none", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n');
				await write(root, "Cargo.toml", '[package]\nname = "y"\nversion = "1.0.0"\n');
			},
			(root) => {
				const plan = configure(root).testPlan();
				expect(plan.python?.versions).toEqual(["3.10", "3.11", "3.12", "3.13"]);
				expect(plan.rust?.versions).toEqual([]);
			},
		);
	});

	it("keeps documentation configuration in the combined docs block, not the repository block", async () => {
		const document = JSON.parse(await readFile(join(REPO_ROOT, "repo.dfconfig"), "utf8")) as {
			repo: { environment?: Record<string, unknown> };
			docs: { version: number; home: string; api?: unknown };
			providers: { defaultChain?: unknown };
		};
		expect(document.repo.environment).not.toHaveProperty("documentation");
		expect(document.docs.version).toBe(1);
		expect(document.docs.home).toBe(".agents/PRD.md");
		expect(document.docs).not.toHaveProperty("api");
		// The repository config no longer pins a provider chain. The chain is a ceiling the router
		// receives as an argument, and `df ask` routes against the live catalogue, so a chain written
		// into repo.dfconfig would hide every model published after it. router-preferences.test.ts
		// covers that the declared chain is still honoured as a ceiling when one is passed.
		expect(document.providers).not.toHaveProperty("defaultChain");
	});

	it("lets a declared command override the default, leaving other ecosystems alone", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, { testing: { rust: { command: "cargo nextest run" } } });
			},
			(root) => {
				const plan = configure(root).testPlan();
				expect(plan.rust?.command).toBe("cargo nextest run");
				expect(plan.node?.command).toBe("bun test");
			},
		);
	});

	it("lets a declared matrix override the default", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n');
				await declare(root, { testing: { python: { versions: ["3.12"] } } });
			},
			(root) => {
				expect(configure(root).testPlan().python?.versions).toEqual(["3.12"]);
			},
		);
	});

	it("lets an ecosystem be disabled", async () => {
		await inRepository(
			async (root) => {
				await buildPolyglot(root);
				await declare(root, { testing: { rust: { enabled: false } } });
			},
			(root) => {
				expect(Object.keys(configure(root).testPlan())).toEqual(["node"]);
			},
		);
	});

	it("lets an undetectable suite be declared", async () => {
		await inRepository(
			async (root) => {
				await write(root, "README.md", "nothing detectable");
				await declare(root, { testing: { e2e: { command: "make e2e" } } });
			},
			(root) => {
				expect(configure(root).testPlan().e2e?.command).toBe("make e2e");
			},
		);
	});

	it("lets a biome marker outrank the package manager default", async () => {
		await inRepository(
			async (root) => {
				await write(root, "package.json", JSON.stringify({ name: "a", version: "1.0.0" }));
				await write(root, "bun.lock", "");
				await write(root, "biome.json", "{}");
			},
			(root) => {
				expect(configure(root).formatPlan().node?.command).toContain("biome");
			},
		);
	});

	it("lets a ruff marker outrank black", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n');
				await write(root, "ruff.toml", "");
			},
			(root) => {
				expect(configure(root).formatPlan().python?.command).toBe("ruff format .");
			},
		);
	});

	it("keeps a marker out of the test plan", async () => {
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "x"\nversion = "1.0.0"\n');
				await write(root, "ruff.toml", "");
			},
			(root) => {
				expect(configure(root).testPlan().python?.command).toBe("pytest");
			},
		);
	});

	it("keeps every plan in the serialised payload", async () => {
		await inRepository(buildPolyglot, (root) => {
			const payload = configure(root).toJSON();
			expect(Object.keys(payload)).toEqual(expect.arrayContaining(["test_plan", "format_plan", "build_plan"]));
		});
	});
});

describe("domains", () => {
	it("maps every code ecosystem to the code domain", async () => {
		// Node and Rust differ in toolchain but are both code.
		await inRepository(buildPolyglot, (root) => {
			const environment = configure(root);
			expect([...environment.domains]).toEqual(["code"]);
			expect(environment.isMultiDomain).toBe(false);
		});
	});

	it("still gives a domain to an undeclared ecosystem", async () => {
		// A repository may invent an ecosystem; planning it must not crash for want of a domain.
		await inRepository(
			async (root) => {
				await declare(root, { packages: [{ path: "weird", ecosystem: "make", name: "weird" }] });
			},
			(root) => {
				const environment = configure(root);
				expect(environment.packages[0]?.domain).toBe("code");
				expect([...environment.domains]).toEqual(["code"]);
			},
		);
	});

	it("reports a thesis beside its software as multi-domain", async () => {
		// The case the layer exists for: a paper and the code it documents, in one repository.
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n');
				await declare(root, {
					packages: [
						{ path: ".", ecosystem: "python", name: "engine", version: "0.1.0" },
						{ path: "paper", ecosystem: "typst", name: "thesis" },
					],
				});
			},
			(root) => {
				const environment = configure(root);
				expect([...environment.domains].sort()).toEqual(["code", "paper"]);
				expect(environment.isMultiDomain).toBe(true);
				expect(environment.packagesIn("paper").map((entry) => entry.path)).toEqual(["paper"]);
				expect(environment.packagesIn("code").map((entry) => entry.path)).toEqual(["."]);
				expect(environment.hasDomain("paper")).toBe(true);
				expect(environment.hasDomain("math")).toBe(false);
			},
		);
	});

	it("reports the domain as plain data", async () => {
		// Workflows branch on the domain, so it must survive the JSON round trip.
		await inRepository(
			async (root) => write(root, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n'),
			(root) => {
				const payload = configure(root).toJSON();
				expect(payload.domains).toEqual(["code"]);
				expect(payload.is_multi_domain).toBe(false);
				expect(payload.packages[0]?.domain).toBe("code");
			},
		);
	});
});

describe("the paper domain", () => {
	it("detects typst and lands it in the paper domain", async () => {
		// `typst.toml` is to a paper what `Cargo.toml` is to a crate.
		await inRepository(
			async (root) => write(root, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n'),
			(root) => {
				const environment = configure(root);
				expect([...environment.ecosystems]).toEqual(["typst"]);
				expect([...environment.domains]).toEqual(["paper"]);
				expect(environment.packages[0]?.name).toBe("thesis");
				expect(environment.packages[0]?.version).toBe("1.0.0");
			},
		);
	});

	it("detects .latexmkrc even though it names nothing", async () => {
		// A latexmk configuration carries no name or version; its presence is the whole signal.
		await inRepository(
			async (root) => write(root, ".latexmkrc", "$pdf_mode = 1;\n"),
			(root) => {
				const environment = configure(root);
				expect([...environment.ecosystems]).toEqual(["latex"]);
				expect([...environment.domains]).toEqual(["paper"]);
				expect(environment.packages[0]?.name).toBeNull();
			},
		);
	});

	it("makes typesetting both the test and the build", async () => {
		// There is no separate release build of a document.
		await inRepository(
			async (root) => write(root, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n'),
			(root) => {
				const environment = configure(root);
				expect(environment.testPlan().typst?.command).toBe("typst compile main.typ out/paper.pdf");
				expect(environment.buildPlan().typst?.command).toBe("typst compile main.typ out/paper.pdf");
				expect(environment.buildPlan().typst?.artifacts).toEqual(["out/*.pdf", "*.pdf"]);
			},
		);
	});

	it("plans both halves of a thesis beside its software from detection alone", async () => {
		// The motivating case: no declaration, and detection still finds both domains.
		await inRepository(
			async (root) => {
				await write(root, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n');
				await write(root, "engine/pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n');
			},
			(root) => {
				const environment = configure(root);
				expect([...environment.domains].sort()).toEqual(["code", "paper"]);
				expect(environment.isMultiDomain).toBe(true);
				const plan = environment.testPlan();
				expect(plan.typst?.command).toStartWith("typst compile");
				expect(plan.python?.command).toBe("pytest");
			},
		);
	});
});

describe("the math domain", () => {
	it("lands a lakefile in the math domain", async () => {
		// The Lean form of the build file is a program, so its presence is the whole signal.
		await inRepository(
			async (root) => write(root, "lakefile.lean", "import Lake\nopen Lake DSL\npackage proofs\n"),
			(root) => {
				const environment = configure(root);
				expect([...environment.ecosystems]).toEqual(["lean"]);
				expect([...environment.domains]).toEqual(["math"]);
			},
		);
	});

	it("still names the package from the TOML form", async () => {
		// `lakefile.toml` is data rather than a program, so the name is worth reading.
		await inRepository(
			async (root) => write(root, "lakefile.toml", 'name = "proofs"\nversion = "0.2.0"\n'),
			(root) => {
				const declared = configure(root).packages[0];
				expect([declared?.name, declared?.version]).toEqual(["proofs", "0.2.0"]);
			},
		);
	});

	it("makes building the proof check and releases nothing", async () => {
		// A proof's value is that it checked, not that it produced a file.
		await inRepository(
			async (root) => write(root, "lakefile.toml", 'name = "proofs"\n'),
			(root) => {
				const environment = configure(root);
				expect(environment.testPlan().lean?.command).toBe("lake build");
				expect(environment.buildPlan().lean?.artifacts).toEqual([]);
			},
		);
	});

	it("reports a paper with its proofs as spanning both domains", async () => {
		// Formalised mathematics beside the paper that presents it.
		await inRepository(
			async (root) => {
				await write(root, "typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n');
				await write(root, "proofs/lakefile.toml", 'name = "proofs"\n');
			},
			(root) => {
				const environment = configure(root);
				expect([...environment.domains].sort()).toEqual(["math", "paper"]);
				expect(environment.isMultiDomain).toBe(true);
			},
		);
	});
});

describe("declaration comments", () => {
	it.each([
		["a string", "why this repository releases nothing"],
		["an object carrying what looks like a command", { command: "echo this is prose, not a suite" }],
	])("does not mistake a $comment key holding %s for an ecosystem", async (_shape, comment) => {
		// Reading a property off a string yields `undefined` rather than raising, so the string case
		// cannot crash the way it did in Python. The object case is the one that can go wrong here:
		// a `$comment` written as a mapping looks exactly like a declared ecosystem.
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n');
				await declare(root, { release: { $comment: comment, python: { enabled: false } } });
			},
			(root) => {
				const plan = configure(root).buildPlan();
				expect(plan).toEqual({});
				expect(Object.keys(plan)).not.toContain("$comment");
			},
		);
	});

	it("yields a release with no assets when a build is disabled", async () => {
		// A pipeline or a template is tagged without anything being packaged.
		await inRepository(
			async (root) => {
				await write(root, "pyproject.toml", '[project]\nname = "engine"\nversion = "0.1.0"\n');
				await declare(root, { release: { python: { enabled: false } } });
			},
			(root) => {
				const environment = configure(root);
				expect(environment.buildPlan()).toEqual({});
				expect(Object.keys(environment.testPlan())).toContain("python");
			},
		);
	});
});

describe("submodules are not this repository", () => {
	it("does not detect a submodule as a package", async () => {
		// A super-repository must not claim work that is already built elsewhere.
		await inRepository(
			async (root) => {
				await write(root, "prace/typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n');
				await write(root, "engine/pyproject.toml", '[project]\nname = "e"\nversion = "0.1.0"\n');
				await write(root, ".gitmodules", '[submodule "prace"]\n\tpath = prace\n\turl = https://github.com/o/p.git\n');
			},
			(root) => {
				const environment = configure(root);
				expect(pathsOf(environment)).toEqual(["engine"]);
				expect([...environment.domains]).toEqual(["code"]);
			},
		);
	});

	it("finds nothing of its own when everything it holds belongs to someone else", async () => {
		await inRepository(
			async (root) => {
				await write(root, "prace/typst.toml", '[package]\nname = "thesis"\nversion = "1.0.0"\n');
				await write(root, "engine/pyproject.toml", '[project]\nname = "e"\nversion = "0.1.0"\n');
				await write(
					root,
					".gitmodules",
					'[submodule "prace"]\n\tpath = prace\n\turl = https://github.com/o/p.git\n' +
						'[submodule "engine"]\n\tpath = engine\n\turl = https://github.com/o/e.git\n',
				);
			},
			(root) => {
				const environment = configure(root);
				expect(environment.packages).toEqual([]);
				expect(environment.buildPlan()).toEqual({});
			},
		);
	});

	it("leaves a repository without submodules unaffected", async () => {
		// The overwhelming majority of repositories have no submodules at all.
		await inRepository(
			async (root) => write(root, "pyproject.toml", '[project]\nname = "e"\nversion = "0.1.0"\n'),
			(root) => {
				expect(pathsOf(configure(root))).toEqual(["."]);
			},
		);
	});
});
