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
			kind: "typecheck",
			description: "Typeset the Typst manuscript. Typst is statically typed, so compiling it IS the typecheck.",
			ecosystems: ["typst"],
			command: "mkdir -p out && typst compile main.typ out/paper.pdf",
		},
		{
			kind: "typecheck",
			description: "Typeset the LaTeX manuscript; a clean latexmk run is the correctness check.",
			ecosystems: ["latex"],
			command: "mkdir -p out && latexmk -pdf -interaction=nonstopmode -halt-on-error -outdir=out main.tex",
		},
		{
			kind: "release",
			description:
				"Publish the repository-root PAPER.pdf from the manuscript source, with fonts and bibliography wired.",
			ecosystems: ["typst"],
			command: "bun ../scripts/paper/publication.ts",
			metadata: { artifacts: ["../../PAPER.pdf"] },
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
