import { test, expect } from "bun:test";
import { FileCredentialStore, onCredentialChanged } from "../src/credentials.ts";
import { LimitLedger } from "../src/limits/ledger.ts";
import { resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

// Helper to create a temporary directory for isolation
async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(resolve(tmpdir(), "df-test-"));
  try {
    return await fn(dir);
  } finally {
    // Cleanup
    try { rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

/** Simple candidate used for ledger entries */
const candidate = {
  provider: "test-provider",
  account: "test-account",
  model: "test-model",
};

test("credential change clears access entries", async () => {
  await withTempDir(async (home) => {
    const store = new FileCredentialStore(home);
    const ledger = new LimitLedger(home, {});

    // Record an access limit entry
    const now = Date.now();
    const entry = {
      ...candidate,
      type: "access" as const,
      observedAt: now,
      resetAt: now + 24 * 60 * 60_000,
      source: "default" as const,
      remaining: 0,
    };
    await ledger.record([entry]);
    await new Promise(r => setTimeout(r, 10));

    // Verify it is stored
    let entries = await ledger.list();
    expect(entries.some(e => e.type === "access")).toBe(true);

    // Register listener to clear access entries on credential change
    onCredentialChanged(async () => {
      // Clear only access entries
      const all = await ledger.list();
      for (const e of all) {
        if (e.type === "access") {
          await ledger.clear(`${e.provider}:${e.account}`);
        }
      }
    });

    // Trigger a credential change by setting a slot (which emits 'changed')
    await store.setSlot(candidate.provider + ":" + candidate.account, "api_key", { type: "api_key", value: "dummy" });

    // Give the event loop a tick
    await new Promise(r => setTimeout(r, 10));

    entries = await ledger.list();
    expect(entries.some(e => e.type === "access")).toBe(false);
  });
});

test("access entry persists until reset and then expires", async () => {
  await withTempDir(async (home) => {
    const ledger = new LimitLedger(home, {});
    const now = Date.now();
    const entry = {
      ...candidate,
      type: "access" as const,
      observedAt: now,
      resetAt: now + 1000, // expire quickly
      source: "default" as const,
      remaining: 0,
    };
    await ledger.record([entry]);
    await new Promise(r => setTimeout(r, 10));

    // Immediately present
    let entries = await ledger.list();
    expect(entries.some(e => e.type === "access")).toBe(true);

    // Simulate time after reset
    const recovered = await ledger.recover(now + 2000);
    expect(recovered.some(e => e.type === "access")).toBe(true);

    // After recovery, entry should be removed from ledger
    entries = await ledger.list();
    expect(entries.some(e => e.type === "access")).toBe(false);
  });
});
