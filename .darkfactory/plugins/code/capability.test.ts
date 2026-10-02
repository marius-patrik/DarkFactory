import { describe, expect, test } from "bun:test";
import type {
	CapabilityActionDefinition,
	CapabilityActionKind,
	CapabilityPackageContext,
} from "../../../packages/capability/src/index.ts";
import capability from "./capability.ts";

/** Minimal detected package evidence; every field the action functions read is overridable. */
function node(overrides: Partial<CapabilityPackageContext> = {}): CapabilityPackageContext {
	return {
		id: "node:packages/example",
		path: "packages/example",
		name: "example",
		ecosystem: "node",
		packageManager: "bun",
		packageManagerRoot: ".",
		manifest: "package.json",
		domains: ["code"],
		scripts: [],
		apiEntryPoints: [],
		...overrides,
	};
}

/** Minimal detected package evidence for a Python manifest. */
function python(overrides: Partial<CapabilityPackageContext> = {}): CapabilityPackageContext {
	return {
		id: "python:.",
		path: ".",
		name: "example",
		ecosystem: "python",
		packageManager: "pip",
		packageManagerRoot: ".",
		manifest: "pyproject.toml",
		domains: ["code"],
		scripts: [],
		apiEntryPoints: [],
		...overrides,
	};
}

/** The one declared action for a kind, looked up by contract so a dropped or duplicated action fails. */
function declared(kind: CapabilityActionKind, ecosystem: string): CapabilityActionDefinition {
	// `defineCapability` returns its const-inferred literal type, so the actions are viewed through
	// the ABI they are declared against rather than through their inferred tuple types.
	const actions: readonly CapabilityActionDefinition[] = capability.actions ?? [];
	const matches = actions.filter(
		(candidate) => candidate.kind === kind && candidate.ecosystems?.includes(ecosystem) === true,
	);
	const [first, ...rest] = matches;
	if (!first || rest.length > 0) {
		throw new Error(`expected exactly one ${ecosystem} ${kind} action, found ${matches.length}`);
	}
	return first;
}

/** The command one declared action yields for one detected package, or undefined when it declines. */
function command(kind: CapabilityActionKind, ecosystem: string, pkg: CapabilityPackageContext): string | undefined {
	const action = declared(kind, ecosystem);
	return typeof action.command === "function" ? action.command(pkg) : action.command;
}

/** The metadata one declared action yields for one detected package. */
function metadata(
	kind: CapabilityActionKind,
	ecosystem: string,
	pkg: CapabilityPackageContext,
): Readonly<Record<string, unknown>> | undefined {
	const action = declared(kind, ecosystem);
	return typeof action.metadata === "function" ? action.metadata(pkg) : action.metadata;
}

describe("code capability node action derivation", () => {
	test("runs each package script through the detected package manager, not a fixed command", () => {
		const withScript = node({ scripts: ["test"] });
		expect(command("test", "node", withScript)).toBe("bun run test");
		expect(command("test", "node", node({ packageManager: "pnpm", scripts: ["test"] }))).toBe("pnpm run test");
		expect(command("test", "node", node({ packageManager: "npm", scripts: ["test"] }))).toBe("npm run test");
		// Yarn's script invocation is not `yarn run`; the manager decides the form.
		expect(command("test", "node", node({ packageManager: "yarn", scripts: ["test"] }))).toBe("yarn test");
	});

	test("declines a test command for a package with no test script instead of inventing one", () => {
		expect(command("test", "node", node())).toBeUndefined();
		expect(command("test", "node", node({ scripts: ["lint", "typecheck"] }))).toBeUndefined();
		// A package manager outside the supported set is not guessed at either.
		expect(command("test", "node", node({ packageManager: "cargo", scripts: ["test"] }))).toBeUndefined();
	});

	test("prefers the declared script for typecheck, lint and format, and falls back per action", () => {
		const withScripts = node({ scripts: ["typecheck", "lint", "format:check"] });
		expect(command("typecheck", "node", withScripts)).toBe("bun run typecheck");
		expect(command("lint", "node", withScripts)).toBe("bun run lint");
		expect(command("format_check", "node", withScripts)).toBe("bun run format:check");

		const withoutScripts = node();
		expect(command("typecheck", "node", withoutScripts)).toBe("tsc --noEmit");
		expect(command("lint", "node", withoutScripts)).toBe("biome lint .");
		expect(command("format_check", "node", withoutScripts)).toBe("biome ci .");
	});

	test("falls back per action, so one missing script does not silence the others", () => {
		const onlyLint = node({ scripts: ["lint"] });
		expect(command("lint", "node", onlyLint)).toBe("bun run lint");
		expect(command("typecheck", "node", onlyLint)).toBe("tsc --noEmit");
		expect(command("format_check", "node", onlyLint)).toBe("biome ci .");
	});

	test("canonical fallbacks are package-manager independent", () => {
		for (const packageManager of ["bun", "pnpm", "yarn", "npm"]) {
			expect(command("typecheck", "node", node({ packageManager }))).toBe("tsc --noEmit");
			expect(command("lint", "node", node({ packageManager }))).toBe("biome lint .");
			expect(command("format_check", "node", node({ packageManager }))).toBe("biome ci .");
		}
	});

	test("installs with the frozen-lockfile form each manager guarantees", () => {
		expect(command("setup", "node", node())).toBe("bun install --frozen-lockfile");
		expect(command("setup", "node", node({ packageManager: "pnpm" }))).toBe("pnpm install --frozen-lockfile");
		expect(command("setup", "node", node({ packageManager: "npm" }))).toBe("npm ci");
		// Yarn's reproducible form is --immutable, not --frozen-lockfile.
		expect(command("setup", "node", node({ packageManager: "yarn" }))).toBe("yarn install --immutable");
		expect(command("setup", "node", node({ packageManager: "cargo" }))).toBeUndefined();
	});

	test("extracts API documentation only for a package that exports an API", () => {
		const withApi = node({ apiEntryPoints: ["packages/example/src/index.ts"] });
		expect(metadata("docs_extract", "node", withApi)).toEqual({
			extractor: "typedoc",
			entryPoints: ["packages/example/src/index.ts"],
			strict: true,
		});
		// A package with no exported entry point has no documentation surface; metadata is the
		// only contribution of this action, so declining it must leave no trace.
		expect(metadata("docs_extract", "node", node())).toBeUndefined();
	});
});

