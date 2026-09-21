#import "/DarkFactory/templates/common.typ": bib, finalized, scope-note
#import "/DarkFactory/schema.typ": concept
#import "ai-usage-example.typ" as ai_usage

#let item = concept(
  key: "motivation_problem_definition",
  czech: "Motivace a vymezení problému",
  english: "Motivation and Problem Definition",
  definition: terms => [
#finalized[Ukázat, jaké úlohy dokážou současné agentní systémy samostatně provádět a jaká technická vrstva umožňuje převést schopnost jazykového modelu do spolehlivého jednání nad skutečným softwarovým projektem.]
  ],
  description: terms => [
Generativní AI se během několika let rozšířila do masového používání a současně se rozšiřují systémy, které plánují více kroků, pracují se soubory a nástroji, spouštějí příkazy a testy a vykonávají delší úlohy.

V softwarovém inženýrství tento posun reprezentují například Codex a Claude Code, které pracují nad repozitáři, upravují soubory a spouštějí testy. #cite(bib.openai_codex_app) #cite(bib.anthropic_claude_code)

#scope-note[Údaj 2,4 miliardy / 29 % je přibližný sekundární odhad. V práci má sloužit pouze jako kontext motivace, nikoli jako přesná empirická metrika.]
  ],
  examples: (ai_usage.item,),
  relations: ((type: "related", target: "harness"),),
)
