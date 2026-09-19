import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "paper",
	version: "0.0.0",
	description: "Paper repository detection and scholarly-document capability boundary.",
	domains: ["paper"],
	detectors: [
		{
			id: "paper-domain",
			description: "Activates when repository domain detection includes paper.",
			domains: ["paper"],
		},
	],
});

export default capability;
