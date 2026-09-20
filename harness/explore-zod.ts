import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
const schema = z.object({ name: z.string(), age: z.number() });
console.log(zodToJsonSchema(schema));
