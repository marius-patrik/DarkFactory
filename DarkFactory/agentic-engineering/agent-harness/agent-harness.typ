#import "/DarkFactory/templates/common.typ": term, bib
#import "/DarkFactory/schema.typ": concept
#import "examples/codex.typ" as codex
#import "examples/claude-code.typ" as claude_code
#import "examples/claude-desktop.typ" as claude_desktop

#let item = concept(
  key: "harness",
  keyword: true,
  industry: "Agent Harness",
  czech: "Agentní harness",
  english: "Agent Harness",
  citation: bib.deepseekharness2026,
  source: bib.darkfactory,
  definition: terms => [
Aplikační a orchestrační vrstva, která propojuje model s prostředím a řídí jeho opakované jednání nad stavem a nástroji.
  ],
  description: terms => [
Harness spravuje pracovní kontext, nástroje, stav úlohy, výsledky akcí a podmínky pokračování nebo ukončení běhu; provádění koordinuje #term(terms.agent_loop).
  ],
  examples: (codex.item, claude_code.item, claude_desktop.item),
  relations: ((type: "dependency", target: "language_model"),),
)
