import { CAPABILITY_ABI_VERSION, defineCapability } from "@darkfactory/capability";

/** Official paper-domain capability definition. */
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
	actions: [
		{
			kind: "test",
			description: "Typeset a Typst paper as its deterministic verification.",
			ecosystems: ["typst"],
			command: "mkdir -p out && typst compile main.typ out/paper.pdf",
		},
		{
			kind: "test",
			description: "Typeset a LaTeX paper as its deterministic verification.",
			ecosystems: ["latex"],
			command: "mkdir -p out && latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=out main.tex",
		},
		{
			kind: "release",
			description: "Build the Typst release document.",
			ecosystems: ["typst"],
			command: "mkdir -p out && typst compile main.typ out/paper.pdf",
			metadata: { artifacts: ["out/*.pdf", "*.pdf"] },
		},
		{
			kind: "release",
			description: "Build the LaTeX release document.",
			ecosystems: ["latex"],
			command: "mkdir -p out && latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=out main.tex",
			metadata: { artifacts: ["out/*.pdf", "*.pdf"] },
		},
	],
});

export default capability;
