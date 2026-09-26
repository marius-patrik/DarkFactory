/** @packageDocumentation
 * DarkFactory execution kernel: repository evidence, capture and recovery primitives.
 *
 * This barrel is package-local on purpose. It previously re-exported `harness/src/config.ts`,
 * `harness/src/graph/index.ts` and `harness/src/harness/supervisor.ts`, which made
 * `@darkfactory/core` depend on the deletion-bound harness tree while the harness depends on
 * `@darkfactory/core` — a cycle in the source graph that the manifest-level acyclicity check could
 * not see, because `harness` is a workspace rather than a declared dependency of this package.
 *
 * DF-RULE-017 forbids a final package forwarding implementation to the legacy tree. Anything that
 * genuinely belongs to a package is exported from the package that owns it, and the harness reaches
 * it through the workspace dependency rather than the other way round.
 *
 * The relocation of the remaining harness code is tracked in the v1 delivery graph; when it lands
 * these symbols are already owned here and no forwarding is needed.
 */
export * from "./recovery.ts";
export * from "./repository-evidence.ts";
export * from "./result-capture.ts";
