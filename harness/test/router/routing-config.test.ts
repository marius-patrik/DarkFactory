import { expect, test } from "bun:test";
import { buildRouterCatalog } from "../../src/router/catalog.ts";

test("routing config filters providers and models", () => {
  const providers = [
    {
      id: "providerA",
      name: "Provider A",
      dialect: "openai-completions" as const,
      baseUrl: "https://example.com/a",
      auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" } as const],
      requiredCredentialSlots: [],
      models: { static: [{ id: "good" }] },
      capabilities: { tools: true, reasoning: true, images: false },
      routing: { enabled: false },
    },
    {
      id: "providerB",
      name: "Provider B",
      dialect: "openai-completions" as const,
      baseUrl: "https://example.com/b",
      auth: [{ kind: "api_key", slot: "api_key", placement: "bearer" } as const],
      requiredCredentialSlots: [],
      models: { static: [{ id: "bad-model" }, { id: "good-model" }] },
      capabilities: { tools: true, reasoning: true, images: false },
      routing: { exclude: ["bad*", "ignore"] },
    },
  ];
  const result = buildRouterCatalog({ providers });
  const ids = result.map((c) => `${c.candidate.provider}/${c.candidate.model}`);
  expect(ids).toEqual(["providerB/good-model"]);
});
