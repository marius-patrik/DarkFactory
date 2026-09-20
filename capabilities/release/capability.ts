import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

/** Official release-engineering capability definition. */
export const capability = defineCapability({
	abiVersion: CAPABILITY_ABI_VERSION,
	id: "release",
	version: "0.0.0",
	description: "Release artifact integrity, provenance and distribution capability boundary.",
	surfaces: {
		release: ["artifact-manifest", "sha256sums", "source-provenance"],
	},
});

export default capability;
