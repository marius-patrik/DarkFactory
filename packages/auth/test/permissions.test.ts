/** @packageDocumentation
 * Unit tests for `@darkfactory/auth` permissions and mutation intents.
 */

import { expect, test, describe } from "bun:test";
import { projectAuthority, createMutationIntent } from "../src/permissions.ts";

describe("@darkfactory/auth permissions and intents", () => {
  test("projectAuthority correctly computes user privileges", () => {
    const authority = projectAuthority({ admin: true, push: true, pull: true }, "octocat");
    expect(authority.canRead).toBe(true);
    expect(authority.canMutate).toBe(true);
    expect(authority.isAdmin).toBe(true);
    expect(authority.userId).toBe("octocat");

    const readOnlyAuthority = projectAuthority({ admin: false, push: false, pull: true }, "observer");
    expect(readOnlyAuthority.canRead).toBe(true);
    expect(readOnlyAuthority.canMutate).toBe(false);
    expect(readOnlyAuthority.isAdmin).toBe(false);
  });

  test("createMutationIntent produces a valid attributed payload", () => {
    const intent = createMutationIntent("create_request", "octocat", { title: "New Feature" });
    expect(intent.action).toBe("create_request");
    expect(intent.actor).toBe("octocat");
    expect(intent.payload.title).toBe("New Feature");
    expect(intent.timestamp).toBeDefined();
  });
});
