# DarkFactory-Paper Agent Rules

## Canonical thesis identity

- Work title: **DarkFactory: Agentic Engineering in practice (Agentické inženýrství v praxi)**.
- Top-level manuscript sections are exactly **Úvod**, **Teoretická část**, **Praktická část**, and **Závěr**.
- DarkFactory is the practical system studied by the thesis.
- Folder `index.typ` manifests are the sole source of manuscript hierarchy.

## Canonical theory structure

Theory proceeds through:
1. Software Engineering
2. LLM
3. Harness
4. Agentic Engineering

**Harness Engineering is a child section of Agentic Engineering.** It is theoretical/disciplinary context, not a practical-part wrapper.

Within Harness:
- use **Session (Agentní sezení) [Agent Session]** for the session concept;
- preserve canonical industry-first terminology;
- do not reintroduce standalone Agentic AI, Agent, or Chatbot concepts.

The practical part is about the verified DarkFactory implementation and its results. Do not place Harness Engineering back under Practical.

## Writing rules

Write the thesis as concise technical prose. Every sentence must contribute at least one of:
- a definition,
- a mechanism,
- a distinction,
- a consequence,
- evidence,
- or a necessary relationship between concepts.

Delete prose that merely repeats a heading, restates the preceding sentence, provides generic motivation, or adds unsupported rhetorical framing.

Each concept must:
- have a precise definition that begins directly with its meaning;
- have only as much description as is needed to explain mechanism, distinction, consequence, or relation;
- use canonical `term(...)` references for other concepts;
- have correct semantic relations;
- be represented in the structural tree if it belongs in the thesis.

Do not use raw Typst bold emphasis in manuscript prose. Bold typography is reserved for structural/canonical rendering.

Accepted prose should remain clean source. Use review markers only for genuinely unresolved review work; do not wrap settled text in `#finalized`, `#accepted`, or mandatory diff markers.

## Citation policy

Use citations aggressively for externally verifiable claims, but do not add decorative citations to connective author prose.

Prefer sources in this order:
1. originating paper, formal standard, or protocol specification;
2. official first-party documentation;
3. original author/source for a coined term or historical claim;
4. peer-reviewed or otherwise authoritative secondary source when no suitable primary source exists.

Definitions, protocol behavior, mechanisms, historical claims, comparisons, quantitative claims, and claims about external systems should be cited. Use direct/primary sources whenever available and indirect/secondary sources only where necessary.

A citation must support the specific claim it follows. Do not cite a source merely because it is topically related.

Every theoretical concept should have appropriate source/citation metadata unless the text is explicitly an author-defined term. All citation handles must resolve through `DarkFactory/bib/references.bib`.

Practical implementation claims must be grounded in the actual `darkfactory/` submodule, repository workflows, tests, or measured results. Never infer implementation behavior from the planned architecture.

## Terminology

Canonical term metadata lives on the owning concept:
- `industry` — field-facing term or abbreviation;
- `czech` — Czech formal name;
- `english` — English formal name;
- `alias` — optional genuine alternate name.

The rendered full surface leads with the industry term, then Czech in parentheses, then distinct English in square brackets.

Stable concept keys are unique within the book. Do not duplicate a concept merely to introduce another spelling.

## Repository architecture

- `DarkFactory/` owns the complete book: concepts, manuscript, bibliography, images, templates, fonts, and metadata.
- `DarkFactory/index.typ` is the structural root and source of the human-facing work title.
- `manuscript/` owns document-level wrappers and practical/results content.
- `software-engineering/`, `language-models/`, and `agentic-engineering/` own their conceptual domains.
- `darkfactory/` is the only git submodule and is the implementation evidence source.
- Do not recreate parallel chapter trees, terminology registries, publication variants, or compatibility structures.

## Publication and validation

Canonical outputs:
- Final: `out/prace.pdf`, `out/prace.html`, `out/prace.md`
- Review: `out/prace-review.pdf`, `out/prace-review.html`, `out/prace-review.md`

Use:
```bash
make all BOOK=DarkFactory
make web-check
make ci BOOK=DarkFactory
make site BOOK=DarkFactory
```

Validation should assert positive final contracts: expected hierarchy, concept-key uniqueness, resolving relations/citations/assets, and valid publication artifacts. Do not add legacy-name or stale-path blacklists as a substitute for positive structure checks.

## Git workflow

Commit and push completed repository changes. Keep commits logically scoped. When the practical implementation snapshot changes, update the `darkfactory` submodule gitlink in the same work wave.
