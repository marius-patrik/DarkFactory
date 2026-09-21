#import "/DarkFactory/templates/common.typ": bib
#import "/DarkFactory/schema.typ": concept

#let item = concept(
  key: "hooks",
  industry: "Hooks",
  czech: "Událostní záchytné body",
  english: "Hooks",
  citation: bib.claude_code_hooks,
  source: bib.claude_code_hooks,
  definition: terms => [
Konfigurované reakce spouštěné při určených událostech životního cyklu agentního prostředí.
  ],
  description: terms => [
Hook může před nebo po vybrané události spustit deterministickou logiku, například validaci, příkaz nebo jinou automatizaci. #cite(bib.claude_code_hooks)
  ],
  relations: ((type: "dependency", target: "tools"),),
)
