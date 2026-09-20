#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/codex.typ" as codex
#import "examples/claude-code.typ" as claude_code
#import "examples/claude-desktop.typ" as claude_desktop

#let item = concept(
  key: "harness",
  industry: "Agent Harness",
  czech: "Agentní harness",
  english: "Agent Harness",
  citation: bib.deepseekharness2026,
  source: bib.darkfactory,
  definition: terms => [
Agentní harness je aplikační a orchestrační vrstva, která propojuje model s prostředím a řídí jeho opakované jednání nad stavem a nástroji.
  ],
  description: terms => [
Harness sestavuje pracovní kontext, zpřístupňuje nástroje, spravuje stav úlohy, přijímá výsledky provedených akcí a určuje, kdy může agent pokračovat nebo kdy má běh skončit.

Ústředním prováděcím mechanismem je #term(terms.agent_loop).
  ],
  summary: terms => [
Schopnosti agentního systému nevznikají pouze v modelu. Harness modelu poskytuje prostředí a pravidla, díky kterým lze jeho rozhodnutí převádět na řízené akce.
  ],
  examples: (codex.item, claude_code.item, claude_desktop.item),
  relations: ((type: "dependency", target: "agent"), (type: "dependency", target: "language_model")),
)
