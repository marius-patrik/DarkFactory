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
			command: (pkg) => {
				switch (pkg.packageManager) {
					case "bun": return "bun install";
					case "pnpm": return "pnpm install --frozen-lockfile";
					case "yarn": return "yarn install --immutable";
					case "npm": return "npm ci";
					default: return undefined;
				}
			},
		},
		{
			kind: "test",
			description: "Run Python tests.",
			ecosystems: ["python"],
			command: "pytest",
		},
		{
			kind: "format_check",
			description: "Check Python formatting.",
			ecosystems: ["python"],
			command: "black --check --line-length 100 .",
		},
		{
			kind: "setup",
			description: "Install Python development dependencies.",
			ecosystems: ["python"],
			command: "python -m pip install -r requirements-dev.txt",
		},
		{
			kind: "test",
			description: "Run Rust tests.",
			ecosystems: ["rust"],
			command: "cargo test",
		},
		{
			kind: "lint",
			description: "Run Rust clippy.",
			ecosystems: ["rust"],
			command: "cargo clippy --all-targets --all-features -- -D warnings",
		},
		{
			kind: "format_check",
			description: "Check Rust formatting.",
			ecosystems: ["rust"],
			command: "cargo fmt -- --check",
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
	],
});

export default capability;