describe("code capability python action derivation", () => {
	test("prefixes each command with the detected python package manager", () => {
		expect(command("test", "python", python({ packageManager: "uv" }))).toBe("uv run pytest");
		expect(command("test", "python", python({ packageManager: "poetry" }))).toBe("poetry run pytest");
		expect(command("test", "python", python({ packageManager: "pipenv" }))).toBe("pipenv run pytest");
		// A plain pip environment runs the tool directly.
		expect(command("test", "python", python())).toBe("pytest");
		expect(command("format_check", "python", python({ packageManager: "uv" }))).toBe(
			"uv run black --check --line-length 100 .",
		);
	});

	test("declares the python versions its test action is verified against", () => {
		const versions = metadata("test", "python", python())?.versions;
		expect(Array.isArray(versions)).toBe(true);
		// An empty or non-string version list silently collapses the Python test matrix instead of
		// failing, so the declared values are checked rather than trusted.
		const declared = versions as readonly unknown[];
		expect(declared.length).toBeGreaterThan(0);
		expect(declared.every((version) => typeof version === "string" && version.length > 0)).toBe(true);
	});

	test("distinguishes a requirements install from an installable project", () => {
		const requirements = python({ manifest: "requirements.txt" });
		expect(command("setup", "python", requirements)).toBe("python -m pip install -r requirements.txt");
		expect(command("setup", "python", python({ manifest: "pyproject.toml" }))).toBe("python -m pip install -e .");
		expect(command("setup", "python", python({ manifest: "setup.py" }))).toBe("python -m pip install -e .");
	});

	test("installs python dependencies with each manager's frozen form", () => {
		expect(command("setup", "python", python({ packageManager: "uv" }))).toBe("uv sync --frozen");
		expect(command("setup", "python", python({ packageManager: "poetry" }))).toBe("poetry install --no-interaction");
		expect(command("setup", "python", python({ packageManager: "pipenv" }))).toBe("pipenv sync --dev");
	});
});

describe("code capability action surface", () => {
	test("keeps every node quality action derived from detected evidence rather than a literal", () => {
		for (const kind of ["test", "typecheck", "lint", "format_check"] as const) {
			expect(typeof declared(kind, "node").command).toBe("function");
		}
	});

	test("scopes each node and python action to exactly its own ecosystem", () => {
		for (const kind of ["test", "typecheck", "lint", "format_check", "setup"] as const) {
			expect(declared(kind, "node").ecosystems).toEqual(["node"]);
		}
		for (const kind of ["test", "format_check", "setup"] as const) {
			expect(declared(kind, "python").ecosystems).toEqual(["python"]);
		}
	});

	test("declares the code domain, so the capability is applicable to code repositories", () => {
		expect(capability.domains).toEqual(["code"]);
		expect(capability.detectors?.map((detector) => detector.domains)).toEqual([["code"]]);
	});
});
