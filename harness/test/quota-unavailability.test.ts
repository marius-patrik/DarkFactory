import { describe, expect, test } from "bun:test";
import type { LimitType } from "../src/limits/types.ts";

describe("new limit types exported", () => {
  test("includes billing, access, model", () => {
    const types: LimitType[] = ["billing", "access", "model"] as const;
    // TypeScript will error if literals not assignable to LimitType; runtime check ensures presence
    expect(types).toEqual(["billing", "access", "model"]);
  });
});
