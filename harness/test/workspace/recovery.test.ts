import { afterEach, expect, test } from "bun:test";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { intakeRecoveryWork, scanForSecrets, provePlanApplies } from "../../src/workspace/recovery.ts";
import { runGit } from "../../src/workspace/git.ts";
import { createTempRepo, type TempRepo, TEST_IDENTITY } from "./helpers.ts";

let temp: TempRepo | undefined;

afterEach(() => {
	temp?.cleanup();
	temp = undefined;
});

test("intakeRecoveryWork imports a clean local branch preserving exact provenance and content", async () => {
	temp = createTempRepo();
	// Create a feature branch with some work
	runGit(temp.repo, ["checkout", "-b", "feature/recovered"]);
	writeFileSync(join(temp.repo, "feature.txt"), "hello recovered work");
	runGit(temp.repo, ["add", "feature.txt"]);
	runGit(temp.repo, ["commit", "-m", "add feature"], { env: TEST_IDENTITY });

	const provenance = await intakeRecoveryWork({
		repo: temp.repo,
		sourceRef: "feature/recovered",
		targetRequests: ["#388"],
		base: "main",
		workRoot: temp.workRoot,
	});

	expect(provenance.targetRequests).toEqual(["#388"]);
	expect(provenance.originalRef).toBe("feature/recovered");
	expect(provenance.recoveryBranch).toContain("recovery/388");
	expect(provenance.recoverySHA).toBeDefined();
	expect(provenance.dirtyUntrackedSnapshotId).toBeUndefined();
});

test("intakeRecoveryWork captures dirty tracked changes and untracked implementation bytes in a snapshot", async () => {
	temp = createTempRepo();
	runGit(temp.repo, ["checkout", "-b", "feature/dirty"]);
	
	// Dirty tracked change
	writeFileSync(join(temp.repo, "README.md"), "# modified content");
	// Untracked bytes
	writeFileSync(join(temp.repo, "untracked.txt"), "untracked file content");

	const provenance = await intakeRecoveryWork({
		repo: temp.repo,
		sourceRef: "feature/dirty",
		targetRequests: ["#388"],
		base: "main",
		workRoot: temp.workRoot,
	});

	expect(provenance.dirtyUntrackedSnapshotId).toBeDefined();
	expect(provenance.recoverySHA).toBeDefined();
	expect(provenance.targetRequests).toEqual(["#388"]);
});

test("scanForSecrets and intakeRecoveryWork block secret-bearing material", async () => {
	temp = createTempRepo();
	runGit(temp.repo, ["checkout", "-b", "feature/secrets"]);
	
	// Add secret-bearing file
	writeFileSync(join(temp.repo, "config.json"), '{"api_key": "sk-live-abcdef0123456789abcdef0123456789"}');
	runGit(temp.repo, ["add", "config.json"]);
	runGit(temp.repo, ["commit", "-m", "add config with secret"], { env: TEST_IDENTITY });

	expect(scanForSecrets('Bearer sk-proj-1234567890abcdef')).toBe(true);
	expect(scanForSecrets('normal plain text')).toBe(false);

	let errorThrown = false;
	try {
		await intakeRecoveryWork({
			repo: temp.repo,
			sourceRef: "feature/secrets",
			targetRequests: ["#388"],
			base: "main",
			workRoot: temp.workRoot,
		});
	} catch (error) {
		errorThrown = true;
		expect((error as Error).message).toContain("Secret/sensitive-data check BLOCKED push");
	}
	expect(errorThrown).toBe(true);
});

test("provePlanApplies correctly validates plan applicability against base and recovery SHA", async () => {
	temp = createTempRepo();
	runGit(temp.repo, ["checkout", "-b", "feature/plan"]);
	writeFileSync(join(temp.repo, "file.txt"), "content");
	runGit(temp.repo, ["add", "file.txt"]);
	runGit(temp.repo, ["commit", "-m", "commit"], { env: TEST_IDENTITY });

	const provenance = await intakeRecoveryWork({
		repo: temp.repo,
		sourceRef: "feature/plan",
		targetRequests: ["#388"],
		base: "main",
		workRoot: temp.workRoot,
	});

	const validPlan = {
		baseSHA: provenance.currentCanonicalBase,
		recoverySHA: provenance.recoverySHA,
	};
	const invalidPlan = {
		baseSHA: "old-base-sha",
		recoverySHA: provenance.recoverySHA,
	};

	expect(provePlanApplies(provenance, validPlan)).toBe(true);
	expect(provePlanApplies(provenance, invalidPlan)).toBe(false);
});

test("intakeRecoveryWork preserves multiple target Request bindings and full provenance records", async () => {
	temp = createTempRepo();
	runGit(temp.repo, ["checkout", "-b", "feature/multi"]);
	writeFileSync(join(temp.repo, "multi.txt"), "shared work");
	runGit(temp.repo, ["add", "multi.txt"]);
	runGit(temp.repo, ["commit", "-m", "multi request commit"], { env: TEST_IDENTITY });

	const provenance = await intakeRecoveryWork({
		repo: temp.repo,
		sourceRef: "feature/multi",
		targetRequests: ["#385", "#388"],
		base: "main",
		workRoot: temp.workRoot,
	});

	expect(provenance.targetRequests).toEqual(["#385", "#388"]);
	expect(provenance.originalPath).toBe(temp.repo);
	expect(provenance.originalRef).toBe("feature/multi");
	expect(provenance.originalHEAD).toBeDefined();
	expect(provenance.recoveryBranch).toContain("recovery/385-388");
	expect(provenance.recoverySHA).toBeDefined();
	expect(provenance.currentCanonicalBase).toBeDefined();
});

