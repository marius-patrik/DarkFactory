---
name: author-skill
description: Use when writing or editing a SKILL.md that must load correctly in Claude Code, Codex, opencode and pi, or when a skill is rejected by one of them.
license: MIT
---

# Author a skill

A skill is `SKILL.md` under `plugins/<plugin>/skills/<name>/`. It is the one artefact all four
hosts load, so its frontmatter is an intersection, not a superset. Read
`references/four-hosts.md` for the full table before porting anything.

## Frontmatter

Two keys, no more:

```markdown
---
name: czech-academic-prose
description: Use when writing, editing or reviewing Czech academic prose for the thesis.
license: MIT
---
```

- `name` must equal the directory name, be lowercase kebab-case, and stay under 64 characters.
- `description` is **load-bearing**: Codex and pi refuse to load a skill without one. Open with
  "Use when" and front-load the keywords, because Codex truncates the listing at 8,000 characters
  and shortens descriptions first.
- Nothing else. A Claude-only key is ignored by three hosts and hard-errors on claude.ai upload.

Validate before committing:

```sh
df plugin validate
df plugin validate --strict   # warnings become failures
```

`df plugin validate` is what the repository test calls, so a clean run is what CI checks. It
enforces the same rules this skill states, in one implementation, so the two cannot drift.

## Body

Write for an agent that has no other context, and assume it is competent and in a hurry.

- Lead with what the skill is for. The host matched it on `description` alone.
- Give the rule, then the reason, once. Not the story of how the rule was learned.
- Prefer an exact command to a description of a command.
- Put anything long in `references/` and link it. A skill directory may hold `references/` and
  `scripts/` beside `SKILL.md`; every host loads the body only.
- Prefer `sh` fences and state the tool when it is not obvious.

## Separate the rule from the fact

The distinction that matters most in a skill like this: a **rule** is what to do, a **fact** is
what happens to be true. Rules outlive the project; facts rot silently and nobody notices.

- A rule states a condition and an action: "capture the exit status of the command, not of a pipe
  in front of it".
- A fact states a value: "the pinned revision is `d576ec8f`".

Put facts where they can be re-checked, and say how to re-check them. A rule that quietly
depends on a fact nobody will ever revisit is a rule that will be wrong without warning.

## Say what the skill does not do

A skill that only says what to do gets over-applied. One line stating the boundary - which files
it governs, which it must not touch, what it deliberately does not check - prevents more damage
than any amount of additional instruction. Where a rule is evidence-weighted rather than absolute,
give the evidence and the threshold, and list the specific over-corrections to avoid.

## Length

A skill is loaded whole. Long prose competes for the context it is trying to save. If a section
is reference material rather than instruction, move it to `references/` and link it; if it is
instruction, cut it. The house style is a short frontmatter, a title, and prose with `##`
sections.
