import { describe, test, expect } from "bun:test";
import { validateCaptureSchema } from "../src/harness/result-capture.ts";
import { z } from "zod";

describe("validateCaptureSchema", () => {
  const schema = z.object({
    name: z.string(),
    age: z.number().int().nonnegative(),
    tags: z.array(z.string()).optional(),
  });

  test("returns true for matching payload", () => {
    const payload = { name: "Alice", age: 30, tags: ["admin", "user"] };
    expect(validateCaptureSchema(schema, payload)).toBe(true);
  });

  test("returns false for mismatched payload", () => {
    const payload = { name: "Bob", age: "thirty" };
    expect(validateCaptureSchema(schema, payload)).toBe(false);
  });

  test("throws on non‑Zod schema", () => {
    const badSchema = { not: "a schema" };
    const payload = { name: "Carol", age: 25 };
    expect(() => validateCaptureSchema(badSchema as any, payload)).toThrow();
  });
});
