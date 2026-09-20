# Bootstrap provenance

This note records only that DarkFactory was originally bootstrapped through an earlier Python/GitHub-Actions implementation before the current df architecture was settled.

The original bootstrap runbook contained branch-specific commands, legacy credential setup, Python automation entrypoints, historical governance filenames and repository settings that are no longer valid operating instructions. Those executable instructions have been removed so historical provenance cannot be mistaken for current documentation.

Current authority is:

1. `PRD.md` — product requirements and architecture;
2. current Request bodies — feature-specific accepted behavior;
3. accepted ADRs under `.agents/notes/adr/`;
4. `PLAN.md` — completion sequencing and recovery disposition;
5. `.agents/rules/*.md` — contributor and automation rules;
6. `repo.df`, `config.df`, `docs.df` and the workflow graph — executable declarations.

The canonical DarkFactory branch is discovered from repository state/configuration; no historical branch name, Python script, credential bootstrap command or workflow name in earlier bootstrap material is a current contract.
