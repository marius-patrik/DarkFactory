import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	type AssistantMessage,
	type Context,
	fauxAssistantMessage,
	fauxProvider,
	fauxToolCall,
} from "@earendil-works/pi-ai";
import { z } from "zod";
import type { Candidate } from "../src/failover.ts";
import { CAPTURE_TOOL_NAME } from "../src/harness/capture-request.ts";
import {
	alignmentResultSchema,
	CaptureError,
	captureCodeResult,
	extractJudgementResult,
	planningResultSchema,
	reviewResultSchema,
} from "../src/harness/result-capture.ts";
import { createFailoverSupervisor } from "../src/harness/supervisor.ts";
import { runGit } from "../src/workspace/git.ts";

describe("result-capture: judgement prose extraction and failover", () => {
	const sampleSchema = z.object({
		summary: z.string(),
		confidence: z.number(),
	});

	test("extracts structured judgement from natural prose on natural stop", async () => {
		const answerProse = "I analyzed the task and resolved all items cleanly with 95% confidence.";
		const mockCandidate: Candidate = { provider: "google", model: "gemini-3.8-flash", account: "default" };

		const runner = async (_candidate: Candidate, context: Context): Promise<AssistantMessage> => {
			expect(context.messages[0]?.content).toBe(answerProse);
			return {
				role: "assistant",
				stopReason: "stop",
				content: [
					{
						type: "toolCall",
						name: CAPTURE_TOOL_NAME,
						arguments: { summary: "Resolved all items", confidence: 0.95 },
					},
				],
			} as unknown as AssistantMessage;
		};

		const result = await extractJudgementResult({
			answer: answerProse,
			schema: sampleSchema,
			runExtractionTurn: runner,
			candidates: [mockCandidate],
		});

		expect(result.value).toEqual({ summary: "Resolved all items", confidence: 0.95 });
		expect(result.model).toBe("gemini-3.8-flash");
		expect(result.attempts).toHaveLength(0);
	});

	test("fails over when candidate schema validation fails", async () => {
		const answerProse = "Natural model completion output";
		const candidate1: Candidate = { provider: "google", model: "model-bad", account: "default" };
		const candidate2: Candidate = { provider: "google", model: "model-good", account: "default" };

		let turnCount = 0;
		const runner = async (candidate: Candidate): Promise<AssistantMessage> => {
			turnCount++;
			if (candidate.model === "model-bad") {
				return {
					role: "assistant",
					stopReason: "stop",
					content: [
						{
							type: "toolCall",
							name: CAPTURE_TOOL_NAME,
							arguments: { summary: "Bad confidence", confidence: "high" }, // invalid type
						},
					],
				} as unknown as AssistantMessage;
			}
			return {
				role: "assistant",
				stopReason: "stop",
				content: [
					{
						type: "toolCall",
						name: CAPTURE_TOOL_NAME,
						arguments: { summary: "Good result", confidence: 0.9 },
					},
				],
			} as unknown as AssistantMessage;
		};

		const result = await extractJudgementResult({
			answer: answerProse,
			schema: sampleSchema,
			runExtractionTurn: runner,
			candidates: [candidate1, candidate2],
		});

		expect(turnCount).toBe(2);
		expect(result.value).toEqual({ summary: "Good result", confidence: 0.9 });
		expect(result.model).toBe("model-good");
		expect(result.attempts).toHaveLength(1);
		expect(result.attempts[0]?.model).toBe("model-bad");
		expect(result.attempts[0]?.error).toContain("schema validation failed");
	});

	test("throws CaptureError when all candidates fail without capture tool call", async () => {
		const answerProse = "Plain text only without structured capture call";
		const candidate: Candidate = { provider: "google", model: "model-plain", account: "default" };

		const runner = async (): Promise<AssistantMessage> => {
			return {
				role: "assistant",
				stopReason: "stop",
				content: [{ type: "text", text: "I did not call any tools." }],
			} as unknown as AssistantMessage;
		};

		await expect(
			extractJudgementResult({
				answer: answerProse,
				schema: sampleSchema,
				runExtractionTurn: runner,
				candidates: [candidate],
			}),
		).rejects.toThrow(CaptureError);
	});

	test("extracts structured judgement via FailoverSupervisor", async () => {
		const root = await mkdtemp(join(tmpdir(), ".supervisor-extract-"));
		try {
			const home = join(root, "home");
			const cwd = join(root, "workspace");
			mkdirSync(home, { recursive: true });
			mkdirSync(cwd, { recursive: true });

			const faux = fauxProvider({ provider: "mock-google", models: [{ id: "flash" }] });
			faux.setResponses([
				fauxAssistantMessage([
					fauxToolCall(CAPTURE_TOOL_NAME, { summary: "Supervisor extracted", confidence: 0.99 }),
				]),
			]);

			const supervisor = await createFailoverSupervisor({
				chain: [{ provider: "mock-google", model: "flash", account: "default" }],
				home,
				cwd,
				providers: [faux.provider],
				authOptionalProviders: ["mock-google"],
			});

			const result = await extractJudgementResult({
				answer: "Extracted by supervisor from natural text",
				schema: sampleSchema,
				supervisor,
			});

			expect(result.value).toEqual({ summary: "Supervisor extracted", confidence: 0.99 });
			expect(result.model).toBe("flash");
			expect(result.provider).toBe("mock-google");
			expect(result.account).toBe("default");
			supervisor.session.dispose();
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

describe("result-capture: canonical schemas", () => {
	test("reviewResultSchema validates clean and unclean reviews", () => {
		const cleanReview = {
			findings: [],
			clean: true,
		};
		expect(reviewResultSchema.safeParse(cleanReview).success).toBe(true);

		const findingsReview = {
			findings: [
				{
					id: "F1",
					category: "architecture",
					severity: "warning",
					message: "Missing inline docstring",
					location: "src/index.ts:10",
				},
			],
			clean: false,
			deviation_detected: true,
		};
		expect(reviewResultSchema.safeParse(findingsReview).success).toBe(true);
	});

	test("planningResultSchema validates plan output", () => {
		const plan = {
			summary: "Plan for feature",
			approach: "Step by step implementation",
			dependencies: ["#341"],
			verification_plan: "Run bun test",
		};
		expect(planningResultSchema.safeParse(plan).success).toBe(true);
	});

	test("alignmentResultSchema validates plan alignment", () => {
		const alignment = {
			aligned: true,
			rationale: "Implementation matches approved plan",
		};
		expect(alignmentResultSchema.safeParse(alignment).success).toBe(true);
	});
});

describe("result-capture: code-node truth from observed workspace evidence", () => {
	let testRepo: string;

	beforeEach(() => {
		testRepo = join(tmpdir(), `df-test-code-node-${Math.random().toString(36).slice(2)}`);
		mkdirSync(testRepo, { recursive: true });
		runGit(testRepo, ["init", "-b", "main"]);
		runGit(testRepo, ["config", "user.name", "Test"]);
		runGit(testRepo, ["config", "user.email", "test@example.com"]);
		writeFileSync(join(testRepo, "initial.txt"), "hello world\n");
		runGit(testRepo, ["add", "initial.txt"]);
		runGit(testRepo, ["commit", "-m", "initial commit"]);
	});

	afterEach(() => {
		rmSync(testRepo, { recursive: true, force: true });
	});

	test("derives code node truth from modified files and creates deterministic commit", async () => {
		writeFileSync(join(testRepo, "feature.ts"), "export const x = 1;\n");
		const result = await captureCodeResult({
			worktree: testRepo,
			allowedPatterns: ["**/*.ts"],
			commitMessage: "feat: add feature file",
			identity: { name: "Agent Bot", email: "bot@example.com" },
		});

		expect(result.outcome).toBe("success");
		expect(result.changedFiles).toEqual(["feature.ts"]);
		expect(result.commitSha).toBeDefined();
		expect(typeof result.commitSha).toBe("string");
	});

	test("rejects out-of-scope changes even if model claimed success", async () => {
		writeFileSync(join(testRepo, "unexpected.txt"), "rogue change\n");
		const result = await captureCodeResult({
			worktree: testRepo,
			allowedPatterns: ["src/**/*.ts"],
		});

		expect(result.outcome).toBe("failure");
		expect(result.error).toContain("Scope violation");
		expect(result.scopeCheck?.outside).toContain("unexpected.txt");
	});

	test("rejects when required test files were untouched", async () => {
		writeFileSync(join(testRepo, "src.ts"), "code\n");
		const result = await captureCodeResult({
			worktree: testRepo,
			allowedPatterns: ["**/*.ts"],
			requiredTests: ["test/required.test.ts"],
		});

		expect(result.outcome).toBe("failure");
		expect(result.error).toContain("Required test files untouched");
	});
});

describe("result-capture: prompt cleanliness and natural stop", () => {
	test("prompt cleanliness: default task prompts do not require submit tool or JSON", () => {
		const defaultPrompt = "Implement the requested feature in accordance with repository guidelines.";
		expect(defaultPrompt).not.toContain("submit tool");
		expect(defaultPrompt).not.toContain("call tool 'submit'");
		expect(defaultPrompt).not.toContain("output valid JSON only");
	});
});

describe("result-capture: offline --capture-schema CLI", () => {
	test("df run --capture-schema prints registered schemas and exits 0 without network", async () => {
		const proc = Bun.spawn(["bun", "src/cli.ts", "run", "--capture-schema"], {
			cwd: join(import.meta.dir, ".."),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		expect(exitCode).toBe(0);
		const parsed = JSON.parse(stdout);
		expect(parsed.review).toBeDefined();
		expect(parsed.planning).toBeDefined();
		expect(parsed.alignment).toBeDefined();
	});

	test("df run --capture-schema review prints specific JSON schema", async () => {
		const proc = Bun.spawn(["bun", "src/cli.ts", "run", "--capture-schema", "review"], {
			cwd: join(import.meta.dir, ".."),
			stdout: "pipe",
			stderr: "pipe",
		});
		const [stdout, exitCode] = await Promise.all([new Response(proc.stdout).text(), proc.exited]);
		expect(exitCode).toBe(0);
		const parsed = JSON.parse(stdout);
		expect(parsed.type).toBe("object");
		expect(parsed.properties.findings).toBeDefined();
		expect(parsed.properties.clean).toBeDefined();
	});
});
