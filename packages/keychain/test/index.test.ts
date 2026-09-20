import { expect, test, describe } from "bun:test";
import {
	accountId,
	parseAccountId,
	validateAccountRecord,
} from "../src/index.js";

describe("keychain index", () => {
	test("accountId and parseAccountId are inverses", () => {
		const id = accountId("google", "work");
		expect(id).toBe("google:work");
		const parsed = parseAccountId(id);
		expect(parsed).toEqual({ provider: "google", label: "work" });
	});

	test("validateAccountRecord validates complete record", () => {
		const record = {
			id: "google:work",
			provider: "google",
			label: "work",
			slots: {
				api_key: { type: "api_key", value: "secret-key" }
			}
		};
		const validated = validateAccountRecord(record);
		expect(validated.id).toBe("google:work");
	});
});
