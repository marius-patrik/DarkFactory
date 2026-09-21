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
  citation: (bib.anthropic2024tooluse, bib.deepseekharness2026),
  source: bib.anthropic2024tooluse,
  definition: terms => [
Běhová a orchestrační vrstva, která propojuje jazykový model s nástroji, stavem a prostředím.
  ],
  description: terms => [
Harness spravuje pracovní kontext, provádění nástrojů, stav běhu a podmínky pokračování nebo ukončení; opakované jednání koordinuje #term(terms.agent_loop). #cite(bib.anthropic2024tooluse)
  ],
  examples: (codex.item, claude_code.item, claude_desktop.item),
  relations: ((type: "dependency", target: "language_model"),),
)
