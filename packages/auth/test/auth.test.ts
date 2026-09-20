import { expect, test } from "bun:test";
import { AuthClient } from "../src/index.ts";

test("AuthClient initiates login with PKCE", async () => {
  const client = new AuthClient({
    clientId: "test-client-id",
    brokerUrl: "https://broker.test",
    redirectUri: "https://app.test/callback",
  });

  const { url, state, codeVerifier } = await client.initiateLogin();

  expect(url).toContain("https://github.com/login/oauth/authorize");
  expect(url).toContain("client_id=test-client-id");
  expect(url).toContain(`state=${state}`);
  expect(url).toContain("code_challenge_method=S256");
  expect(state.length).toBeGreaterThan(0);
  expect(codeVerifier.length).toBeGreaterThan(0);
});
