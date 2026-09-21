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
  citation: (bib.anthropic_managed_agents, bib.anthropic_harness_design),
  source: bib.anthropic_managed_agents,
  definition: terms => [
Běhová a orchestrační vrstva, která propojuje jazykový model se stavem, nástroji a prostředím.
  ],
  description: terms => [
Harness řídí smyčku modelových volání a směruje nástrojové akce do příslušné infrastruktury; může současně spravovat pracovní kontext, stav běhu a podmínky pokračování nebo ukončení. #cite(bib.anthropic_managed_agents) Opakované jednání v této práci reprezentuje #term(terms.agent_loop).
  ],
  examples: (codex.item, claude_code.item, claude_desktop.item),
  relations: ((type: "dependency", target: "language_model"),),
)
