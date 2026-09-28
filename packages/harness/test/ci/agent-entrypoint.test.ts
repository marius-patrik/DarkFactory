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

	it("runs the ported entrypoint, so `docker run darkfactory-agent dispatch` reaches the runner", () => {
		expect(entrypoint()).toContain("/packages/harness/src/pipeline/main.ts");
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

	it("still copies the pipeline scripts, which the delivery workflows run in the runner context", () => {
		expect(dockerfile).toContain("COPY .github/scripts/ /usr/local/share/darkfactory-scripts/");
	});
});
