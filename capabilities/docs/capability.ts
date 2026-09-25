import {
	CAPABILITY_ABI_VERSION,
	type CapabilityPackageContext,
	defineCapability,
} from "@darkfactory/capability";

function nodeDocsMetadata(pkg: CapabilityPackageContext): Readonly<Record<string, unknown>> | undefined {
	if (pkg.apiEntryPoints.length === 0) return undefined;
	return { extractor: "typedoc", entryPoints: pkg.apiEntryPoints, strict: true };
}

/** Official documentation capability definition. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "docs",
	version: "0.0.0",
	description: "Documentation validation and extraction behavior for detected repository packages.",
	actions: [
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
			kind: "docs_check",
			description: "Validate Deno documentation.",
			ecosystems: ["deno"],
			command: "deno doc --lint",
		},
	],
});

export default capability;
