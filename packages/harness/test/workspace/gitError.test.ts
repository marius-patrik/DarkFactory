import { describe, expect, it } from "bun:test";
import { GitAuthError, GitConflictError, GitNetworkError, parseGitError } from "../../src/workspace/gitErrors.ts";

describe("Git Error Parser", () => {
	it("should identify Auth errors", () => {
		const err = parseGitError("Authentication failed");
		expect(err).toBeInstanceOf(GitAuthError);
	});

	it("should identify Network errors", () => {
		const err = parseGitError("fatal: unable to access");
		expect(err).toBeInstanceOf(GitNetworkError);
	});

	it("should identify Conflict errors", () => {
		const err = parseGitError("fix conflicts");
		expect(err).toBeInstanceOf(GitConflictError);
	});

	it("should return generic Error for unknown", () => {
		const err = parseGitError("some random error");
		expect(err).not.toBeInstanceOf(GitAuthError);
		expect(err).not.toBeInstanceOf(GitNetworkError);
		expect(err).not.toBeInstanceOf(GitConflictError);
		expect(err).toBeInstanceOf(Error);
	});
});
