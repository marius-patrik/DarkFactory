import { describe, expect, test } from "bun:test";
import { storeVaultKey, type CommandRunner } from "../../../packages/keychain/src/os-keychain.ts";

describe("native keychain atomic rotation", () => {
	test("macOS updates an existing key in place instead of deleting its only copy", async () => {
		const invocations: string[] = [];
		const runner: CommandRunner = async (cmd, args) => {
			invocations.push(`${cmd} ${args.join(" ")}`);
			return { stdout: "", exitCode: 0 };
		};
		await storeVaultKey("TEST-ONLY-NOT-A-KEY", {
			dfHome: "/unused",
			platform: "darwin",
			runner,
		});
		expect(invocations).toHaveLength(1);
		expect(invocations[0]).toContain("add-generic-password");
		expect(invocations[0]).toContain("-U");
		expect(invocations.join(" ")).not.toContain("delete-generic-password");
	});
});
