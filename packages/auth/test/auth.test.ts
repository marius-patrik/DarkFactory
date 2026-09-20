/** @packageDocumentation
 * Unit tests for `@darkfactory/auth` client and broker functions.
 */

import { expect, test, describe, beforeEach } from "bun:test";
import { initiateAuth, persistSession, restoreSession, clearSession } from "../src/client.ts";
import { TokenExchangeRequestSchema } from "../src/broker.ts";
import { TokenResponse } from "../src/types.ts";

describe("@darkfactory/auth", () => {
  beforeEach(() => {
    // Mock storage
    global.localStorage = {
      getItem: (key: string) => (global as any)._storage[key] || null,
      setItem: (key: string, value: string) => { (global as any)._storage[key] = value; },
      removeItem: (key: string) => { delete (global as any)._storage[key]; },
      clear: () => { (global as any)._storage = {}; },
    } as any;
    global.sessionStorage = {
      getItem: (key: string) => (global as any)._storage[key] || null,
      setItem: (key: string, value: string) => { (global as any)._storage[key] = value; },
      removeItem: (key: string) => { delete (global as any)._storage[key]; },
      clear: () => { (global as any)._storage = {}; },
    } as any;
    (global as any)._storage = {};
  });

  test("initiateAuth returns valid GitHub OAuth URL and sets session items", async () => {
    const url = await initiateAuth("test-client-id", "http://localhost/callback", "repo read:user");
    expect(url).toContain("https://github.com/login/oauth/authorize");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("code_challenge_method=S256");
    expect((global as any)._storage["df-auth-verifier"]).toBeDefined();
    expect((global as any)._storage["df-auth-state"]).toBeDefined();
  });

  test("session persistence works correctly", () => {
    const token: TokenResponse = {
      access_token: "gho_123",
      token_type: "bearer",
    };
    persistSession(token);
    expect(restoreSession()).toEqual(token);
    clearSession();
    expect(restoreSession()).toBeNull();
  });

  test("TokenExchangeRequestSchema validates request payloads", () => {
    const valid = {
      code: "abc",
      code_verifier: "ver",
      redirect_uri: "http://localhost/callback",
    };
    expect(TokenExchangeRequestSchema.parse(valid)).toEqual(valid);
  });
});
