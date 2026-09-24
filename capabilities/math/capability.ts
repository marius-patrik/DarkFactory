import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

/** Official mathematics-domain capability definition. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "math",
	version: "0.0.0",
	description: "Mathematics repository detection and formal-math capability boundary.",
	domains: ["math"],
	detectors: [
		{
			id: "math-domain",
			description: "Activates when repository domain detection includes math.",
			domains: ["math"],
		},
	],
	actions: [
		{
			kind: "test",
			description: "Build Lean targets to check formal proofs.",
			ecosystems: ["lean"],
			command: "lake build",
		},
	],
});

export default capability;
