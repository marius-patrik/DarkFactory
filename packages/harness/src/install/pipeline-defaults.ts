/**
 * Where the pipeline lives when the caller names nowhere.
 *
 * This module is deliberately a leaf with no imports. `install/manifest-generation.ts` imports
 * `install/callers.ts`, which imports `ci/templates.ts`, so the template renderer already sits
 * below the manifest builder. Reading these constants out of `manifest-generation.ts` therefore
 * closes that cycle, and a cycle here would make template rendering depend on module-init order.
 */

/** The repository holding the pipeline when the caller names none. */
export const DEFAULT_PIPELINE_REPO = "marius-patrik/DarkFactory";

/**
 * The pipeline ref to use when the caller names none.
 *
 * The pipeline repository is this one, so its default branch is declared in `repo.dfconfig` as
 * `repo.identity.default_branch`. A test asserts this constant equals that value so the two cannot
 * drift apart, which is exactly how they drifted before.
 *
 * This used to be the literal `"darkfactory"` — a branch that does not exist. `installer.ts` omits
 * `pipeline_ref` from the template context whenever `repo.upstream.ref` is null, which it is for
 * this repository, so every consumer that installed without naming a ref had its workflows rendered
 * to `uses: marius-patrik/DarkFactory/.github/workflows/agent.yml@darkfactory` and
 * `ref: "darkfactory"`. Neither resolves: the dispatch job cannot find the workflow and the pinned
 * runtime checkout fails.
 */
export const DEFAULT_PIPELINE_REF = "main";
