#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "claude_code_image",
  czech: "Rozhraní Claude Code",
  english: "Claude Code Interface",
  citation: bib.anthropic_claude_code,
  source: bib.anthropic_claude_code,
  definition: terms => [
Oficiální snímek rozhraní Claude Code při práci se zdrojovým kódem. #cite(bib.anthropic_claude_code)
  ],
  description: terms => [
Čtení souboru, zápis změny a průběžný stav agentní úlohy.
  ],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/claude-code.webp", width: 72%),
  caption: [Claude Code při práci se souborem. Zdroj: Anthropic #cite(bib.anthropic_claude_code).],
)
  ],
)
