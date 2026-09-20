/** @packageDocumentation
 * Shared types for authentication.
 */
import { z } from "zod";

/**
 * Token response schema representing access and refresh tokens.
 */
export const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string().optional(),
  expires_in: z.number().optional(),
  token_type: z.string(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;
