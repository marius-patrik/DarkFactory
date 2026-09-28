/**
 * pi port of the plugin-builder guard.
 *
 * pi has no JSON hooks either: a hook is a TypeScript extension subscription. It also gates all
 * project resources behind project trust, so this file does nothing until the project is trusted.
 *
 * Install by symlinking, because pi only reads a fixed location:
 *
 *   mkdir -p .pi/extensions
 *   ln -sfn ../../.darkfactory/plugins/plugin-builder/hooks/ports/pi.ts \
 *     .pi/extensions/plugin-builder.ts
 */

/** A blind add. The separator matters: `git add .darkfactory/x` is an explicit path, not this. */
const BLIND_ADD =
	/git\s+add\s+(-A|--all|-a)([\s]|;|&|\||\)|$)|git\s+add\s+\.([\s]|;|&|\||\)|$|")/;

const REASON = [
	"Refusing a blind git add. It swept a parallel session's work into a commit here.",
	"",
	"Stage explicit paths, so a commit contains only what you meant:",
	"",
	"    git add path/to/file.ts",
].join("\n");

export default function pluginBuilderGuard(pi: {
	on: (event: string, handler: (event: { toolName: string; input?: unknown }) => unknown) => void;
}): void {
	pi.on("tool_call", async (event) => {
		if (event.toolName !== "bash") return undefined;
		const command = String((event.input as { command?: unknown } | undefined)?.command ?? "");
		if (!BLIND_ADD.test(command)) return undefined;
		return { block: true, reason: REASON };
	});
}
