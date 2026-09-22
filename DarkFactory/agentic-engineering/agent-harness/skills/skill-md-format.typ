#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "skill_md_format",
  term: "Formát SKILL.md",
  citation: bib.agent_skills_spec,
  source: bib.agent_skills_spec,
  definition: terms => [
Povinný definiční soubor Agent Skill. Podle specifikace obsahuje YAML frontmatter následovaný instrukcemi v Markdownu; povinnými poli frontmatteru jsou `name` a `description`. #cite(bib.agent_skills_spec)
  ],
  description: terms => [
Následující úplný příklad používá povinná pole i několik volitelných polí povolených specifikací: #cite(bib.agent_skills_spec)

#raw("---\nname: repository-tests\ndescription: Run, diagnose, and summarize the repository test suite. Use when a software change must be validated before completion.\nlicense: MIT\ncompatibility: Requires the repository's test runner to be available in the runtime.\nmetadata:\n  author: DarkFactory\n  version: \"1.0\"\nallowed-tools: Bash Read\n---\n\n# Repository tests\n\nUse this skill when a change must be validated against the repository's tests.\n\n## Procedure\n\n1. Detect the test command documented by the repository.\n2. Run the smallest relevant test scope first.\n3. Fix or report failures before continuing.\n4. Run the complete required suite before completion.\n5. Report the commands run and the final result.\n\n## Failure reporting\n\nFor every unresolved failure, include the command, failing target, and relevant output.", block: true, lang: "md")

Specifikace dovoluje vedle `SKILL.md` také volitelné adresáře například pro skripty, reference a assety; ty se načítají pouze podle potřeby. #cite(bib.agent_skills_spec)
  ],
  relations: ((type: "dependency", target: "skills"),),
)
