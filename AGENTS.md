# Repository instructions — DarkFactory-Paper

`GOAL.md` defines the quality objective for the finished academic paper.

`PRD.md` defines the finished repository/publication product contract.

`PLAN.md` defines the roadmap, workstreams, sequencing, and phase gates.

`TODO.md` defines the current/next actionable queue.

`BACKLOG.md` records accepted work that is intentionally deferred.

`SCHOOL_RULES.md` defines the school-compliance contract and unresolved compliance conflicts.

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

Optimize the manuscript for the final-paper quality standard in `GOAL.md` and the thesis-specific direction in `PRD.md`, including the chatbot-to-agent boundary, the IDE-to-harness shift, and Agentic Engineering as the practices that make AI-assisted software engineering effective, efficient, controlled, and scalable.

Treat available prose, terminology, figures, citations, and evidence as material for the final argument rather than as a structure that must be preserved.

Use:
- connected academic prose;
- meaningful structural headings;
- concise explanation;
- rigorous claim-local citations;
- original research/specifications and first-party documentation where appropriate;
- verified DarkFactory implementation evidence for practical claims.

When explaining the transition to coding agents, connect capabilities such as Tools, Skills, Hooks, MCP, persistent state, verification, and orchestration to the harness/runtime instead of presenting them as a terminology catalogue.

When explaining Agentic Engineering, focus on practices: prompt/context engineering, explicit goals and acceptance criteria, iterative goal loops, tool/harness design, verification feedback, multi-agent orchestration (including subagents, parallel workers, swarms, and graph/workflow execution where relevant), and human review/integration.

Use:
- `GOAL.md` for the final-paper quality standard;
- `PRD.md` for durable product/thesis requirements;
- `PLAN.md` for roadmap, sequencing, and workstream ownership;
- `TODO.md` for current/next actionable work;
- `BACKLOG.md` for deferred accepted work.

When a durable decision changes, update the owning document rather than duplicating it elsewhere. Keep `README.md` aligned with this document model.

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
