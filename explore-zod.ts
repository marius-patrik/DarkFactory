import { z } from "zod";
const schema = z.object({ name: z.string(), age: z.number() });
console.log(schema._def);
