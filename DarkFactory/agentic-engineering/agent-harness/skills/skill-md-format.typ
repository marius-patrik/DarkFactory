#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "skill_md_format",
  industry: "SKILL.md",
  czech: "Formát SKILL.md",
  english: "SKILL.md Format",
  citation: bib.agent_skills_spec,
  source: bib.agent_skills_spec,
  definition: terms => [
`SKILL.md` je povinný definiční soubor Agent Skill. Podle specifikace obsahuje YAML frontmatter následovaný instrukcemi v Markdownu; povinnými poli frontmatteru jsou `name` a `description`. #cite(bib.agent_skills_spec)
  ],
  description: terms => [
Následující úplný příklad používá povinná pole i několik volitelných polí povolených specifikací: #cite(bib.agent_skills_spec)

```md
---
name: repository-tests
description: Run, diagnose, and summarize the repository test suite. Use when a software change must be validated before completion.
license: MIT
compatibility: Requires the repository's test runner to be available in the runtime.
metadata:
  author: DarkFactory
  version: "1.0"
allowed-tools: Bash Read
---

# Repository tests

Use this skill when a change must be validated against the repository's tests.

## Procedure

1. Detect the test command documented by the repository.
2. Run the smallest relevant test scope first.
3. Fix or report failures before continuing.
4. Run the complete required suite before completion.
5. Report the commands run and the final result.

## Failure reporting

For every unresolved failure, include the command, failing target, and relevant output.
```

Specifikace dovoluje vedle `SKILL.md` také volitelné adresáře například pro skripty, reference a assety; ty se načítají pouze podle potřeby. #cite(bib.agent_skills_spec)
  ],
  summary: terms => [
Formát `SKILL.md` odděluje stručná metadata potřebná pro nalezení dovednosti od detailních instrukcí, které agent načte až při jejím použití.
  ],
  relations: ((type: "dependency", target: "skills"),),
)
