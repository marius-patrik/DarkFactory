#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept
#import "claude-opus-5-image.typ" as visual
#let item = concept(
  key: "claude_opus_5",   industry: "Claude Opus 5",
  czech: "Claude Opus 5",
  english: "Claude Opus 5",
definition: terms => [Claude Opus 5 je model společnosti Anthropic vydaný v červenci 2026.],
  description: terms => [Model je příkladem současné modelové vrstvy používané v širších agentních produktech. Samotný model není totožný s Claude Code ani desktopovou aplikací Claude; ty přidávají nástroje, stav a orchestrace.],
  summary: terms => [Příklad zdůrazňuje rozdíl mezi modelem a agentním harness-em.],
  attachments: (visual.item,), citations: (bib.anthropic_opus5,), relations: ((type: "related", target: "language_model"),)
)
