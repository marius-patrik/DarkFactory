/**
 * Validate a value against a Zod schema.
 *
 * @param schema - The Zod schema to validate against. It is typed as `unknown`
 *                 to keep the API flexible, but must be a Zod schema with a
 *                 `safeParse` method.
 * @param value  - The value to validate.
 * @returns `true` if the value conforms to the schema, otherwise `false`.
 *
 * @throws If `schema` is not a Zod schema.
 */
export function validateCaptureSchema(schema: unknown, value: unknown): boolean {
  // Ensure the provided schema looks like a Zod schema.
  if (!schema || typeof schema !== "object" || !("safeParse" in schema)) {
    throw new Error("Provided schema is not a Zod schema");
  }

  // Cast to a minimal Zod type with safeParse.
  const anySchema = schema as { safeParse: (v: unknown) => { success: boolean } };
  const result = anySchema.safeParse(value);
  return result.success;
}
