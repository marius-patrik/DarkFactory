import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./pipeline-source.ts";

/**
 * The agent image's entrypoint must not name a Python interpreter.
 *
 * The image was `FROM python:3.12-slim-bookworm` for one reason: the ENTRYPOINT was
 * `dbus-run-session -- python3 /usr/local/bin/darkfactory-agent-runner`, and the interpreter was
 * there to satisfy it. That is the whole of the interpreter's justification, which is why
 * `nix/entrypoint.sh` says so in its own header and sequences itself after the Python removal.
 *
 * These assertions exist because the failure they guard against is silent. An entrypoint that names
 * a path no longer copied in still builds, still runs, and reports a missing file at run time — and a
 * missing entrypoint file inside an agent container looks like an agent that did nothing. The Nix
 * entrypoint documents the same hazard for a related change and refuses to shim it for the same
 * reason: a shim that makes the image look compatible turns a loud failure into a silent one.
 */
const dockerfile = readFileSync(join(repoRoot, "docker", "Dockerfile.agent"), "utf8");

/** The ENTRYPOINT line, or `""` when the file declares none. */
function entrypoint(): string {
	return dockerfile.split("\n").find((line) => line.trimStart().startsWith("ENTRYPOINT")) ?? "";
}

describe("the agent image's entrypoint", () => {
	it("names no Python interpreter", () => {
		const line = entrypoint();
		expect(line).not.toBe("");
		expect(line).not.toMatch(/\bpython3?\b/u);
	});

	it("runs `df`, so the image's entrypoint is the command the image installs", () => {
		// Not a path into the source tree. The image ships `df` a few lines above this and should run
		// exactly that: a second executable or a source path makes the entrypoint depend on the source
		// layout, so a file move breaks the container, and it puts a command surface outside the CLI that
		// owns one.
		expect(entrypoint()).toContain('"df"');
	});

	it("names no file under the source tree, so nothing bypasses the CLI", () => {
		expect(entrypoint()).not.toMatch(/\.ts"/u);
	});

	it("still appends the image's arguments, which is how `docker run … dispatch` reaches the runner", () => {
		// `dbus-run-session -- df` with exec form: `docker run image dispatch` becomes
		// `dbus-run-session -- df dispatch`. The `--` has to stay, or dbus-run-session would read `df` as
		// its own program name instead of the command to run under the session bus.
		const line = entrypoint();
		expect(line).toContain('"--"');
		expect(line.endsWith('"df"]')).toBe(true);
	});

	it("keeps dbus-run-session, which is where the keyring's secret-tool gets a session bus", () => {
		// The credential store is a D-Bus client. Dropping the wrapper does not remove the
		// dependency, it removes the session bus the client needs, and the failure appears as an
		// authentication error rather than a missing bus.
		expect(entrypoint()).toContain("dbus-run-session");
	});

	it("installs no runner binary that the entrypoint would have named instead", () => {
		// The old image copied agent_runner.py to /usr/local/bin/darkfactory-agent-runner. If that
		// line is still present alongside the TypeScript entrypoint, one of the two is dead and
		// nobody can tell which from the file.
		expect(dockerfile).not.toContain("darkfactory-agent-runner");
	});

	it("copies nothing that no longer exists", () => {
		// Each of these was deleted by the merged stack, and a `COPY` naming a missing path fails the
		// build rather than degrading: the agent image did not build at all until this was fixed.
		//   capabilities/               -> .darkfactory/plugins/            (#1297)
		//   pyproject.toml, requirements-dev.txt, .github/scripts/           (#1311)
		//   packages/harness/package.json  gone with the per-package manifests (#1271)
		for (const removed of [
			"capabilities/",
			"pyproject.toml",
			"requirements-dev.txt",
			".github/scripts/",
			"packages/harness/package.json",
		]) {
			expect(dockerfile, `the image must not copy ${removed}`).not.toContain(`COPY ${removed}`);
		}
	});

	it("copies the plugin tree the capabilities moved into, and installs the root workspace", () => {
		// `bun install` had no manifest to read in the old form; the root workspace is the install
		// target now, and `.darkfactory/plugins/` holds the capability sources the image resolves.
		expect(dockerfile).toContain("COPY .darkfactory/ /opt/darkfactory/.darkfactory/");
		expect(dockerfile).toContain("bun install --frozen-lockfile");
		expect(dockerfile).not.toContain("--cwd /opt/darkfactory/packages/harness");
	});

	it("keeps the wrapper the PATH contract resolves through", () => {
		expect(dockerfile).toContain("scripts/df-wrapper.sh");
		expect(dockerfile).toContain("ENV DF_SOURCE=/opt/darkfactory/packages/harness/src/cli.ts");
	});
});
