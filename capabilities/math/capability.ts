import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

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
});

export default capability;
