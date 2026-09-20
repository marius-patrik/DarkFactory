#import "/DarkFactory/templates/common.typ": translation, bib
#import "/DarkFactory/schema.typ": concept


#let item = concept(
  key: "claude_code_image",
    czech: "Rozhraní Claude Code",
  english: "Claude Code Interface",
definition: terms => [Oficiální snímek rozhraní Claude Code při práci se zdrojovým kódem.],
  description: terms => [Snímek zobrazuje čtení souboru, zápis změny a průběžný stav agentní úlohy.],
  visual: terms => [
#figure(
  image("/DarkFactory/img/external/claude-code.webp", width: 72%),
  caption: [Claude Code při práci se souborem. Zdroj: Anthropic.],
)
  ],
  summary: terms => [Vizuální příklad nástrojově řízeného kódovacího agenta.],
  citations: (bib.anthropic_claude_code,),
)
