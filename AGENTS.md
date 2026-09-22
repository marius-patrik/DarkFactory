# Repository instructions — DarkFactory-Paper

`GOAL.md` defines the quality objective for the finished academic paper.

`PRD.md` defines the finished repository/publication product contract.

`PLAN.md` defines the concrete execution path.

`SCHOOL_RULES.md` defines the school-compliance contract.

`web/PLAN.md` defines the independent generic IDE workstream.

## Thesis source

`paper/PAPER.typ` is the single canonical authored thesis source.

Supporting resources may live in:
- `paper/bib/`
- `paper/data/`
- `paper/img/`
- `paper/fonts/`

Keep manuscript ownership singular: one authored Typst source plus supporting resources.

## Editorial rule

Optimize the manuscript for the final-paper quality standard in `GOAL.md` and the thesis-specific direction in `PRD.md`, including the shift from IDE-centered software engineering to harness-centered Agentic Engineering.

Treat available prose, terminology, figures, citations, and evidence as material for the final argument rather than as a structure that must be preserved.

Use:
- connected academic prose;
- meaningful structural headings;
- concise explanation;
- rigorous claim-local citations;
- original research/specifications and first-party documentation where appropriate;
- verified DarkFactory implementation evidence for practical claims.

Use `PRD.md` for product requirements and `PLAN.md` for sequencing/file ownership.

## Practical evidence

DarkFactory-specific claims must be tied to one pinned canonical DarkFactory revision and reproducible evidence.

The `darkfactory` submodule, evidence manifest, manuscript, and Results must agree on the evaluated revision.

## School compliance

Use `SCHOOL_RULES.md`.

Resolve unverified school-sensitive requirements from the direct guide text before final publication.

## Validation and review

Use the canonical commands defined by the repository build system and keep CI/documentation aligned with those commands.

Every substantial implementation phase ends in an open pull request for review.

Workers do not merge their own pull requests.
