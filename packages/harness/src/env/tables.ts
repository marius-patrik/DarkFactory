/** @packageDocumentation
 * The declarations that describe what a repository can be made of.
 *
 * Everything here is a table rather than a function: an ecosystem says which toolchain a package
 * needs, a domain says what kind of governance it answers to, and the command tables say how each
 * is tested, formatted and packaged by default. The behaviour that reads them lives in
 * `./environment.ts`.
 *
 * A repository may declare an ecosystem of its own making - a bare `make` target, say - so an
 * ecosystem is a plain string throughout rather than a closed union: a name outside these tables is
 * planned like any other and simply falls back to {@link DEFAULT_DOMAIN}.
 */

/** Directories never worth descending into when looking for package manifests. */
export const PRUNED_DIRECTORIES: ReadonlySet<string> = new Set([
	".git",
	".venv",
	"venv",
	"node_modules",
	"target",
	"dist",
	"build",
	"site",
	"__pycache__",
	".pytest_cache",
	".mypy_cache",
	".ruff_cache",
	"vendor",
]);

/** Manifest filename -> the ecosystem it declares. */
export const MANIFEST_ECOSYSTEMS: Readonly<Record<string, string>> = {
	"pyproject.toml": "python",
	"setup.py": "python",
	"setup.cfg": "python",
	"package.json": "node",
	"Cargo.toml": "rust",
	"go.mod": "go",
	"deno.json": "deno",
	"deno.jsonc": "deno",
	"lakefile.lean": "lean",
	"lakefile.toml": "lean",
	"typst.toml": "typst",
	// LaTeX has no manifest convention as settled as the others. `.latexmkrc` is the closest thing
	// to one and is already read by latexmk, so a repository that builds with latexmk is detected
	// without being asked to carry a file it would not otherwise have.
	".latexmkrc": "latex",
};

/**
 * Ecosystem -> the domain it belongs to.
 *
 * An ecosystem says which toolchain a package needs; a domain says what kind of governance it
 * answers to. Python and Rust differ in toolchain but are both *code*: they are tested and
 * packaged. Typst and LaTeX are two ways to reach the same artifact, a PDF, and are both *paper*:
 * they are typeset and published. Keeping the two levels apart is what lets one repository hold a
 * thesis and the software it documents and have both governed, each on its own terms.
 */
export const ECOSYSTEM_DOMAINS: Readonly<Record<string, string>> = {
	python: "code",
	node: "code",
	deno: "code",
	rust: "code",
	go: "code",
	typst: "paper",
	latex: "paper",
	lean: "math",
};

/** Domain assumed for an ecosystem {@link ECOSYSTEM_DOMAINS} does not name. */
export const DEFAULT_DOMAIN = "code";

/** A lockfile paired with the package manager that writes it. */
type Lockfile = readonly [filename: string, manager: string];

/**
 * Ecosystem -> its lockfiles paired with the manager that writes them, most specific first.
 *
 * Scoped per ecosystem rather than kept in one flat table: a polyglot repository root holds several
 * lockfiles at once, and a flat lookup would report whichever happened to be listed first - a
 * Cargo workspace beside a `bun.lock` would claim its package manager is Bun.
 */
export const LOCKFILES: Readonly<Record<string, readonly Lockfile[]>> = {
	node: [
		["bun.lock", "bun"],
		["bun.lockb", "bun"],
		["pnpm-lock.yaml", "pnpm"],
		["yarn.lock", "yarn"],
		["package-lock.json", "npm"],
	],
	deno: [["deno.lock", "deno"]],
	python: [
		["uv.lock", "uv"],
		["poetry.lock", "poetry"],
		["Pipfile.lock", "pipenv"],
	],
	rust: [["Cargo.lock", "cargo"]],
	go: [["go.sum", "go"]],
};

/** How far below the root to look for member packages when no workspace globs are declared. */
export const MAX_DEPTH = 4;

/**
 * A command table keyed first by ecosystem and then by the package manager that decides the command.
 *
 * `*` is the entry used when no lockfile identified a manager, which is the fallback the manager
 * tables have always carried rather than a manager named `*`.
 */
export type ManagerCommands = Readonly<Record<string, Readonly<Record<string, string>>>>;

