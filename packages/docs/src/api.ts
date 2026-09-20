import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Application, type JSONOutput } from "typedoc";

/** Inputs required to extract a TypeScript API model. */
export interface TypeScriptApiExtractionOptions {
	entryPoints: readonly string[];
	tsconfig: string;
	name?: string;
}

/** Strictly extracts TypeScript/TSDoc API metadata as TypeDoc JSON without rendering HTML. */
export async function extractTypeScriptApi(
	options: TypeScriptApiExtractionOptions,
): Promise<JSONOutput.ProjectReflection> {
	const app = await Application.bootstrap({
		name: options.name,
		entryPoints: [...options.entryPoints],
		tsconfig: options.tsconfig,
		skipErrorChecking: false,
		emit: "none",
		validation: {
			notExported: true,
			invalidLink: true,
			invalidPath: true,
			rewrittenLink: false,
			notDocumented: true,
			unusedMergeModuleWith: false,
		},
		requiredToBeDocumented: [
			"Class",
			"Interface",
			"Function",
			"TypeAlias",
			"Variable",
			"Enum",
			"EnumMember",
			"Accessor",
		],
		treatWarningsAsErrors: true,
		treatValidationWarningsAsErrors: true,
		readme: "none",
	});
	const project = await app.convert();
	if (!project || app.logger.hasErrors()) throw new Error("TypeDoc conversion failed.");
	app.validate(project);
	if (app.logger.hasErrors() || app.logger.hasWarnings()) {
		throw new Error("TypeDoc validation produced errors or warnings.");
	}

	const directory = await mkdtemp(join(tmpdir(), "darkfactory-typedoc-"));
	const output = join(directory, "api.json");
	try {
		await app.generateJson(project, output);
		if (app.logger.hasErrors() || app.logger.hasWarnings()) {
			throw new Error("TypeDoc JSON generation produced errors or warnings.");
		}
		return JSON.parse(await readFile(output, "utf8")) as JSONOutput.ProjectReflection;
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}
