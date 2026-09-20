import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

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
});

export default capability;