/** Default test command per ecosystem, keyed by package manager where the manager decides it. */
export const TEST_COMMANDS: ManagerCommands = {
	python: { uv: "uv run pytest", poetry: "poetry run pytest", "*": "pytest" },
	node: { bun: "bun test", pnpm: "pnpm test", yarn: "yarn test", npm: "npm test", "*": "npm test" },
	deno: { "*": "deno test -A" },
	rust: { "*": "cargo test --all-features --workspace" },
	go: { "*": "go test ./..." },
	// For a paper, typesetting *is* the test: a document that does not compile is the equivalent of
	// a program that does not build, and an unresolved reference is its failing assertion.
	//
	// `mkdir -p out` because typst does not create the directory it writes into and does not fail
	// when it cannot: it prints `failed to write PDF file (No such file or directory)` and exits 0.
	// Without it, a paper whose `out/` is absent — which it always is in a clean checkout, since the
	// directory is build output — "passed" having compiled nothing.
	typst: { "*": "mkdir -p out && typst compile main.typ out/paper.pdf" },
	latex: { "*": "latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex" },
	// Building a Lean project *is* checking its proofs: the compiler is the proof checker, so there
	// is no separate test step to run afterwards.
	lean: { "*": "lake build" },
};

/** Default runtime matrix per ecosystem. Empty means "one job, whatever the runner provides". */
export const TEST_MATRIX: Readonly<Record<string, readonly string[]>> = {
	python: ["3.10", "3.11", "3.12", "3.13"],
	node: [],
	deno: [],
	rust: [],
	go: [],
	typst: [],
	latex: [],
	lean: [],
};

/** Default formatter per ecosystem, keyed by package manager where the manager decides it. */
export const FORMAT_COMMANDS: ManagerCommands = {
	python: { uv: "uv run black .", poetry: "poetry run black .", "*": "black ." },
	node: {
		bun: "bun run format",
		pnpm: "pnpm run format",
		yarn: "yarn format",
		npm: "npm run format",
		"*": "npx prettier --write .",
	},
	deno: { "*": "deno fmt" },
	rust: { "*": "cargo fmt --all" },
	go: { "*": "gofmt -w ." },
	typst: { "*": "typstyle --inplace ." },
	latex: { "*": "latexindent --overwrite --silent main.tex" },
};

/** Default release-build command per ecosystem, keyed by package manager where it decides. */
export const BUILD_COMMANDS: ManagerCommands = {
	python: { uv: "uv build", poetry: "poetry build", "*": "python -m build" },
	node: {
		bun: "bun run build",
		pnpm: "pnpm run build",
		yarn: "yarn build",
		npm: "npm run build",
		"*": "npm run build",
	},
	deno: { "*": "deno compile -A" },
	rust: { "*": "cargo build --release --workspace" },
	go: { "*": "go build ./..." },
	// Same command as the test, for the same reason, with the same `mkdir -p out`.
	typst: { "*": "mkdir -p out && typst compile main.typ out/paper.pdf" },
	latex: { "*": "latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex" },
};

/** Where each ecosystem leaves the artifacts a release should attach, relative to the package. */
export const ARTIFACT_GLOBS: Readonly<Record<string, readonly string[]>> = {
	python: ["dist/*.whl", "dist/*.tar.gz"],
	node: ["dist/**", "build/**"],
	deno: ["dist/**"],
	rust: ["target/release/*.tar.gz", "target/release/*.zip"],
	go: ["bin/*"],
	// The document itself is the release. `out/` is where both engines are told to put it above;
	// the bare glob catches a repository that typesets in place.
	typst: ["out/*.pdf", "*.pdf"],
	latex: ["out/*.pdf", "*.pdf"],
	// A proof releases nothing: its value is that it checked, not that it produced a file.
	lean: [],
};

/** A configuration file that names a formatter outright, overriding the package-manager default. */
type FormatterMarker = readonly [filename: string, ecosystem: string, command: string];

/** Marker files that name a formatter outright, overriding the package-manager default. */
export const FORMATTER_MARKERS: readonly FormatterMarker[] = [
	["biome.json", "node", "npx @biomejs/biome format --write ."],
	["biome.jsonc", "node", "npx @biomejs/biome format --write ."],
	["ruff.toml", "python", "ruff format ."],
	[".ruff.toml", "python", "ruff format ."],
];

/**
 * Resolves one ecosystem's default command.
 *
 * The manager that wrote the lockfile decides which of the entries applies, and `*` is used when no
 * lockfile identified one. An ecosystem with no entry at all yields `undefined`, which is how a
 * repository declaring an ecosystem of its own ends up with no invented command.
 *
 * @param table One of the command tables above.
 * @param ecosystem Ecosystem being planned.
 * @param manager Package manager identified for that ecosystem, if any.
 * @returns The command, or `undefined` when the ecosystem is unknown.
 */
export function defaultCommand(
	table: ManagerCommands,
	ecosystem: string,
	manager: string | undefined,
): string | undefined {
	const byManager = table[ecosystem];
	if (!byManager) return undefined;
	if (manager !== undefined) {
		const chosen = byManager[manager];
		if (chosen !== undefined) return chosen;
	}
	return byManager["*"];
}
