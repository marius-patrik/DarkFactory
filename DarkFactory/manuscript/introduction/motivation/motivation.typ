#import "/DarkFactory/templates/common.typ": bib, finalized
#import "/DarkFactory/schema.typ": concept
#import "ai-diffusion-figure.typ" as ai_diffusion

#let item = concept(
  key: "motivation_problem_definition",
  czech: "Motivace a vymezení problému",
  english: "Motivation and Problem Definition",
  definition: terms => [
#finalized[Motivací práce je ukázat, jaké úlohy dokážou současné agentní systémy samostatně provádět a jaká technická vrstva umožňuje převést schopnost jazykového modelu do spolehlivého jednání nad skutečným softwarovým projektem.]
  ],
  description: terms => [
Generativní AI se během několika let rozšířila do masového používání. Microsoft AI Economy Institute odhaduje, že v prvním čtvrtletí 2026 použilo generativní AI 17,8 % světové populace v produktivním věku. Současně se rozšiřují systémy, které plánují více kroků, pracují se soubory a nástroji, spouštějí příkazy a testy a vykonávají delší úlohy. #cite(bib.microsoft2026aidiffusion)

V softwarovém inženýrství tento posun reprezentují například Codex a Claude Code. Jejich oficiální popisy uvádějí práci nad skutečnými repozitáři, úpravy souborů, spouštění testů a další činnosti přesahující jednorázové generování kódu. #cite(bib.openai_codex_app) #cite(bib.anthropic_claude_code)

Práce proto sleduje praktické využití těchto systémů při vývoji softwaru: jak jim zpřístupnit repozitář, nástroje a ověřování tak, aby dokázaly samostatně provádět užitečnou část vývojové práce a člověk si zachoval kontrolu nad důležitými rozhodnutími.
  ],
  summary: terms => [
Výchozím problémem je převést schopnosti současných modelů do opakovatelného a kontrolovatelného agentního vývojového procesu.
  ],
  attachments: (ai_diffusion.item,),
  relations: ((type: "related", target: "harness"),),
)
