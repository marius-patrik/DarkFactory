import { describe, expect, it } from "bun:test";
import { botCommitAuthor, renderAttribution } from "../../src/identities/index.ts";
import type { ManifestIdentities } from "../../src/identities/types.ts";

const sampleIdentities: ManifestIdentities = {
	app: {
		slug: "darkfactory-pipeline",
		login: "darkfactory-pipeline[bot]",
		user_id: 326069535,
		commit_author_email: "326069535+darkfactory-pipeline[bot]@users.noreply.github.com",
	},
	providers: {
		claude: {
			name: "Claude",
			display_name: "Claude",
			trailer: "Co-authored-by: Claude <noreply@anthropic.com>",
			note: "Generated with {model}",
			account_link: "https://github.com/claude",
			verified: true,
		},
		codex: {
			name: "Codex",
			display_name: "Codex",
			trailer: "Co-authored-by: Codex <noreply@openai.com>",
			note: "Generated with {model}",
			account_link: "https://github.com/codex",
			verified: true,
		},
		"openai-codex": {
			name: "Codex",
			display_name: "Codex",
			trailer: "Co-authored-by: Codex <noreply@openai.com>",
			note: "Generated with {model}",
			account_link: "https://github.com/codex",
			verified: true,
		},
		google: {
			name: "Gemini",
			display_name: "Gemini",
			trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
			note: "Generated with {model}",
			account_link: "https://github.com/gemini-code-assist",
			verified: true,
		},
		antigravity: {
			name: "Gemini",
			display_name: "Gemini",
			trailer: "Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
			note: "Generated with {model}",
			account_link: "https://github.com/gemini-code-assist",
			verified: true,
		},
		"grok-sub": {
			name: "Grok",
			display_name: "Grok",
			trailer: null,
			note: "Generated with {model}",
			account_link: null,
			verified: false,
		},
		groq: {
			name: "Groq",
			display_name: "Groq",
			trailer: null,
			note: "Generated with {model}",
			account_link: null,
			verified: false,
		},
		openrouter: {
			name: "OpenRouter",
			display_name: "OpenRouter",
			trailer: null,
			note: "Generated with {model}",
			account_link: null,
			verified: false,
		},
		"opencode-zen": {
			name: "OpenCode Zen",
			display_name: "OpenCode Zen",
			trailer: null,
			note: "Generated with {model}",
			account_link: null,
			verified: false,
		},
		kimi: {
			name: "Kimi",
			display_name: "Kimi",
			trailer: null,
			note: "Generated with {model}",
			account_link: null,
			verified: false,
		},
	},
};

describe("renderAttribution", () => {
	it("emits trailer set for verified providers", () => {
		const usedCandidates = [
			{ provider: "google", model: "gemini-3.8-flash" },
			{ provider: "claude", model: "claude-3-5-sonnet" },
			{ provider: "codex", model: "gpt-5.6-luna" },
		];

		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.trailers).toEqual([
			"Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
			"Co-authored-by: Claude <noreply@anthropic.com>",
			"Co-authored-by: Codex <noreply@openai.com>",
		]);
		expect(result.footer).toBe("Generated with gemini-3.8-flash, claude-3-5-sonnet, gpt-5.6-luna");
	});

	it("emits note-only for unverified providers (never a trailer)", () => {
		const usedCandidates = [
			{ provider: "grok-sub", model: "grok-4.6" },
			{ provider: "groq", model: "llama-3.3-70b-versatile" },
			{ provider: "openrouter", model: "nemotron-3-ultra-550b-a55b:free" },
			{ provider: "opencode-zen", model: "big-pickle" },
			{ provider: "kimi", model: "kimi-for-coding" },
		];

		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.trailers).toEqual([]);
		expect(result.footer).toBe(
			"Generated with grok-4.6, llama-3.3-70b-versatile, nemotron-3-ultra-550b-a55b:free, big-pickle, kimi-for-coding",
		);
	});

	it("deduplicates trailers across failover within the same provider", () => {
		const usedCandidates = [
			{ provider: "google", model: "gemini-3.8-flash" },
			{ provider: "google", model: "gemini-3.7-flash" },
			{ provider: "google", model: "gemini-3.6-flash" },
		];

		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.trailers).toEqual([
			"Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
		]);
		expect(result.footer).toBe("Generated with gemini-3.8-flash, gemini-3.7-flash, gemini-3.6-flash");
	});

	it("deduplicates trailers across alias providers resolving to the same identity", () => {
		const usedCandidates = [
			{ provider: "codex", model: "gpt-5.6-luna" },
			{ provider: "openai-codex", model: "gpt-5.6-luna-mini" },
		];

		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.trailers).toEqual([
			"Co-authored-by: Codex <noreply@openai.com>",
		]);
		expect(result.footer).toBe("Generated with gpt-5.6-luna, gpt-5.6-luna-mini");
	});

	it("lists all models in order in the footer", () => {
		const usedCandidates = [
			{ provider: "google", model: "gemini-3.8-flash" },
			{ provider: "openrouter", model: "nemotron-3-ultra-550b-a55b:free" },
			{ provider: "openai-codex", model: "gpt-5.6-luna" },
		];

		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.footer).toBe(
			"Generated with gemini-3.8-flash, nemotron-3-ultra-550b-a55b:free, gpt-5.6-luna",
		);
		// Verified providers emit trailers, unverified does not
		expect(result.trailers).toEqual([
			"Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
			"Co-authored-by: Codex <noreply@openai.com>",
		]);
	});

	it("handles a single candidate correctly", () => {
		const usedCandidates = [{ provider: "google", model: "gemini-3.8-flash" }];
		const result = renderAttribution(usedCandidates, sampleIdentities);

		expect(result.trailers).toEqual([
			"Co-authored-by: Gemini <200291788+gemini-code-assist@users.noreply.github.com>",
		]);
		expect(result.footer).toBe("Generated with gemini-3.8-flash");
	});

	it("handles empty candidate list", () => {
		const result = renderAttribution([], sampleIdentities);
		expect(result.trailers).toEqual([]);
		expect(result.footer).toBe("");
	});

	it("throws error for candidate with unknown provider", () => {
		expect(() =>
			renderAttribution([{ provider: "unknown-provider", model: "model-x" }], sampleIdentities),
		).toThrow("unknown-provider");
	});
});

describe("botCommitAuthor", () => {
	it("formats canonical bot author string from manifest identities", () => {
		const author = botCommitAuthor(sampleIdentities);
		expect(author).toBe(
			"darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>",
		);
	});

	it("falls back to user_id+login@users.noreply.github.com when email omitted", () => {
		const author = botCommitAuthor({
			...sampleIdentities,
			app: {
				slug: "darkfactory-pipeline",
				login: "darkfactory-pipeline[bot]",
				user_id: 326069535,
			},
		});
		expect(author).toBe(
			"darkfactory-pipeline[bot] <326069535+darkfactory-pipeline[bot]@users.noreply.github.com>",
		);
	});
});
