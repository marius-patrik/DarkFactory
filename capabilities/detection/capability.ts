import {
	defineCapability,
	CAPABILITY_ABI_VERSION,
	detectRepositoryPackages,
	CapabilityRuntimeContext,
} from "@darkfactory/capability";

export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "detection",
	version: "0.1.0",
	description: "Durable repository, package, and capability detection.",
	domains: ["code"],
	detectors: [
		{
			id: "repo-detector",
			description: "Detects repository packages and their ecosystems.",
			domains: ["code"],
		},
	],
	tools: [
		{
			name: "detect_packages",
			description: "Detects all supported packages and ecosystems in the repository. Standard default pruned directories can be overridden or un-ignored by prefixing with '!' in environment.ignore (e.g., environment.ignore: ['!node_modules']).",
			inputSchema: {
				type: "object",
				properties: {},
				required: [],
			},
			execute: async (_, context: CapabilityRuntimeContext) => {
				const root = context?.repositoryRoot || process.cwd();
				const auditLog = context?.audit ? (event: any) => context.audit?.(event) : undefined;
				const { detected, status, diagnostics } = await detectRepositoryPackages(root, auditLog);

				return {
					detected,
					status,
					diagnostics,
					warning: status === "pruned" ? "Scanning reached maximum depth or directory limit. Some packages might be missing." : undefined,
				};
			},
		},
	],
});

export default capability;
