import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	buildReleaseArtifactManifest,
	renderSha256Sums,
	serializeReleaseArtifactManifest,
} from "./artifacts.ts";

const roots: string[] = [];

async function fixture(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "darkfactory-release-"));
	roots.push(root);
	await mkdir(join(root, "nested"), { recursive: true });
	await writeFile(join(root, "df"), "binary\n");
	await writeFile(join(root, "nested", "web.tar"), "web\n");
	return root;
}

afterEach(async () => {
	for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("release artifact manifest", () => {
	test("is deterministic regardless of caller file ordering", async () => {
		const root = await fixture();
		const options = {
			releaseVersion: "1.2.3",
			sourceCommit: "0123456789abcdef0123456789abcdef01234567",
		};
		const a = await buildReleaseArtifactManifest(root, ["nested/web.tar", "df"], options);
		const b = await buildReleaseArtifactManifest(root, ["df", "nested/web.tar"], options);
		expect(a).toEqual(b);
		expect(a.artifacts.map((item) => item.path)).toEqual(["df", "nested/web.tar"]);
		expect(a.artifacts.every((item) => /^[0-9a-f]{64}$/u.test(item.sha256))).toBe(true);
		expect(a.capabilityAbi).toBe("1");
		expect(serializeReleaseArtifactManifest(a)).toEndWith("\n");
	});

	test("renders portable sha256sum lines from the manifest", async () => {
		const root = await fixture();
		const manifest = await buildReleaseArtifactManifest(root, ["df"], {
			releaseVersion: "1.0.0",
			sourceCommit: "fedcba9876543210fedcba9876543210fedcba98",
		});
		const sums = renderSha256Sums(manifest);
		expect(sums).toMatch(/^[0-9a-f]{64}  df\n$/u);
	});

	test("rejects duplicate, absolute and escaping artifact inputs", async () => {
		const root = await fixture();
		const options = {
			releaseVersion: "1.0.0",
			sourceCommit: "0123456789abcdef0123456789abcdef01234567",
		};
		await expect(buildReleaseArtifactManifest(root, ["df", "./df"], options)).rejects.toThrow(
			"Duplicate release artifact",
		);
		await expect(buildReleaseArtifactManifest(root, [join(root, "df")], options)).rejects.toThrow(
			"repository-relative",
		);

		const outside = await mkdtemp(join(tmpdir(), "darkfactory-release-outside-"));
		roots.push(outside);
		await writeFile(join(outside, "secret"), "outside\n");
		await symlink(join(outside, "secret"), join(root, "escape"));
		await expect(buildReleaseArtifactManifest(root, ["escape"], options)).rejects.toThrow("escapes the release root");
	});

	test("rejects invalid version and abbreviated source provenance", async () => {
		const root = await fixture();
		await expect(
			buildReleaseArtifactManifest(root, ["df"], {
				releaseVersion: "latest",
				sourceCommit: "0123456789abcdef0123456789abcdef01234567",
			}),
		).rejects.toThrow("SemVer");
		await expect(
			buildReleaseArtifactManifest(root, ["df"], {
				releaseVersion: "1.0.0",
				sourceCommit: "deadbeef",
			}),
		).rejects.toThrow("full lowercase hexadecimal Git object id");
	});
});
