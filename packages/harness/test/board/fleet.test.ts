import { describe, expect, it } from "bun:test";
import { BoardAutomation } from "../../src/board/automation.ts";
import type { BoardDeclaration } from "../../src/board/declaration.ts";

/**
 * Which repositories board reconciliation may touch.
 *
 * This used to be `app.installed_on` — a hand-maintained list in `repo.dfconfig`. It had drifted to the
 * point of being wrong about repositories that no longer exist: at the time this was written, six entries
 * named **two deleted repositories** and **two more that had been renamed**. A name in a list resolves to
 * nothing rather than failing, so nothing reported it.
 *
 * The fix reads the fact from GitHub, which is where `install-sweep.yml` already reads it, and keeps the
 * declaration only as the fallback for a run with no credential to ask with.
 */
describe("the fleet board automation reconciles", () => {
	const declaration = (overrides: Partial<BoardDeclaration> = {}): BoardDeclaration => ({
		owner: "marius-patrik",
		repo: "DarkFactory",
		projectTitle: "DarkFactory",
		globalBoardTitle: "Global",
		linkedBoards: ["Global"],
		defaultBranch: "main",
		developmentBranch: "main",
		installedOn: ["marius-patrik/omnis"],
		app: {},
		...overrides,
	});

	const automation = (d: BoardDeclaration, env: Record<string, string | undefined> = {}) =>
		new BoardAutomation({ declaration: d, env: { GITHUB_REPOSITORY: "marius-patrik/DarkFactory", ...env } });

	it("scans this repository plus every other it is installed on", async () => {
		const scanned = await automation(declaration()).repositoriesToScan();

		expect(scanned).toEqual(["marius-patrik/DarkFactory", "marius-patrik/omnis"]);
	});

	it("includes the current repository even when the list omits it", async () => {
		// The list is a declaration about *other* repositories; forgetting to add this one would silently
		// stop a repository from repairing its own board.
		const scanned = await automation(declaration({ installedOn: [] })).repositoriesToScan();

		expect(scanned).toEqual(["marius-patrik/DarkFactory"]);
	});

	it("does not list a repository twice when the list repeats this one", async () => {
		const scanned = await automation(
			declaration({ installedOn: ["marius-patrik/DarkFactory", "marius-patrik/omnis"] }),
		).repositoriesToScan();

		expect(scanned).toEqual(["marius-patrik/DarkFactory", "marius-patrik/omnis"]);
	});

	// The defect. A deleted or renamed repository in the list is reconciled for a board nobody is using,
	// and the repository it was renamed to is never reached.
	it("falls back to the declaration when there is no credential to ask GitHub", async () => {
		// No App private key in the environment, so the lookup cannot run. Falling back is what makes a
		// board run without a credential still scope to the declared fleet rather than to nothing.
		expect(await automation(declaration()).installedRepositories()).toEqual([]);
		expect(await automation(declaration()).repositoriesToScan()).toContain("marius-patrik/omnis");
	});

	it("scans only this repository when there is neither a credential nor a list", async () => {
		// Narrower than intended, and the safe direction: a board carrying too little is repaired, a
		// board carrying another repository's items is not.
		expect(await automation(declaration({ installedOn: [] })).repositoriesToScan()).toEqual([
			"marius-patrik/DarkFactory",
		]);
	});

	it("keeps the declared list readable, as a fallback rather than a source", () => {
		// `installed_on` is now documentation of what the list used to be, and the value a run with no
		// credential uses. It is not deleted, because deleting it would silently change every such run.
		expect(declaration().installedOn).toEqual(["marius-patrik/omnis"]);
	});
});
