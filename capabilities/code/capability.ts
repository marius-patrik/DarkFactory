import {
	CAPABILITY_ABI_VERSION,
	type CapabilityPackageContext,
	defineCapability,
} from "@darkfactory/capability";

function nodeRun(pkg: CapabilityPackageContext, script: string): string | undefined {
	if (!pkg.scripts.includes(script)) return undefined;
	switch (pkg.packageManager) {
		case "bun": return `bun run ${script}`;
		case "pnpm": return `pnpm run ${script}`;
		case "yarn": return `yarn ${script}`;
		case "npm": return `npm run ${script}`;
		default: return undefined;
	}
}

function nodeTest(pkg: CapabilityPackageContext): string | undefined {
	if (pkg.packageManager === "bun") return "bun test";
	return nodeRun(pkg, "test");
}

function nodeFormatCheck(pkg: CapabilityPackageContext): string | undefined {
	return nodeRun(pkg, "format:check") ?? nodeRun(pkg, "check");
}

function nodeSetup(pkg: CapabilityPackageContext): string | undefined {
	switch (pkg.packageManager) {
		case "bun": return "bun install --frozen-lockfile";
		case "pnpm": return "pnpm install --frozen-lockfile";
		case "yarn": return "yarn install --immutable";
		case "npm": return "npm ci";
		default: return undefined;
	}
}

function pythonCommand(pkg: CapabilityPackageContext, command: string): string {
	switch (pkg.packageManager) {
		case "uv": return `uv run ${command}`;
		case "poetry": return `poetry run ${command}`;
		case "pipenv": return `pipenv run ${command}`;
		default: return command;
	}
}

function pythonSetup(pkg: CapabilityPackageContext): string {
	switch (pkg.packageManager) {
		case "uv": return "uv sync --frozen";
		case "poetry": return "poetry install --no-interaction";
		case "pipenv": return "pipenv sync --dev";
		default: return pkg.manifest === "requirements.txt"
			? "python -m pip install -r requirements.txt"
			: "python -m pip install -e .";
	}
}

function nodeDocsMetadata(pkg: CapabilityPackageContext): Readonly<Record<string, unknown>> | undefined {
	if (pkg.apiEntryPoints.length === 0) return undefined;
	return { extractor: "typedoc", entryPoints: pkg.apiEntryPoints, strict: true };
}

/** Official code-domain capability definition. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "code",
	version: "0.0.0",
	description: "Code repository detection and agentic software-engineering capability boundary.",
	domains: ["code"],
	detectors: [
		{
			id: "code-domain",
			description: "Activates when repository domain detection includes code.",
			domains: ["code"],
		},
	],
	actions: [
		{
			kind: "test",
			description: "Run package tests with the detected Node package manager.",
			ecosystems: ["node"],
			command: nodeTest,
		},
		{
			kind: "lint",
			description: "Run the package lint script with the detected Node package manager.",
			ecosystems: ["node"],
			command: (pkg) => nodeRun(pkg, "lint"),
		},
		{
			kind: "format_check",
			description: "Run the package formatting/check script with the detected Node package manager.",
			ecosystems: ["node"],
			command: nodeFormatCheck,
		},
		{
			kind: "docs_check",
			description: "Strictly validate TypeScript API documentation for the detected package.",
			ecosystems: ["node"],
			metadata: nodeDocsMetadata,
		},
		{
			kind: "docs_extract",
			description: "Extract TypeScript API documentation for the detected package.",
			ecosystems: ["node"],
			metadata: nodeDocsMetadata,
		},
		{
			kind: "setup",
			description: "Install Node package dependencies with the detected package manager.",
			ecosystems: ["node"],
			command: nodeSetup,
		},
		{
			kind: "test",
			description: "Run Python tests with the detected Python package manager.",
			ecosystems: ["python"],
			command: (pkg) => pythonCommand(pkg, "pytest"),
			metadata: { versions: ["3.10", "3.11", "3.12", "3.13"] },
		},
		{
			kind: "format_check",
			description: "Check Python formatting.",
			ecosystems: ["python"],
			command: (pkg) => pythonCommand(pkg, "black --check --line-length 100 ."),
		},
		{
			kind: "setup",
			description: "Install Python dependencies with the detected package manager.",
			ecosystems: ["python"],
			command: pythonSetup,
		},
		{
			kind: "test",
			description: "Run Rust tests.",
			ecosystems: ["rust"],
			command: "cargo test --all-features --workspace",
		},
		{
			kind: "lint",
			description: "Run Rust clippy.",
			ecosystems: ["rust"],
			command: "cargo clippy --workspace --all-targets --all-features -- -D warnings",
		},
		{
			kind: "format_check",
			description: "Check Rust formatting.",
			ecosystems: ["rust"],
			command: "cargo fmt --all -- --check",
		},
		{
			kind: "docs_check",
			description: "Check Rust documentation.",
			ecosystems: ["rust"],
			command: "cargo doc --no-deps",
		},
		{
			kind: "docs_extract",
			description: "Build Rust API documentation.",
			ecosystems: ["rust"],
			command: "cargo doc --no-deps",
		},
		{
			kind: "test",
			description: "Run Go tests.",
			ecosystems: ["go"],
			command: "go test ./...",
		},
		{
			kind: "lint",
			description: "Run Go vet.",
			ecosystems: ["go"],
			command: "go vet ./...",
		},
		{
			kind: "format_check",
			description: "Check Go formatting.",
			ecosystems: ["go"],
			command: "test -z \"$(gofmt -l .)\"",
		},
		{
			kind: "docs_check",
			description: "Validate Go package documentation.",
			ecosystems: ["go"],
			command: "go doc ./...",
		},
		{
			kind: "docs_extract",
			description: "Extract Go package documentation.",
			ecosystems: ["go"],
			command: "go doc ./...",
		},
		{
			kind: "test",
			description: "Run Deno tests.",
			ecosystems: ["deno"],
			command: "deno test -A",
		},
		{
			kind: "lint",
			description: "Run Deno lint.",
			ecosystems: ["deno"],
			command: "deno lint",
		},
		{
			kind: "format_check",
			description: "Check Deno formatting.",
			ecosystems: ["deno"],
			command: "deno fmt --check",
		},
		{
			kind: "docs_check",
			description: "Validate Deno documentation.",
			ecosystems: ["deno"],
			command: "deno doc --lint",
		},
	],
});

export default capability;
